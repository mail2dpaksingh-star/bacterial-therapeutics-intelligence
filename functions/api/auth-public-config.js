// Cloudflare Pages Function: GET /api/auth-public-config
// Only exposes Supabase PUBLIC project URL and publishable key.
// Configure BTI_SUPABASE_URL and BTI_SUPABASE_PUBLISHABLE_KEY in
// Cloudflare Pages production environment variables (never service_role or sb_secret_*).
const response=(data)=>new Response(JSON.stringify(data),{
 status:200,
 headers:{
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store, max-age=0, must-revalidate',
  'x-content-type-options':'nosniff',
  'referrer-policy':'no-referrer',
  'access-control-allow-origin':'none'
 }
});
export function onRequestGet({env}){
 const rawUrl=String(env?.BTI_SUPABASE_URL||'').trim();
 const key=String(env?.BTI_SUPABASE_PUBLISHABLE_KEY||'').trim();
 let validUrl=false;
 try{
  const url=new URL(rawUrl);
  validUrl=url.protocol==='https:'&&url.hostname.endsWith('.supabase.co')&&!url.username&&!url.password&&!url.search&&!url.hash;
 }catch{}
 // For safety, do not accidentally publish privileged service_role, JWT or sb_secret_* credentials.
 const validKey=key.startsWith('sb_publishable_')&&key.length>20;
 if(!validUrl||!validKey)return response({configured:false});
 return response({configured:true,supabaseUrl:rawUrl,supabasePublishableKey:key});
}
