select 'History table' as check_name,
 case when to_regclass('public.anu_conversation_turns') is not null then 'PASS' else 'MISSING' end as status
union all
select 'History row level security',
 case when exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='anu_conversation_turns' and c.relrowsecurity) then 'PASS' else 'FAIL' end
union all
select 'History account policies',
 case when (select count(*) from pg_policies where schemaname='public' and tablename='anu_conversation_turns' and policyname in ('Read own Anu turns','Save own Anu turns','Forget own Anu turns'))=3 then 'PASS' else 'FAIL' end;
