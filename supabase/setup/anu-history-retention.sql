-- Requires Supabase Cron enabled; removes only old Sabha Anu turns.
select cron.schedule('sabha-anu-history-expiry','40 3 * * *',
 $$delete from public.anu_conversation_turns where created_at <= now()-interval '45 days'$$);
