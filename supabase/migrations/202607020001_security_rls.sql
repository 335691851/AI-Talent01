alter table employees enable row level security;
alter table app_users enable row level security;
alter table employee_ai_profiles enable row level security;
alter table assessment_sessions enable row level security;
alter table assessment_messages enable row level security;
alter table assessment_results enable row level security;
alter table employee_embeddings enable row level security;
alter table import_batches enable row level security;
alter table import_rows enable row level security;

revoke all on table employees from anon, authenticated;
revoke all on table app_users from anon, authenticated;
revoke all on table employee_ai_profiles from anon, authenticated;
revoke all on table assessment_sessions from anon, authenticated;
revoke all on table assessment_messages from anon, authenticated;
revoke all on table assessment_results from anon, authenticated;
revoke all on table employee_embeddings from anon, authenticated;
revoke all on table import_batches from anon, authenticated;
revoke all on table import_rows from anon, authenticated;

revoke execute on function match_employee_embeddings(vector(1024), int) from public;
revoke execute on function match_employee_embeddings(vector(1024), int) from anon;
revoke execute on function match_employee_embeddings(vector(1024), int) from authenticated;
grant execute on function match_employee_embeddings(vector(1024), int) to service_role;
