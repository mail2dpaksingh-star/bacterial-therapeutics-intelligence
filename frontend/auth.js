/* BTI optional passwordless sign-in. Public research never requires auth.
   Secure email authentication is provided by Supabase Auth only after the
   site operator configures a publishable key and approved redirect URLs.
   This browser code is not, by itself, a paid-content authorization system. */
(()=>{'use strict';
const el=id=>document.getElementById(id);
// Prefer Cloudflare deployment settings; the static file remains an optional
// local-development fallback. Neither route may carry a private Supabase key.
async function publicConfig(){
 let fallback=window.BTI_AUTH_CONFIG||{};
 try{
  const response=await fetch('/api/auth-public-config',{cache:'no-store',credentials:'same-origin'});
  if(response.ok){
   const result=await response.json();
   if(result?.configured===true)return result;
  }
 }catch{}
 return fallback;
}
function configured(url,key){
 if(typeof key!=='string'||!key.startsWith('sb_publishable_')||key.length<=20)return false;
 try{
  const parsed=new URL(url);
  return parsed.protocol==='https:'&&parsed.hostname.endsWith('.supabase.co')&&!parsed.username&&!parsed.password;
 }catch{return false;}
}
function feedback(id,message,kind){
 const target=el(id);if(!target)return;
 target.textContent=message||'';
 if(kind)target.dataset.kind=kind;else delete target.dataset.kind;
}
function show(id,visible){const target=el(id);if(target)target.hidden=!visible;}
function loadSdk(){
 if(window.supabase&&typeof window.supabase.createClient==='function')return Promise.resolve(window.supabase);
 return new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  script.async=true;
  script.onload=()=>window.supabase&&typeof window.supabase.createClient==='function'
    ?resolve(window.supabase):reject(new Error('Authentication library unavailable'));
  script.onerror=()=>reject(new Error('Authentication library could not load'));
  document.head.append(script);
 });
}
function accountView(user){
 const signedIn=!!(user&&typeof user.email==='string');
 show('accountSignedIn',signedIn);show('accountSignedOut',!signedIn);
 const target=el('accountEmail');if(target)target.textContent=signedIn?user.email:'';
 feedback('accountStatus',signedIn?'Signed in successfully.':'You are not currently signed in.',signedIn?'success':'');
}
async function main(){
 const form=el('signInForm'),account=el('accountStatus');
 if(!form&&!account)return;
 const settings=await publicConfig();
 const url=String(settings.supabaseUrl||'').trim();
 const key=String(settings.supabasePublishableKey||'').trim();
 if(!configured(url,key)){
  if(form){show('authUnavailable',true);feedback('signInStatus','Account registration and sign-in are not yet activated. The public research website is available without an account.');}
  if(account){accountView(null);feedback('accountStatus','Account sign-in is not yet activated. You may continue using public research without signing in.');}
  return;
 }
 let client;
 try{
  const lib=await loadSdk();
  client=lib.createClient(url,key,{auth:{flowType:'implicit',detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
 }catch(e){
  if(form)feedback('signInStatus','The secure sign-in service is temporarily unavailable. Please try again later.','error');
  if(account){accountView(null);feedback('accountStatus','The account sign-in service could not load. Please try again later.','error');}
  return;
 }
 if(form){
  show('authUnavailable',false);
  const input=el('signInEmail'),button=el('signInButton');
  input.disabled=false;button.disabled=false;
  try{
   const {data,error}=await client.auth.getUser();
   if(!error&&data?.user){window.location.replace('account.html');return;}
  }catch{}
  form.addEventListener('submit',async e=>{
   e.preventDefault();
   const email=String(input.value||'').trim();
   if(!email||!input.checkValidity()){feedback('signInStatus','Please enter a valid email address.','error');input.focus();return;}
   button.disabled=true;button.textContent='Sending sign-in link…';
   feedback('signInStatus','Requesting a secure sign-in email…');
   try{
    const redirect=new URL('account.html',window.location.href).toString();
    const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:redirect,shouldCreateUser:true}});
    if(error)throw error;
    feedback('signInStatus','If this address is eligible, a sign-in link has been requested. Check your email, including spam. Use the link to return to your account.','success');
   }catch(e){
    feedback('signInStatus','Unable to send a sign-in email right now. Please try again later.','error');
   }finally{button.disabled=false;button.textContent='Email me a sign-in link';}
  });
 }
 if(account){
  feedback('accountStatus','Verifying your secure sign-in…');
  try{
   const {data,error}=await client.auth.getUser();
   if(error||!data?.user)accountView(null);else accountView(data.user);
  }catch{accountView(null);}
  client.auth.onAuthStateChange((event,session)=>{
   if(event==='SIGNED_OUT')accountView(null);
   else if(event==='SIGNED_IN'&&session?.user)accountView(session.user);
  });
  const signOut=el('signOutButton');
  if(signOut)signOut.addEventListener('click',async()=>{
   signOut.disabled=true;feedback('accountStatus','Signing out…');
   try{
    const {error}=await client.auth.signOut();
    if(error)throw error;
    accountView(null);
   }catch{
    feedback('accountStatus','Could not complete sign-out. Please try again.','error');
   }finally{signOut.disabled=false;}
  });
 }
}
document.addEventListener('DOMContentLoaded',()=>{main().catch(()=>{
 feedback('signInStatus','Sign-in could not initialize. Please try again later.','error');
 if(el('accountStatus')){accountView(null);feedback('accountStatus','Account sign-in could not initialize. Please try again later.','error');}
});});
})();