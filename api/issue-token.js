import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { tid, tag, uaHash } = req.body || {};
    if (!tid || !tag || !uaHash) return res.status(400).json({});

    const { data: tagRow, error: tagErr } = await supabase
      .from("nfc_tags")
      .select("*")
      .eq("tag", tag)
      .single();

    if (tagErr || !tagRow || !tagRow.active || tagRow.tid !== tid) {
      return res.status(403).json({});
    }

    const jti = crypto.randomUUID();
    const ttl = parseInt(process.env.TOKEN_TTL_SECONDS || "120", 10);
    const exp = Math.floor(Date.now() / 1000) + ttl;

    const token = jwt.sign({ tid, jti, uaHash, exp }, process.env.JWT_SECRET);

    const { error: insErr } = await supabase.from("tokens").insert([
      { jti, tid, exp, used: false, ua_hash: uaHash }
    ]);
    if (insErr) return res.status(500).json({});

    return res.json({ token });
  } catch {
    return res.status(500).json({});
  }
}
