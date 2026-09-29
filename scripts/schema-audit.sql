-- Run this in the Supabase dashboard SQL editor.
--
-- Lists every column that will reject an INSERT when omitted from the payload:
-- NOT NULL with no DEFAULT. An upsert against a row that does not exist yet is
-- an INSERT, so any such column missing from a sync payload fails the whole
-- request with 23502 - the bug that broke workout_plans.difficulty.

select
	c.table_name,
	string_agg(c.column_name, ', ' order by c.ordinal_position) as must_be_present
from information_schema.columns c
join information_schema.tables t
	on t.table_schema = c.table_schema
	and t.table_name = c.table_name
	and t.table_type = 'BASE TABLE'
where c.table_schema = 'public'
	and c.is_nullable = 'NO'
	and c.column_default is null
	and c.is_identity = 'NO'
	and c.is_generated = 'NEVER'
group by c.table_name
order by c.table_name;


-- Full per-column detail, for generating accurate TypeScript types.
-- Note `data_type = 'ARRAY'` columns: those are Postgres arrays (text[]), NOT
-- jsonb. Passing JSON.stringify(...) to them stores a string, not an array.

select
	c.table_name,
	c.column_name,
	c.data_type,
	c.udt_name,
	c.is_nullable,
	c.column_default
from information_schema.columns c
join information_schema.tables t
	on t.table_schema = c.table_schema
	and t.table_name = c.table_name
	and t.table_type = 'BASE TABLE'
where c.table_schema = 'public'
order by c.table_name, c.ordinal_position;
