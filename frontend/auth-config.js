/* PUBLIC CONFIG ONLY. Do not put passwords, service_role, sb_secret_*,
   SMTP credentials, or any server secrets in a frontend file.
   Set these two public values after creating a Supabase Auth project.
   Public research works normally while both values are empty. */
window.BTI_AUTH_CONFIG = Object.freeze({
  supabaseUrl: "",
  supabasePublishableKey: ""
});
