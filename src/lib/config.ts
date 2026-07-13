export const env = {
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "AI Talent",
  authSecret:
    process.env.AUTH_SECRET ?? "local-dev-secret-change-me-ai-talent-32chars",
  databaseUrl: process.env.DATABASE_URL,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  deepseekApiKey: process.env.DEEPSEEK_API_KEY,
  deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
  deepseekModel: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
  cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN,
  cloudflareEmbeddingModel:
    process.env.CLOUDFLARE_EMBEDDING_MODEL ?? "@cf/baai/bge-m3",
  cloudflareEmbeddingDimensions: Number(
    process.env.CLOUDFLARE_EMBEDDING_DIMENSIONS ?? 1024,
  ),
  adminUsername: process.env.ADMIN_USERNAME ?? "admin",
  adminInitialPassword: process.env.ADMIN_INITIAL_PASSWORD ?? "admin",
  defaultEmployeePassword: process.env.DEFAULT_EMPLOYEE_PASSWORD ?? "88888888",
  assessmentTotalRounds: Number(process.env.AI_ASSESSMENT_TOTAL_ROUNDS ?? 10),
  aiStreamMaxDuration: Number(process.env.AI_STREAM_MAX_DURATION ?? 60),
  ragTopK: Number(process.env.RAG_TOP_K ?? 8),
  ragMinScore: Number(process.env.RAG_MIN_SCORE ?? 0.35),
  forceDemoAiResponses: process.env.AI_FORCE_DEMO_RESPONSES === "true",
  feishuAppId: process.env.FEISHU_APP_ID,
  feishuAppSecret: process.env.FEISHU_APP_SECRET,
  feishuAppHomeUrl:
    process.env.FEISHU_APP_HOME_URL ?? "https://www.daidai634.com",
  feishuApiBaseUrl:
    process.env.FEISHU_API_BASE_URL ?? "https://open.feishu.cn",
  feishuAuthorizeUrl:
    process.env.FEISHU_AUTHORIZE_URL ??
    "https://open.feishu.cn/open-apis/authen/v1/index",
  feishuRedirectPath:
    process.env.FEISHU_REDIRECT_PATH ?? "/api/auth/feishu/callback",
};

export function hasSupabaseEnv() {
  return Boolean(
    env.supabaseUrl &&
      env.supabaseServiceRoleKey &&
      env.supabaseAnonKey,
  );
}

export function hasDeepSeekEnv() {
  return Boolean(env.deepseekApiKey);
}

export function hasCloudflareEnv() {
  return Boolean(env.cloudflareAccountId && env.cloudflareApiToken);
}

export function hasFeishuEnv() {
  return Boolean(env.feishuAppId && env.feishuAppSecret);
}
