import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { tid, token, uaHash } = req.body || {};
    if (!tid || !token || !uaHash) return res.status(400).json({ valid: false });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(403).json({ valid: false });
    }

    if (decoded.tid !== tid || decoded.uaHash !== uaHash) {
      return res.status(403).json({ valid: false });
    }

    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) return res.status(403).json({ valid: false });

    const { data: row, error } = await supabase
      .from("tokens")
      .select("*")
      .eq("jti", decoded.jti)
      .single();

    if (error || !row || row.used || row.exp < now) {
      return res.status(403).json({ valid: false });
    }

    const { error: updErr } = await supabase
      .from("tokens")
      .update({ used: true })
      .eq("jti", decoded.jti);

    if (updErr) return res.status(500).json({ valid: false });

    return res.json({ valid: true });
  } catch {
    return res.status(500).json({ valid: false });
  }
}
