export default function handler(req, res) {
  const url = process.env.SUPABASE_URL || "";
  const hasKey = !!process.env.SUPABASE_SERVICE_KEY;
  return res.json({
    ok: true,
    env: {
      SUPABASE_URL_present: !!url,
      SUPABASE_URL_value_preview: url.replace(/(^https?:\/\/|supabase\.co$)/g, "..."), // 일부만 노출
      SUPABASE_SERVICE_KEY_present: hasKey,
      JWT_SECRET_present: !!process.env.JWT_SECRET,
      TOKEN_TTL_SECONDS: process.env.TOKEN_TTL_SECONDS || null
    }
  });
}
