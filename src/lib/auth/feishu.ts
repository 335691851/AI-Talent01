import { env } from "@/lib/config";

type FeishuBaseResponse = {
  code?: number;
  msg?: string;
  error?: string;
  error_description?: string;
};

type UserAccessTokenResponse = FeishuBaseResponse & {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_expires_in?: number;
  scope?: string;
  data?: {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
    refresh_token?: string;
    refresh_expires_in?: number;
    scope?: string;
  };
};

export type FeishuUserInfo = {
  name?: string;
  open_id?: string;
  union_id?: string;
  user_id?: string;
  mobile?: string;
  email?: string;
  enterprise_email?: string;
  tenant_key?: string;
};

type UserInfoResponse = FeishuBaseResponse & {
  data?: FeishuUserInfo;
};

export function normalizePhone(phone?: string | null) {
  if (!phone) return null;

  const normalized = phone.replace(/[^\d+]/g, "");
  if (normalized.startsWith("+86")) return normalized.slice(3);
  if (normalized.startsWith("86") && normalized.length === 13) {
    return normalized.slice(2);
  }
  return normalized.replace(/^\+/, "");
}

export function getFeishuRedirectUri() {
  return new URL(env.feishuRedirectPath, env.feishuAppHomeUrl).toString();
}

export function buildFeishuAuthorizeUrl(state: string) {
  const url = new URL(env.feishuAuthorizeUrl);
  url.searchParams.set("app_id", env.feishuAppId ?? "");
  url.searchParams.set("redirect_uri", getFeishuRedirectUri());
  url.searchParams.set("scope", "contact:user.phone:readonly");
  url.searchParams.set("state", state);
  return url.toString();
}

function getFeishuApiUrl(path: string) {
  return new URL(path, env.feishuApiBaseUrl).toString();
}

async function parseFeishuResponse<T extends FeishuBaseResponse>(
  response: Response,
  action: string,
) {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${action} HTTP ${response.status}: ${text}`);
  }

  const payload = JSON.parse(text) as T;
  if ((payload.code ?? 0) !== 0) {
    throw new Error(
      `${action} failed: ${payload.msg ?? payload.error_description ?? payload.error ?? payload.code}`,
    );
  }

  return payload;
}

async function exchangeCodeForUserAccessToken(code: string) {
  const response = await fetch(getFeishuApiUrl("/open-apis/authen/v2/oauth/token"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: env.feishuAppId,
      client_secret: env.feishuAppSecret,
      code,
      redirect_uri: getFeishuRedirectUri(),
    }),
    cache: "no-store",
  });

  const payload = await parseFeishuResponse<UserAccessTokenResponse>(
    response,
    "Exchange Feishu authorization code",
  );
  const userAccessToken = payload.data?.access_token ?? payload.access_token;

  if (!userAccessToken) {
    throw new Error("Feishu user access token is empty.");
  }

  return userAccessToken;
}

async function getFeishuUserInfo(userAccessToken: string) {
  const response = await fetch(getFeishuApiUrl("/open-apis/authen/v1/user_info"), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${userAccessToken}`,
    },
    cache: "no-store",
  });

  const payload = await parseFeishuResponse<UserInfoResponse>(
    response,
    "Get Feishu user info",
  );

  if (!payload.data) {
    throw new Error("Feishu user info is empty.");
  }

  return payload.data;
}

export async function getFeishuUserByCode(code: string) {
  const userAccessToken = await exchangeCodeForUserAccessToken(code);
  return getFeishuUserInfo(userAccessToken);
}
