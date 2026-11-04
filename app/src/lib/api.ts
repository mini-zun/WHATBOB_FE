import { router } from 'expo-router';
import { Platform } from 'react-native';

import { clearWebSession, readWebSession } from './web-auth';

const REQUEST_TIMEOUT = 10000;

export class ApiError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

type ApiOptions = {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    auth?: boolean;
    signal?: AbortSignal;
};

function getApiBaseUrl(): string {
    const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    if (!apiBaseUrl) throw new ApiError('백엔드 주소가 설정되지 않았습니다.', 0);
    return apiBaseUrl.replace(/\/$/, '');
}

function getApiHeaders(apiBaseUrl: string): Record<string, string> {
    const hostname = new URL(apiBaseUrl).hostname;
    return hostname.endsWith('.ngrok-free.dev')
        ? { 'ngrok-skip-browser-warning': 'true' }
        : {};
}

function getAccessToken(): string | null {
    if (Platform.OS !== 'web') return null;
    return readWebSession()?.access_token ?? null;
}

function handleUnauthorized() {
    if (Platform.OS === 'web') clearWebSession();
    router.replace('/login');
}

function getErrorMessage(data: unknown, status: number): string {
    if (data && typeof data === 'object' && 'detail' in data) {
        const { detail } = data;
        if (typeof detail === 'string') return detail;
        if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') return detail[0].msg;
    }
    return `요청에 실패했습니다. (HTTP ${status})`;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
    const { method = 'GET', body, auth = true, signal } = options;
    const apiBaseUrl = getApiBaseUrl();

    const headers: Record<string, string> = getApiHeaders(apiBaseUrl);
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth) {
        const token = getAccessToken();
        if (!token) {
            handleUnauthorized();
            throw new ApiError('로그인이 필요합니다.', 401);
        }
        headers.Authorization = `Bearer ${token}`;
    }

    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, REQUEST_TIMEOUT);
    const cancel = () => controller.abort();
    if (signal?.aborted) controller.abort();
    signal?.addEventListener('abort', cancel);

    try {
        const response = await fetch(`${apiBaseUrl}${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: controller.signal,
        });
        const data: unknown = response.status === 204 ? null : await response.json().catch(() => null);

        if (response.status === 401 && auth) {
            handleUnauthorized();
            throw new ApiError('로그인이 만료되었습니다. 다시 로그인해 주세요.', 401);
        }
        if (!response.ok) throw new ApiError(getErrorMessage(data, response.status), response.status);
        return data as T;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        if (timedOut) throw new ApiError('요청 시간이 초과되었습니다. 다시 시도해 주세요.', 0);
        if (signal?.aborted) throw error;
        throw new ApiError('서버에 연결할 수 없습니다. 네트워크를 확인해 주세요.', 0);
    } finally {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', cancel);
    }
}
