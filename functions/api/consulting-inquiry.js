// Cloudflare Pages Function — /api/consulting-inquiry
// Configuration (Cloudflare Pages settings -> Variables and Secrets):
// RESEND_API_KEY (secret), INQUIRY_TO_EMAIL, INQUIRY_FROM_EMAIL (verified sender domain).
// No client-side API keys. No database persistence.
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const str=(x,max)=>typeof x==='string'?x.trim().slice(0,max):'';
const validEmail=x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)&&x.length<=254;
export async function onRequestPost({request,env}){
 const type=request.headers.get('content-type')||'';
 if(!type.toLowerCase().startsWith('application/json'))return reply({error:'Expected JSON request.'},415);
 if(Number(request.headers.get('content-length')||0)>14000)return reply({error:'Inquiry is too large.'},413);
 let input;try{input=await request.json()}catch{return reply({error:'Invalid request.'},400)}
 if(!input||typeof input!=='object'||Array.isArray(input))return reply({error:'Invalid inquiry.'},400);
 if(str(input.website,128))return reply({ok:true}); // Silent spam trap
 const name=str(input.name,120),email=str(input.email,254),organization=str(input.organization,160),service=str(input.service,100),message=str(input.message,5000);
 const options=['Company & pipeline landscape','Scientific technology assessment','Patent landscape research','R&D / assay / QC consulting','Monthly research monitoring','Custom scientific research','Research Pro updates','Other inquiry'];
 if(!name||!validEmail(email)||!options.includes(service)||message.length<20||input.consent!==true)return reply({error:'Please complete required fields and agree to the privacy notice.'},400);
 if(!env.RESEND_API_KEY||!env.INQUIRY_TO_EMAIL||!env.INQUIRY_FROM_EMAIL)return reply({error:'Consulting inquiries are not yet enabled. The site administrator must configure secure email delivery.'},503);
 const safe=x=>x.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const html='<h2>New consulting inquiry</h2>'+[['Name',name],['Email',email],['Organization',organization||'Not provided'],['Service',service],['Project summary',message]].map(([key,val])=>'<p><strong>'+safe(key)+':</strong> '+safe(val).replace(/\n/g,'<br>')+'</p>').join('');
 try{
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:'Bearer '+env.RESEND_API_KEY,'content-type':'application/json'},body:JSON.stringify({from:env.INQUIRY_FROM_EMAIL,to:[env.INQUIRY_TO_EMAIL],reply_to:email,subject:'BTI inquiry: '+service,html})});
  if(!response.ok)return reply({error:'The inquiry could not be delivered. Please try again later.'},502);
  return reply({ok:true},200);
 }catch{return reply({error:'Email delivery is temporarily unavailable.'},502)}
}
export function onRequestGet(){return reply({error:'Method not allowed.'},405)}
