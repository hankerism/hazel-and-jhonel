-- ============================================================================
-- ONE-TIME CLEANUP v3: repurpose "ever-after-dev" for the new wedding
-- platform.
--
-- *** DESTRUCTIVE ***
-- Erases the old Ever After schema and ALL of its data (weddings, guests,
-- rsvp_events, rsvps, and anything else user-created in `public`).
-- Auth users, storage buckets, and Postgres extensions are NOT touched.
--
-- Design notes:
--  * The SQL editor runs a pasted script as ONE transaction, so a single
--    unguarded failure rolls back every drop. Therefore EVERY drop below is
--    isolated in its own exception block — a failure logs a WARNING and the
--    script continues.
--  * Sweeps only target objects owned by the current role and skip
--    extension-owned objects; Supabase-managed helpers are left alone.
--  * Policies, triggers, and indexes are dropped explicitly first (guarded),
--    even though dropping the tables would remove them anyway.
--  * Idempotent: safe to re-run any number of times.
--
-- HOW TO VERIFY: look at the result grid of the FINAL query. Zero rows =
-- clean. (NOTICE/WARNING log lines may not be shown by the editor at all.)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. RLS policies on all public tables (explicit, though CASCADE would
--    also remove them with the tables).
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  loop
    begin
      execute format('drop policy if exists %I on %I.%I',
                     r.policyname, r.schemaname, r.tablename);
    exception when others then
      raise warning 'SKIPPED policy % on %: %', r.policyname, r.tablename, sqlerrm;
    end;
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. User triggers on public tables (internal constraint triggers excluded).
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select t.tgname, c.relname
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and not t.tgisinternal
  loop
    begin
      execute format('drop trigger if exists %I on public.%I', r.tgname, r.relname);
    exception when others then
      raise warning 'SKIPPED trigger % on %: %', r.tgname, r.relname, sqlerrm;
    end;
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 3. Non-constraint indexes on public tables (constraint-backed ones fall
--    with their constraints/tables).
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select ci.relname as indexname
    from pg_index i
    join pg_class ci on ci.oid = i.indexrelid
    join pg_class ct on ct.oid = i.indrelid
    join pg_namespace n on n.oid = ct.relnamespace
    where n.nspname = 'public'
      and not exists (
        select 1 from pg_constraint con where con.conindid = i.indexrelid
      )
  loop
    begin
      execute format('drop index if exists public.%I', r.indexname);
    exception when others then
      raise warning 'SKIPPED index %: %', r.indexname, sqlerrm;
    end;
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 4. Known tables, children first. CASCADE removes remaining foreign keys
--    and any dependent objects.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'rsvp_events',      -- old Ever After
    'rsvps',            -- old Ever After (also the new-schema name)
    'guests',           -- old Ever After
    'weddings',         -- old Ever After (also the new-schema name)
    'schedule_items',   -- in case of a partial new-schema run
    'gallery_images',
    'faqs'
  ]
  loop
    begin
      execute format('drop table if exists public.%I cascade', t);
    exception when others then
      raise warning 'SKIPPED table %: %', t, sqlerrm;
    end;
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 5. Sweep remaining relations in `public` owned by the current role:
--    tables, views, materialized views, standalone sequences.
--    Extension-owned objects excluded.
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select c.relname, c.relkind
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'v', 'm', 'S')
      and pg_get_userbyid(c.relowner) = current_user
      and not exists (
        select 1 from pg_depend d
        where d.classid = 'pg_class'::regclass
          and d.objid = c.oid
          and d.deptype = 'e'
      )
  loop
    begin
      execute format(
        'drop %s if exists public.%I cascade',
        case r.relkind
          when 'r' then 'table'
          when 'v' then 'view'
          when 'm' then 'materialized view'
          when 'S' then 'sequence'
        end,
        r.relname
      );
    exception when others then
      raise warning 'SKIPPED relation %: %', r.relname, sqlerrm;
    end;
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 6. Functions/procedures in `public` owned by the current role (e.g. the
--    old updated_at trigger function). Extension members excluded.
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and pg_get_userbyid(p.proowner) = current_user
      and not exists (
        select 1 from pg_depend d
        where d.classid = 'pg_proc'::regclass
          and d.objid = p.oid
          and d.deptype = 'e'
      )
  loop
    begin
      execute format('drop routine if exists %s cascade', r.signature);
    exception when others then
      raise warning 'SKIPPED routine %: %', r.signature, sqlerrm;
    end;
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 7. Enum and domain types in `public` owned by the current role.
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select t.typname
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typtype in ('e', 'd')
      and pg_get_userbyid(t.typowner) = current_user
      and not exists (
        select 1 from pg_depend d
        where d.classid = 'pg_type'::regclass
          and d.objid = t.oid
          and d.deptype = 'e'
      )
  loop
    begin
      execute format('drop type if exists public.%I cascade', r.typname);
    exception when others then
      raise warning 'SKIPPED type %: %', r.typname, sqlerrm;
    end;
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 8. Old Supabase CLI migration bookkeeping (skipped if absent).
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    delete from supabase_migrations.schema_migrations;
  end if;
exception when others then
  raise warning 'SKIPPED migration bookkeeping: %', sqlerrm;
end
$$;

-- ---------------------------------------------------------------------------
-- FINAL VERIFICATION — the only output that matters.
-- Lists every remaining user-created object in `public` with its owner.
-- Expected result: ZERO ROWS ("Success. No rows returned").
-- If rows remain, copy them (kind, name, owner) and report back.
-- ---------------------------------------------------------------------------

select 'relation: ' || case c.relkind
         when 'r' then 'table' when 'v' then 'view'
         when 'm' then 'matview' else 'sequence' end as kind,
       c.relname as name,
       pg_get_userbyid(c.relowner) as owner
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'v', 'm', 'S')
  and not exists (
    select 1 from pg_depend d
    where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e'
  )
union all
select 'function', p.oid::regprocedure::text, pg_get_userbyid(p.proowner)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and not exists (
    select 1 from pg_depend d
    where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e'
  )
union all
select 'type', t.typname, pg_get_userbyid(t.typowner)
from pg_type t
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
  and t.typtype in ('e', 'd')
  and not exists (
    select 1 from pg_depend d
    where d.classid = 'pg_type'::regclass and d.objid = t.oid and d.deptype = 'e'
  )
order by kind, name;
