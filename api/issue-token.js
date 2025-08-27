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
    const { tid, tag, uaHash } = await readJson(req);
    if (!tid || !tag || !uaHash) return res.status(400).json({ error: "missing_params" });

    const { data: tagRow, error: tagErr } = await supabase
      .from("nfc_tags").select("*").eq("tag", tag).single();

    if (tagErr) return res.status(500).json({ error: "db_select_failed", detail: String(tagErr.message || tagErr) });
    if (!tagRow) return res.status(403).json({ error: "tag_not_found" });
    if (!tagRow.active) return res.status(403).json({ error: "tag_inactive" });
    if (tagRow.tid !== tid) return res.status(403).json({ error: "tid_mismatch", expected: tagRow.tid, got: tid });

    const jti = (globalThis.crypto?.randomUUID?.()) || (await import("crypto")).randomUUID();
    const ttl = parseInt(process.env.TOKEN_TTL_SECONDS || "120", 10);
    const exp = Math.floor(Date.now() / 1000) + ttl;

    const token = jwt.sign({ tid, jti, uaHash, exp }, process.env.JWT_SECRET);

    const { error: insErr } = await supabase.from("tokens").insert([{ jti, tid, exp, used: false, ua_hash: uaHash }]);
    if (insErr) return res.status(500).json({ error: "db_insert_failed", detail: String(insErr.message || insErr) });

    return res.json({ token });
  } catch (e) {
    return res.status(500).json({ error: "server_error", detail: String(e?.message || e) });
  }
}

