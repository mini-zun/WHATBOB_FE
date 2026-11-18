import {
    AuthApiError,
    prepareAuthentication,
    createAnonymousUser,
    issueToken,
    isAuthResponse,
    type AuthResponse
} from './auth';


export type KakaoLinkRequest = {
    state: string;
    operation_key: string;
    createdAt: number;
    transition_id?: string;
};

const REQUEST_KEY = 'kakao_login_request';
const SESSION_KEY = 'whatbob_session';
const REQUEST_TTL = 10 * 60 * 1000;
let initialization: Promise<AuthResponse> | null = null;
let tokenRefresh: Promise<AuthResponse> | null = null;

export function refreshAuthentication(): Promise<AuthResponse> {
    if (tokenRefresh) return tokenRefresh;

    tokenRefresh = (async () => {
        const session = await issueToken();

        saveWebSession(session);
        return session;
    })().catch((error: unknown) => {
        if (!(error instanceof AuthApiError)) {
            throw error;
        }

        const sessionEnded =
            error.status === 401 &&
            (
                error.code === 'SESSION_EXPIRED' ||
                error.code === 'SESSION_REVOKED' ||
                error.code === 'SESSION_NOT_FOUND'
            );

        if (sessionEnded) {
            clearWebSession();

            throw new AuthApiError('인증이 종료되었습니다. 인증을 다시 시작해 주세요.', error.status, error.code,);
        }
        if (
            error.status === 409 &&
            error.code === 'AUTH_CONTEXT_CHANGED'
        ) {
            throw new AuthApiError('다른 탭에서 인증 정보가 변경되었습니다. 새로고침해 주세요.', error.status, error.code,);
        }

        throw error;
    }).finally(() => {
        tokenRefresh = null;
    });

    return tokenRefresh;
}

export function initializeAuthentication(): Promise<AuthResponse> {
    if (initialization) return initialization;

    initialization = (async () => {
        const preparation = await prepareAuthentication();

        const session = preparation.next_action === 'CREATE_USER'
            ? await createAnonymousUser()
            : await issueToken();

        saveWebSession(session);
        return session;
    })().catch((error) => {
        initialization = null;
        throw error;
    });

    return initialization;
}

function storage() {
    if (typeof window === 'undefined') throw new Error('웹에서 로그인을 진행해 주세요.');
    return window.sessionStorage;
}

export function prepareKakaoLogin(loginUrl: string): string {
    const url = new URL(loginUrl);
    const state = url.searchParams.get('state') || window.crypto.randomUUID();
    url.searchParams.set('state', state);

    const request: KakaoLinkRequest = {
        state,
        operation_key: window.crypto.randomUUID(),
        createdAt: Date.now(),
    };

    storage().setItem(REQUEST_KEY, JSON.stringify(request));
    return url.toString();
}

export function clearLoginRequest() {
    storage().removeItem(REQUEST_KEY);
}

export function readWebSession(): AuthResponse | null {
    const raw = storage().getItem(SESSION_KEY);
    if (!raw) return null;
    try {
        const session: unknown = JSON.parse(raw);
        if (isAuthResponse(session)) return session;
    } catch {
    }
    storage().removeItem(SESSION_KEY);
    return null;
}

export function clearWebSession() {
    storage().removeItem(SESSION_KEY);
    clearLoginRequest();
    initialization = null;

}

export function saveWebSession(session: AuthResponse): void {
    if (!isAuthResponse(session)) {
        throw new Error('인증 응답이 올바르지 않습니다.');
    }

    storage().setItem(SESSION_KEY, JSON.stringify(session));
}

export function readKakaoLinkRequest(state: string): KakaoLinkRequest {
    const raw = storage().getItem(REQUEST_KEY);
    let data: unknown;

    try {
        data = raw ? JSON.parse(raw) : null;
    } catch {
        throw new Error('카카오 연결 요청 정보가 올바르지 않습니다.');
    }

    if (!data || typeof data !== 'object') {
        throw new Error('카카오 연결 요청 정보가 없습니다.');
    }

    const request = data as Partial<KakaoLinkRequest>;

    if (
        !state ||
        request.state !== state ||
        typeof request.operation_key !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            .test(request.operation_key) ||
        request.transition_id !== undefined &&
        (
            typeof request.transition_id !== 'string' ||
            !request.transition_id.trim()
        ) ||
        typeof request.createdAt !== 'number' ||
        !Number.isFinite(request.createdAt) ||
        Date.now() - request.createdAt < 0 ||
        Date.now() - request.createdAt > REQUEST_TTL
    ) {
        throw new Error('카카오 연결 요청이 없거나 만료되었습니다. 다시 시도해 주세요.');
    }
    return request as KakaoLinkRequest;
}

export function saveKakaoTransitionId(
    state: string,
    transitionId: string,
): void {
    if(!transitionId.trim()) {
        throw new Error('계정 전환 ID가 없습니다.');
    }
    const request = readKakaoLinkRequest(state);

    if(
        request.transition_id &&
        request.transition_id !== transitionId
    ) {
        throw new Error('이미 저장된 계정 전환 ID와 일치하지 않습니다.');
    }

    storage().setItem(
        REQUEST_KEY,
        JSON.stringify({
            ...request,
            transition_id: transitionId,
        }),
    );
}
