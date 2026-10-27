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

export type KakaoLoginResponse = {
    access_token: string;
    token_type: string;
    is_new_user: boolean;
    user: {
        id: number;
        kakao_id: number;
        nickname: string | null;
        email: string | null;
        profile_image: string | null;
    };
};

export async function loginWithKakaoCode(
    code: string
): Promise<KakaoLoginResponse> {
    const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    if (!apiBaseUrl) throw new Error('API 주소가 설정되지 않았습니다.');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
        const response = await fetch(
            `${apiBaseUrl.replace(/\/$/, '')}/api/auth/kakao/login`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getApiHeaders(apiBaseUrl) },
                body: JSON.stringify({ code }),
                signal: controller.signal,
            }
        );
        if (!response.ok) throw new Error('카카오 로그인에 실패했습니다. 다시 로그인해 주세요.');
        const data: unknown = await response.json();
        if (!isKakaoLoginResponse(data)) throw new Error('로그인 응답이 올바르지 않습니다.');
        return data;
    } catch (error) {
        if (controller.signal.aborted) throw new Error('요청 시간이 초과되었습니다. 다시 로그인해 주세요.');
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

export function isKakaoLoginResponse(data: unknown): data is KakaoLoginResponse {
    if (!data || typeof data !== 'object') return false;
    const value = data as Partial<KakaoLoginResponse>;
    const user = value.user;
    return typeof value.access_token === 'string' && value.access_token.length > 0 &&
        typeof value.token_type === 'string' && value.token_type.toLowerCase() === 'bearer' &&
        typeof value.is_new_user === 'boolean' && !!user &&
        typeof user.id === 'number' && typeof user.kakao_id === 'number' &&
        (user.nickname === null || typeof user.nickname === 'string') &&
        (user.email === null || typeof user.email === 'string') &&
        (user.profile_image === null || typeof user.profile_image === 'string');
}
