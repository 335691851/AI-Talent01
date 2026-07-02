import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const currentDir = dirname(fileURLToPath(import.meta.url));
const migration = readFileSync(
  resolve(currentDir, "../../../supabase/migrations/202607020001_security_rls.sql"),
  "utf8",
).toLowerCase();

const protectedTables = [
  "employees",
  "app_users",
  "employee_ai_profiles",
  "assessment_sessions",
  "assessment_messages",
  "assessment_results",
  "employee_embeddings",
  "import_batches",
  "import_rows",
];

describe("database security migration", () => {
  it("enables RLS and revokes direct table access for all business tables", () => {
    for (const table of protectedTables) {
      expect(migration).toContain(`alter table ${table} enable row level security;`);
      expect(migration).toContain(`revoke all on table ${table} from anon, authenticated;`);
    }
  });

  it("keeps vector matching unavailable to browser-facing roles", () => {
    expect(migration).toContain("revoke execute on function match_employee_embeddings(vector(1024), int) from public;");
    expect(migration).toContain("revoke execute on function match_employee_embeddings(vector(1024), int) from anon;");
    expect(migration).toContain("revoke execute on function match_employee_embeddings(vector(1024), int) from authenticated;");
    expect(migration).toContain("grant execute on function match_employee_embeddings(vector(1024), int) to service_role;");
  });
});
