-- Operator setup, after deploying the GitHub routes and safety migration.
-- Enable pg_cron and pg_net in Supabase first.
-- In Supabase Vault, create sabha_github_cron_secret with the SAME value as
-- Vercel Production CRON_SECRET. This script never prints that secret.
do $$
begin
 if to_regnamespace('cron') is null or to_regprocedure('net.http_get(text,jsonb,jsonb,integer)') is null then
  raise exception 'Enable Supabase Cron (pg_cron) and pg_net before scheduling.';
 end if;
 if not exists(select 1 from vault.decrypted_secrets where name='sabha_github_cron_secret' and length(decrypted_secret)>=32) then
  raise exception 'Create a Vault secret named sabha_github_cron_secret with the existing production CRON_SECRET (at least 32 characters).';
 end if;
end;
$$;
-- A named cron.schedule call updates the existing named job instead of adding duplicates.
select cron.schedule(
 'sabha-github-reconciliation',
 '*/5 * * * *',
 $job$
 select net.http_get(
  url:='https://sabha.devvrats.in/api/github/reconcile',
  headers:=jsonb_build_object('Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='sabha_github_cron_secret')),
  timeout_milliseconds:=55000
 ) as request_id;
 $job$
);
-- Inspect Cron History and net._http_response status/body after a run.
-- A cron job finishing only means the request was queued; check its HTTP response too.
