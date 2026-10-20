import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ANU_SABHA_SERVICE_EMAIL?.trim().toLowerCase();
if (!url || !serviceKey || !email) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and ANU_SABHA_SERVICE_EMAIL first.");
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
let user;
for (let page = 1; ; page += 1) {
  const listed = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (listed.error) throw new Error(`Could not check for Anu's service user: ${listed.error.message}`);
  user = listed.data.users.find((candidate) => candidate.email?.toLowerCase() === email);
  if (user || listed.data.users.length < 1000) break;
}
if (user && user.user_metadata?.anu_service_actor !== true) {
  throw new Error("That email already belongs to a non-Anu account. Choose a dedicated service email.");
}
if (!user) {
  const created = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { name: "Anu", full_name: "Anu", username: "anu", anu_service_actor: true },
  });
  if (created.error || !created.data.user) throw new Error(`Could not create Anu's service user: ${created.error?.message || "Unknown error"}`);
  user = created.data.user;
}

const existing = await supabase.from("profiles").select("id,name,username").eq("id", user.id).maybeSingle();
if (existing.error) throw new Error(`Could not check Anu's profile: ${existing.error.message}`);
if (existing.data && (existing.data.name !== "Anu" || existing.data.username?.toLowerCase() !== "anu")) {
  throw new Error("The service user already has a different public profile. Resolve that profile before continuing.");
}
if (!existing.data) {
  const inserted = await supabase.from("profiles").insert({ id: user.id, name: "Anu", username: "anu" });
  if (inserted.error) throw new Error(`Could not create Anu's public profile: ${inserted.error.message}`);
}

console.log(`Anu's Sabha account is ready. Set ANU_SABHA_PROFILE_ID=${user.id} in Sabha's server environment.`);
