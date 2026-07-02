import { env, hasCloudflareEnv } from "@/lib/config";
import { getSupabaseAdmin, isDatabaseConfigured } from "@/lib/db/client";

export function formatVector(values: number[]) {
  return `[${values.join(",")}]`;
}

const MAX_EMBEDDING_CHUNK_LENGTH = 900;

function chunkByLength(text: string, maxLength = MAX_EMBEDDING_CHUNK_LENGTH) {
  const clean = text.trim();
  if (!clean) return [];
  if (clean.length <= maxLength) return [clean];

  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < clean.length) {
    chunks.push(clean.slice(cursor, cursor + maxLength).trim());
    cursor += maxLength;
  }
  return chunks.filter(Boolean);
}

export function splitProjectExperience(content?: string | null) {
  const clean = content?.trim();
  if (!clean) return [];

  const projectSections = clean
    .split(/(?=\r?\n?\s*20\d{2}年\s+)/g)
    .map((item) => item.trim())
    .filter(Boolean);

  const sections = projectSections.length > 1 ? projectSections : clean.split(/\r?\n\r?\n+/g);
  return sections.flatMap((section) => chunkByLength(section));
}

function fieldChunks(chunkType: string, content?: string | null) {
  return chunkByLength(content ?? "").map((chunk) => ({
    chunk_type: chunkType,
    content: chunk,
  }));
}

function demoEmbedding(text: string) {
  let seed = 2166136261;
  for (const char of text) {
    seed ^= char.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }

  return Array.from({ length: env.cloudflareEmbeddingDimensions }, (_, index) => {
    seed = Math.imul(seed ^ (index + 1), 1103515245) + 12345;
    return Number((((seed >>> 0) % 2000) / 1000 - 1).toFixed(6));
  });
}

type CloudflareEmbeddingResponse = {
  success?: boolean;
  result?: {
    data?: number[][];
    shape?: number[];
  };
  errors?: Array<{ message?: string }>;
};

export async function embedTexts(texts: string[]) {
  const cleanTexts = texts.map((text) => text.trim()).filter(Boolean);
  if (!cleanTexts.length) return [];

  if (env.forceDemoAiResponses) {
    return cleanTexts.map(demoEmbedding);
  }

  if (!hasCloudflareEnv()) {
    console.warn("Cloudflare Workers AI env is missing. Skipping embeddings.");
    return [];
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${env.cloudflareAccountId}/ai/run/${env.cloudflareEmbeddingModel}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.cloudflareApiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: cleanTexts }),
  });

  if (!response.ok) {
    throw new Error(`Cloudflare embedding failed: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as CloudflareEmbeddingResponse;
  const vectors = payload.result?.data ?? [];

  if (vectors.some((vector) => vector.length !== env.cloudflareEmbeddingDimensions)) {
    throw new Error(
      `Unexpected embedding dimension. Expected ${env.cloudflareEmbeddingDimensions}.`,
    );
  }

  return vectors;
}

export async function generateEmployeeEmbeddings(employeeId: string) {
  if (!isDatabaseConfigured() || !hasCloudflareEnv()) return;

  const supabase = getSupabaseAdmin();
  const [{ data: employee }, { data: profile }, { data: latestResult }] = await Promise.all([
    supabase.from("employees").select("*").eq("id", employeeId).maybeSingle(),
    supabase.from("employee_ai_profiles").select("*").eq("employee_id", employeeId).maybeSingle(),
    supabase
      .from("assessment_results")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("is_latest", true)
      .maybeSingle(),
  ]);

  if (!employee) return;

  const profileContent = [
        employee.position,
        employee.position_description,
        employee.level,
      ]
        .filter(Boolean)
        .join("\n");

  const chunks = [
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
  ].filter((chunk) => chunk.content.trim());

  const vectors = await embedTexts(chunks.map((chunk) => chunk.content));
  if (!vectors.length) return;

  await supabase.from("employee_embeddings").delete().eq("employee_id", employeeId);
  await supabase.from("employee_embeddings").insert(
    chunks.map((chunk, index) => ({
      employee_id: employeeId,
      chunk_type: chunk.chunk_type,
      content: chunk.content,
      embedding: formatVector(vectors[index]),
      source_updated_at: new Date().toISOString(),
    })),
  );
}
