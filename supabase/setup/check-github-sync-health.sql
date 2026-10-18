select 'Sync failure diagnostics' as check_name,case when (select count(*) from information_schema.columns where table_schema='public' and table_name='project_github_connections' and column_name in ('sync_error_code','sync_error_at'))=2 then 'PASS' else 'MISSING' end as status
union all
select 'Cron extension',case when to_regnamespace('cron') is not null then 'PASS' else 'MISSING' end
union all
select 'HTTP extension',case when to_regnamespace('net') is not null then 'PASS' else 'MISSING' end;
-- Run these separately after Cron and pg_net are enabled. Neither query returns secrets.
-- select jobid,jobname,schedule,active from cron.job where jobname='sabha-github-reconciliation';
-- select id,status_code,timed_out,created from net._http_response order by created desc limit 10;
-- HTTP 200 is a healthy invocation; inspect the count-only response for ready/pending/failed.
-- HTTP 401 means Cron authentication is not configured correctly; 503 means setup/storage/all syncs failed.
