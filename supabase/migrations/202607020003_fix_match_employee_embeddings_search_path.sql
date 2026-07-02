create or replace function match_employee_embeddings(
  query_embedding vector(1024),
  match_count int default 20
)
returns table (
  employee_id uuid,
  similarity double precision,
  matched_chunk_types text[],
  evidence text[]
)
language sql
stable
set search_path = public
as $$
  with ranked_chunks as (
    select
      ee.employee_id,
      ee.chunk_type,
      ee.content,
      1 - (ee.embedding <=> query_embedding) as similarity,
      row_number() over (
        partition by ee.employee_id
        order by ee.embedding <=> query_embedding
      ) as chunk_rank
    from employee_embeddings ee
  ),
  ranked_employees as (
    select
      rc.employee_id,
      max(rc.similarity) as similarity
    from ranked_chunks rc
    group by rc.employee_id
    order by max(rc.similarity) desc
    limit match_count
  )
  select
    re.employee_id,
    re.similarity,
    array_agg(rc.chunk_type order by rc.chunk_rank) as matched_chunk_types,
    array_agg(rc.content order by rc.chunk_rank) filter (where rc.content is not null) as evidence
  from ranked_employees re
  join ranked_chunks rc on rc.employee_id = re.employee_id
  where rc.chunk_rank <= 3
  group by re.employee_id, re.similarity
  order by re.similarity desc;
$$;

revoke execute on function match_employee_embeddings(vector(1024), int) from public;
revoke execute on function match_employee_embeddings(vector(1024), int) from anon;
revoke execute on function match_employee_embeddings(vector(1024), int) from authenticated;
grant execute on function match_employee_embeddings(vector(1024), int) to service_role;
