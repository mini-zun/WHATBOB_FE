import { router } from "expo-router";
import { Platform } from "react-native";

import { isLogoutInProgress } from "./auth_operation";
import { clearWebSession, readWebSession, refreshAuthentication } from "./web-auth";
import { hasAuthContextChanged, markAuthContextChanged } from "./auth_context";

const REQUEST_TIMEOUT = 10000;

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  credentials?: "omit" | "same-origin" | "include";
  allowDuringLogout?: boolean;
  timeout?: number;
};

function assertRequestAllowed(options: ApiOptions): void {
  if(hasAuthContextChanged()) {
    throw new ApiError("다른 탭에서 계정이 변경되었습니다. 다시 시작해 주세요.", 409, "AUTH_CONTEXT_CHANGED",);
  }
  if (isLogoutInProgress() && !options.allowDuringLogout) {
    throw new ApiError(
      "로그아웃을 처리하고 있습니다. 잠시 기다려 주세요.",
      409,
      "AUTH_TRANSITION_IN_PROGRESS",
    );
  }
}

export function getApiBaseUrl(): string {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) throw new ApiError("백엔드 주소가 설정되지 않았습니다.", 0);
  return apiBaseUrl.replace(/\/$/, "");
}

function getApiHeaders(apiBaseUrl: string): Record<string, string> {
  const hostname = new URL(apiBaseUrl).hostname;
  return hostname.endsWith(".ngrok-free.dev")
    ? { "ngrok-skip-browser-warning": "true" }
    : {};
}

export function getAccessToken(): string | null {
  if (Platform.OS !== "web") return null;
  return readWebSession()?.access_token ?? null;
}

export function handleUnauthorized() {
  if (Platform.OS === "web") clearWebSession();
  router.replace("/login");
}

export function getCurrentUserId(): number | null {
  if (Platform.OS !== "web") return null;
  return readWebSession()?.user.id ?? null;
}

function getCurrentUserUuid(): string | null {
  if (Platform.OS !== "web") return null;
  return readWebSession()?.user.uuid ?? null;
}

function getErrorCode(data: unknown): string | undefined {
  if (!data || typeof data !== "object" || !("detail" in data)) {
    return undefined;
  }

  const detail = data.detail;

  if (!detail || typeof detail !== "object" || !("code" in detail)) {
    return undefined;
  }

  return typeof detail.code === "string" ? detail.code : undefined;
}

function getErrorMessage(data: unknown, status: number): string {
  if (
    data &&
    typeof data === "object" &&
    "message" in data &&
    typeof data.message === "string" &&
    data.message.trim()
  ) {
    return data.message.trim();
  }
  if (data && typeof data === "object" && "detail" in data) {
    const { detail } = data;
    if (typeof detail === "string") return detail;

    if (
      detail && typeof detail === "object" &&
      "message" in detail && typeof detail.message === "string" &&
      detail.message.trim()
    ) {
      return detail.message.trim();
    }
    if (Array.isArray(detail) && typeof detail[0]?.msg === "string")
      return detail[0].msg;
  }
  return `요청에 실패했습니다. (HTTP ${status})`;
}

async function requestOnce<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  assertRequestAllowed(options);
  const { method = "GET", body, auth = true, signal, headers: extraHeaders, credentials, timeout: requestTimeout = REQUEST_TIMEOUT, } = options;
  const apiBaseUrl = getApiBaseUrl();
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const headers: Record<string, string> = {
    ...getApiHeaders(apiBaseUrl),
    ...extraHeaders,
  };

  if (body !== undefined && !isFormData) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getAccessToken();
    if (!token) {
      throw new ApiError(
        "인증 정보가 없습니다. 다시 시작해 주세요.",
        401,
        "ACCESS_TOKEN_MISSING",
      );
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, requestTimeout);
  const cancel = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", cancel);

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers,
      body:
        body === undefined
          ? undefined
          : isFormData
            ? body
            : JSON.stringify(body),
      signal: controller.signal,
      credentials,
    });
    const data: unknown =
      response.status === 204 ? null : await response.json().catch(() => null);

    if (!response.ok) {
      const code = getErrorCode(data);

      if (response.status === 409 && code === "AUTH_CONTEXT_CHANGED") {
        markAuthContextChanged();
      }

      throw new ApiError(
        getErrorMessage(data, response.status),
        response.status,
        code,
      );
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (timedOut)
      throw new ApiError("요청 시간이 초과되었습니다. 다시 시도해 주세요.", 0);
    if (signal?.aborted) throw error;
    throw new ApiError(
      "서버에 연결할 수 없습니다. 네트워크를 확인해 주세요.",
      0,
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }

}

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const originalToken = getAccessToken();
  const originalUuid = getCurrentUserUuid();

  const assertSameUser = () => {
    assertRequestAllowed(options);
    if (
      options.auth !== false &&
      getCurrentUserUuid() !== originalUuid
    ) {
      throw new ApiError(
        "인증 정보가 변경되었습니다. 새로고침해 주세요.",
        409,
        "AUTH_CONTEXT_CHANGED",
      );
    }
  };

  try {
    const result = await requestOnce<T>(path, options);

    assertSameUser();
    return result;
  } catch (error) {
    if (
      options.auth === false ||
      !(error instanceof ApiError) ||
      error.status !== 401 ||
      error.code !== "ACCESS_TOKEN_EXPIRED"
    ) {
      throw error;
    }

    options.signal?.throwIfAborted();
    assertSameUser();

    const currentToken = getAccessToken();
    if (!currentToken) throw error;

    if (currentToken === originalToken) {
      await refreshAuthentication(options.allowDuringLogout);
    }

    options.signal?.throwIfAborted();
    assertSameUser();

    const result = await requestOnce<T>(path, options);

    assertSameUser();
    return result;
  }
}
