import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for E2E tests.");
}

const verifiedDatabaseUrl = databaseUrl;

function createSqlClient() {
  return postgres(verifiedDatabaseUrl, { max: 1, ssl: "require", idle_timeout: 10 });
}

export let sql = createSqlClient();

async function resetSqlClient() {
  await Promise.race([
    sql.end({ timeout: 1 }),
    new Promise((resolve) => setTimeout(resolve, 1000)),
  ]).catch(() => undefined);
  sql = createSqlClient();
}

async function withDbRetry<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/ECONNRESET|Connection terminated|write EPIPE|read ECONNRESET/i.test(message)) {
      throw error;
    }
    await resetSqlClient();
    return operation();
  }
}

export async function closeTestDatabase() {
  await Promise.race([
    sql.end({ timeout: 1 }),
    new Promise((resolve) => setTimeout(resolve, 1000)),
  ]).catch(() => undefined);
}

export async function cleanupTestEmployees() {
  const employees = await withDbRetry(() => sql<{ id: string }[]>`
      select id from employees where employee_no like 'TEST-%'
    `);
  const ids = employees.map((employee) => employee.id);

  if (!ids.length) return;

  await withDbRetry(async () => {
    await sql`delete from app_users where employee_id = any(${ids}::uuid[])`;
    await sql`delete from employee_embeddings where employee_id = any(${ids}::uuid[])`;
    await sql`delete from assessment_messages where session_id in (
      select id from assessment_sessions where employee_id = any(${ids}::uuid[])
    )`;
    await sql`delete from assessment_results where employee_id = any(${ids}::uuid[])`;
    await sql`delete from assessment_sessions where employee_id = any(${ids}::uuid[])`;
    await sql`delete from employee_ai_profiles where employee_id = any(${ids}::uuid[])`;
    await sql`delete from employees where id = any(${ids}::uuid[])`;
  });
}

export async function getTestEmployee() {
  const [employee] = await withDbRetry(() => sql`
      select id, employee_no, name, phone from employees where employee_no = 'TEST-1001'
    `);
  return employee ?? null;
}

export async function getLatestTestAssessmentResult() {
  const [result] = await withDbRetry(() => sql`
      select ar.score, ar.assessment_explanation
      from assessment_results ar
      join employees e on e.id = ar.employee_id
      where e.employee_no = 'TEST-1001'
        and ar.is_latest = true
      limit 1
    `);
  return result ?? null;
}

export async function getTestEmbeddingCount() {
  const [row] = await withDbRetry(() => sql`
      select count(*)::int as count
      from employee_embeddings ee
      join employees e on e.id = ee.employee_id
      where e.employee_no = 'TEST-1001'
    `);
  return row?.count ?? 0;
}
