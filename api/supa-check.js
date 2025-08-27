import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) return res.status(500).json({ ok: false, step: "env", msg: "Missing URL or SERVICE_KEY" });

    const supabase = createClient(url, key);
    // 아주 가벼운 쿼리: nfc_tags에서 1건만
    const { data, error } = await supabase.from("nfc_tags").select("tag,tid,active").limit(1);
    if (error) return res.status(500).json({ ok: false, step: "select", error: String(error.message || error) });

    return res.json({ ok: true, sample: data });
  } catch (e) {
    return res.status(500).json({ ok: false, step: "catch", error: String(e?.message || e) });
  }
}
