import postgres from "postgres";

const {
  DATABASE_URL,
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_API_TOKEN,
  CLOUDFLARE_EMBEDDING_MODEL = "@cf/baai/bge-m3",
  CLOUDFLARE_EMBEDDING_DIMENSIONS = "1024",
} = process.env;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
  console.error("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required.");
  process.exit(1);
}

const dimensions = Number(CLOUDFLARE_EMBEDDING_DIMENSIONS);
const sql = postgres(DATABASE_URL, { max: 1 });
const EMBEDDING_BATCH_SIZE = 8;
const INSERT_BATCH_SIZE = 100;
const MAX_EMBEDDING_CHUNK_LENGTH = 900;
const MAX_EMBEDDING_RETRIES = 5;

function formatVector(values) {
  return `[${values.join(",")}]`;
}

function chunkByLength(text, maxLength = MAX_EMBEDDING_CHUNK_LENGTH) {
  const clean = String(text ?? "").trim();
  if (!clean) return [];
  if (clean.length <= maxLength) return [clean];

  const chunks = [];
  let cursor = 0;
  while (cursor < clean.length) {
    chunks.push(clean.slice(cursor, cursor + maxLength).trim());
    cursor += maxLength;
  }
  return chunks.filter(Boolean);
}

function splitProjectExperience(content) {
  const clean = String(content ?? "").trim();
  if (!clean) return [];

  const projectSections = clean
    .split(/(?=\r?\n?\s*20\d{2}年\s+)/g)
    .map((item) => item.trim())
    .filter(Boolean);

  const sections = projectSections.length > 1 ? projectSections : clean.split(/\r?\n\r?\n+/g);
  return sections.flatMap((section) => chunkByLength(section));
}

function fieldChunks(chunkType, content) {
  return chunkByLength(content).map((chunk) => ({
    chunk_type: chunkType,
    content: chunk,
  }));
}

function buildEmployeeChunks(employee, profile, latestResult) {
  const profileContent = [employee.position, employee.position_description, employee.level]
    .filter(Boolean)
    .join("\n");

  return [
    ...fieldChunks("profile", profileContent),
    ...fieldChunks("product_ability", profile?.product_ability),
    ...fieldChunks("technical_ability", profile?.technical_ability),
    ...splitProjectExperience(profile?.project_experience).map((content) => ({
      chunk_type: "project_experience",
      content,
    })),
    {
      chunk_type: "latest_assessment",
      content: latestResult
        ? `AI 分数：${latestResult.score}\n${latestResult.assessment_explanation}\n${JSON.stringify(latestResult.structured_summary)}`
        : "",
    },
  ]
    .map((chunk) => ({ ...chunk, content: chunk.content.trim() }))
    .filter((chunk) => chunk.content);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function embedTexts(texts) {
  const cleanTexts = texts.map((text) => text.trim()).filter(Boolean);
  if (!cleanTexts.length) return [];

  const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${CLOUDFLARE_EMBEDDING_MODEL}`;
  let lastError = "";
  for (let attempt = 1; attempt <= MAX_EMBEDDING_RETRIES; attempt += 1) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: cleanTexts }),
    });

    if (response.ok) {
      const payload = await response.json();
      const vectors = payload.result?.data ?? [];

      if (vectors.length !== cleanTexts.length) {
        throw new Error(`Unexpected embedding count. Expected ${cleanTexts.length}, got ${vectors.length}.`);
      }

      if (vectors.some((vector) => vector.length !== dimensions)) {
        throw new Error(`Unexpected embedding dimension. Expected ${dimensions}.`);
      }

      return vectors;
    }

    lastError = `${response.status} ${await response.text()}`;
    if (response.status !== 429 && response.status < 500) break;

    const delayMs = 1500 * attempt ** 2;
    console.warn(`Cloudflare embedding retry ${attempt}/${MAX_EMBEDDING_RETRIES} after ${delayMs}ms: ${lastError}`);
    await sleep(delayMs);
  }

  throw new Error(`Cloudflare embedding failed: ${lastError}`);
}

async function embedInBatches(records) {
  const embeddedRecords = [];
  for (let index = 0; index < records.length; index += EMBEDDING_BATCH_SIZE) {
    const batch = records.slice(index, index + EMBEDDING_BATCH_SIZE);
    const vectors = await embedTexts(batch.map((record) => record.content));
    embeddedRecords.push(
      ...batch.map((record, batchIndex) => ({
        ...record,
        embedding: formatVector(vectors[batchIndex]),
      })),
    );
    console.log(`Embedded ${Math.min(index + batch.length, records.length)}/${records.length} chunks`);
  }
  return embeddedRecords;
}

async function buildAllEmbeddingRecords() {
  const [employees, profiles, latestResults] = await Promise.all([
    sql`
      select id, employee_no, name, position, position_description, level
      from employees
      order by employee_no
    `,
    sql`
      select employee_id, product_ability, technical_ability, project_experience
      from employee_ai_profiles
    `,
    sql`
      select employee_id, score, assessment_explanation, structured_summary
      from assessment_results
      where is_latest = true
    `,
  ]);

  const profileMap = new Map(profiles.map((profile) => [profile.employee_id, profile]));
  const resultMap = new Map(latestResults.map((result) => [result.employee_id, result]));
  const records = [];

  for (const employee of employees) {
    const chunks = buildEmployeeChunks(
      employee,
      profileMap.get(employee.id),
      resultMap.get(employee.id),
    );
    for (const chunk of chunks) {
      records.push({
        employee_id: employee.id,
        employee_no: employee.employee_no,
        employee_name: employee.name,
        chunk_type: chunk.chunk_type,
        content: chunk.content,
      });
    }
  }

  return { employees, records };
}

async function rewriteEmbeddingTable(records) {
  await sql.begin(async (transaction) => {
    await transaction`delete from employee_embeddings`;

    for (let index = 0; index < records.length; index += INSERT_BATCH_SIZE) {
      const batch = records.slice(index, index + INSERT_BATCH_SIZE);
      for (const record of batch) {
        await transaction`
          insert into employee_embeddings (employee_id, chunk_type, content, embedding, source_updated_at)
          values (
            ${record.employee_id},
            ${record.chunk_type},
            ${record.content},
            ${record.embedding}::vector,
            now()
          )
        `;
      }
      console.log(`Inserted ${Math.min(index + batch.length, records.length)}/${records.length} chunks`);
    }
  });
}

try {
  console.log("Preparing full employee embedding rebuild...");
  const started = Date.now();
  const { employees, records } = await buildAllEmbeddingRecords();

  if (!records.length) {
    console.log(JSON.stringify({ totalEmployees: employees.length, chunks: 0 }, null, 2));
    process.exit(0);
  }

  console.log(`Prepared ${records.length} chunks for ${employees.length} employees.`);
  console.log("Generating all embeddings before touching employee_embeddings...");
  const embeddedRecords = await embedInBatches(records);

  console.log("All embeddings generated. Rewriting employee_embeddings in a single database transaction...");
  await rewriteEmbeddingTable(embeddedRecords);

  const summaryRows = await sql`
    select chunk_type, count(*)::int as count
    from employee_embeddings
    group by chunk_type
    order by chunk_type
  `;
  const [{ count: vectorizedEmployees }] = await sql`
    select count(distinct employee_id)::int as count
    from employee_embeddings
  `;

  console.log(
    JSON.stringify(
      {
        totalEmployees: employees.length,
        vectorizedEmployees,
        chunks: embeddedRecords.length,
        chunkSummary: summaryRows,
        elapsedMs: Date.now() - started,
      },
      null,
      2,
    ),
  );
} finally {
  await sql.end();
}
