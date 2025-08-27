export const config = { runtime: "nodejs" };

import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  try { return JSON.parse(raw); } catch { return {}; }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  try {
    const { tid, token, uaHash } = await readJson(req);
    if (!tid || !token || !uaHash) return res.status(400).json({ valid: false, error: "missing_params" });

    let decoded;
    try { decoded = jwt.verify(token, process.env.JWT_SECRET); }
    catch { return res.status(403).json({ valid: false, error: "jwt_invalid" }); }

    if (decoded.tid !== tid || decoded.uaHash !== uaHash)
      return res.status(403).json({ valid: false, error: "tid_or_ua_mismatch" });

    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) return res.status(403).json({ valid: false, error: "expired" });

    const { data: row, error } = await supabase.from("tokens").select("*").eq("jti", decoded.jti).single();
    if (error) return res.status(500).json({ valid: false, error: "db_select_failed", detail: String(error.message || error) });
    if (!row) return res.status(403).json({ valid: false, error: "token_not_found" });
    if (row.used) return res.status(403).json({ valid: false, error: "token_used" });
    if (row.exp < now) return res.status(403).json({ valid: false, error: "token_expired" });

    const { error: updErr } = await supabase.from("tokens").update({ used: true }).eq("jti", decoded.jti);
    if (updErr) return res.status(500).json({ valid: false, error: "db_update_failed", detail: String(updErr.message || updErr) });

    return res.json({ valid: true });
  } catch (e) {
    return res.status(500).json({ valid: false, error: "server_error", detail: String(e?.message || e) });
  }
}

}
