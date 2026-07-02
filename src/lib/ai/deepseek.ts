import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env, hasDeepSeekEnv } from "@/lib/config";

let provider: ReturnType<typeof createOpenAICompatible<string, string, string, string>> | null = null;

export function getDeepSeekProvider() {
  if (!hasDeepSeekEnv()) {
    throw new Error("DeepSeek is not configured. Set DEEPSEEK_API_KEY in .env.local.");
  }

  provider ??= createOpenAICompatible({
    name: "deepseek",
    apiKey: env.deepseekApiKey,
    baseURL: env.deepseekBaseUrl,
  });

  return provider;
}

export function getDeepSeekChatModel() {
  return getDeepSeekProvider().languageModel(env.deepseekModel);
}
