export default function handler(req, res) {
  const url = process.env.SUPABASE_URL || "";
  res.json({
    ok: true,
    env: {
      SUPABASE_URL_present: !!url,
      SUPABASE_URL_value_preview: url.replace(/^https?:\/\//, "").replace(/\.supabase\.co$/, ".supabase.co"),
      SUPABASE_SERVICE_KEY_present: !!process.env.SUPABASE_SERVICE_KEY,
      JWT_SECRET_present: !!process.env.JWT_SECRET,
      TOKEN_TTL_SECONDS: process.env.TOKEN_TTL_SECONDS || null
    }
  });
}
