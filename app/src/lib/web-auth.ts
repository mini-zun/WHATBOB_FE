import { isKakaoLoginResponse, loginWithKakaoCode, type KakaoLoginResponse } from './auth';

const REQUEST_KEY = 'kakao_login_request';
const SESSION_KEY = 'whatbob_session';
const REQUEST_TTL = 10 * 60 * 1000;
let completion: { code: string; state: string; promise: Promise<void> } | null = null;

function storage() {
    if (typeof window === 'undefined') throw new Error('웹에서 로그인을 진행해 주세요.');
    return window.sessionStorage;
}

export function prepareKakaoLogin(loginUrl: string): string {
    const url = new URL(loginUrl);
    const state = url.searchParams.get('state') || window.crypto.randomUUID();
    url.searchParams.set('state', state);
    storage().setItem(REQUEST_KEY, JSON.stringify({ state, createdAt: Date.now() }));
    completion = null;
    return url.toString();
}

export function clearLoginRequest() {
    storage().removeItem(REQUEST_KEY);
}

export function readWebSession(): KakaoLoginResponse | null {
    const raw = storage().getItem(SESSION_KEY);
    if (!raw) return null;
    try {
        const session: unknown = JSON.parse(raw);
        if (isKakaoLoginResponse(session)) return session;
    } catch {
    }
    storage().removeItem(SESSION_KEY);
    return null;
}

export function clearWebSession() {
    storage().removeItem(SESSION_KEY);
    clearLoginRequest();
    completion = null;
}

export function completeKakaoLogin(code: string, state: string): Promise<void> {
    if (completion?.code === code && completion.state === state) return completion.promise;
    const promise = (async () => {
        const raw = storage().getItem(REQUEST_KEY);
        const request = raw ? JSON.parse(raw) : null;
        if (!request || !state || request.state !== state ||
            typeof request.createdAt !== 'number' ||
            Date.now() - request.createdAt < 0 || Date.now() - request.createdAt > REQUEST_TTL) {
            throw new Error('로그인 요청이 없거나 만료되었습니다. 다시 로그인해 주세요.');
        }
        clearLoginRequest();
        if (!code) throw new Error('인가 코드가 전달되지 않았습니다.');
        const session = await loginWithKakaoCode(code);
        storage().setItem(SESSION_KEY, JSON.stringify(session));
    })();
    completion = { code, state, promise };
    return promise;
}
