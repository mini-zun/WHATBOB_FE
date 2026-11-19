function getApiHeaders(apiBaseUrl: string): Record<string, string> {
    const hostname = new URL(apiBaseUrl).hostname;
    return hostname.endsWith('.ngrok-free.dev')
        ? { 'ngrok-skip-browser-warning': 'true' }
        : {};
}

export async function getKakaoLoginUrl(state: string): Promise<string> {
    const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    if (!apiBaseUrl) throw new Error('백엔드 주소가 설정되지 않았습니다.');
    if (!state.trim()) throw new Error('로그인 요청 정보가 없습니다. 다시 시도해 주세요.');

    const endpoint = new URL(`${apiBaseUrl.replace(/\/$/, '')}/api/auth/kakao/login/url`);
    endpoint.searchParams.set('state', state);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(
            endpoint.toString(),
            { signal: controller.signal, headers: getApiHeaders(apiBaseUrl) }
        );
        if (!response.ok) throw new Error(`로그인 주소를 가져오지 못했습니다. (HTTP ${response.status})`);

        const data: unknown = await response.json();
        if (!data || typeof data !== 'object' || !('login_url' in data) ||
            typeof data.login_url !== 'string') {
            throw new Error('로그인 주소 응답이 올바르지 않습니다.');
        }

        const url = new URL(data.login_url);
        if (url.origin !== 'https://kauth.kakao.com' || url.pathname !== '/oauth/authorize') {
            throw new Error('카카오 로그인 주소가 올바르지 않습니다.');
        }
        const returnedState = url.searchParams.get('state');
        if (returnedState && returnedState !== state) {
            throw new Error('로그인 요청 정보가 일치하지 않습니다. 다시 시도해 주세요.');
        }
        url.searchParams.set('state', state);
        return url.toString();
    } catch (error) {
        if (controller.signal.aborted) {
            throw new Error('요청 시간이 초과되었습니다. 다시 시도해 주세요.');
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

export type AuthResponse = {
    access_token: string;
    token_type: string;
    expires_in: number;
    is_new_user: boolean;
    user: {
        id: number;
        uuid: string;
        kakao_id: number | null;
        nickname?: string | null;
        email?: string | null;
        profile_image?: string | null;
    };
};

export type PrepareAuthentication = {
    next_action: "CREATE_USER" | "ISSUE_TOKEN";
    notice?: "PREVIOUS_SESSION_UNAVAILABLE" | null;
}


export function isAuthResponse(data: unknown): data is AuthResponse {
    if (!data || typeof data !== 'object') return false;
    const value = data as Partial<AuthResponse>;
    const user = value.user;
    return typeof value.access_token === 'string' && value.access_token.length > 0 &&
        typeof value.token_type === 'string' && value.token_type.toLowerCase() === 'bearer' &&
        typeof value.is_new_user === 'boolean' && !!user &&
        typeof value.expires_in === 'number' &&
        typeof user.id === 'number' && typeof user.uuid === 'string' &&
        (user.kakao_id === null || typeof user.kakao_id === 'number') &&
        (user.nickname === undefined || user.nickname === null || typeof user.nickname === 'string') &&
        (user.email === undefined || user.email === null || typeof user.email === 'string') &&
        (user.profile_image === undefined || user.profile_image === null || typeof user.profile_image === 'string');
}

export async function prepareAuthentication(): Promise<PrepareAuthentication> {
    const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    if (!apiBaseUrl) throw new Error("API 주소가 설정되지 않았습니다.");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(
            `${apiBaseUrl.replace(/\/$/, '')}/api/auth/preparations`,
            {
                method: 'POST',
                credentials: 'include',
                headers: {
                    ...getApiHeaders(apiBaseUrl),
                    'X-Whatbob-Request': '1',
                },
                signal: controller.signal,
            },
        );

        if (!response.ok) {
            throw new Error(`인증 준비에 실패했습니다. (HTTP ${response.status})`);
        }

        const data: unknown = await response.json();

        if (
            !data || typeof data !== 'object' || !('next_action' in data) ||
            !(data.next_action === 'CREATE_USER' || data.next_action === 'ISSUE_TOKEN') ||
            (
                'notice' in data && data.notice !== undefined && data.notice !== null &&
                data.notice !== 'PREVIOUS_SESSION_UNAVAILABLE'
            )
        ) {
            throw new Error('인증 준비 응답이 올바르지 않습니다.');
        }

        return data as PrepareAuthentication;
    } catch (error) {
        if (controller.signal.aborted) {
            throw new Error('인증 준비 시간이 초과되었습니다. 다시 시도해 주세요.');
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

async function requestAuthToken(
    path: '/api/auth/anonymous-users' | '/api/auth/tokens', expectedUserUuid?: string,
): Promise<AuthResponse> {
    const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    if (!apiBaseUrl) throw new Error('API 주소가 설정되지 않았습니다.');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(
            `${apiBaseUrl.replace(/\/$/, '')}${path}`,
            {
                method: 'POST',
                credentials: 'include',
                headers: {
                    ...getApiHeaders(apiBaseUrl),
                    'X-Whatbob-Request': '1',
                    ...(
                        path === '/api/auth/tokens' && expectedUserUuid
                        ? { 'X-Whatbob-Auth-Context' : expectedUserUuid} : {}
                    ),
                },
                signal: controller.signal,
            },
        );

        const data: unknown = await response.json().catch(() => null);

        if (!response.ok) {
            let code: string | undefined;
            let message = `인증에 실패했습니다. (HTTP ${response.status})`;

            if(data && typeof data === 'object' && 'detail' in data) {
                const detail = data.detail;

                if(detail && typeof detail === 'object') {
                    if('code' in detail && typeof detail.code === 'string') {
                        code = detail.code;
                    }

                    if(
                        'message' in detail &&
                        typeof detail.message === 'string' &&
                        detail.message.trim()
                    ) {
                        message = detail.message.trim();
                    }
                }
            }
            throw new AuthApiError(message, response.status, code);
        }
        if (!isAuthResponse(data)) {
            throw new Error('인증 응답이 올바르지 않습니다.');
        }

        return data;
    } catch (error) {
        if (controller.signal.aborted) {
            throw new Error('인증 요청 시간이 초과되었습니다. 다시 시도해 주세요.');
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

export function createAnonymousUser(): Promise<AuthResponse> {
    return requestAuthToken('/api/auth/anonymous-users');
}

export function issueToken(
    expectedUserUuid?: string,
): Promise<AuthResponse> {
    return requestAuthToken('/api/auth/tokens', expectedUserUuid,);
}

export class AuthApiError extends Error {
    constructor(
        message: string,
        readonly status: number,
        readonly code?: string,
    ) {
        super(message);
        this.name = 'AuthApiError';
    }
}
