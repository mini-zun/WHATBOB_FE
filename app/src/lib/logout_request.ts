export type LogoutRequest = {
    operation_key: string;
    origin_uuid: string;
    transition_id?: string;
};

const REQUEST_KEY = "whatbob_logout_request";

function storage() {
    if(typeof window === 'undefined') {
        throw new Error("현재는 웹에서 로그아웃해 주세요.");
    }
    return window.sessionStorage;
}

export function readLogoutRequest():
LogoutRequest | null {
    const raw = storage().getItem(REQUEST_KEY);
    if(!raw) return null;

    let data: unknown;

    try {
        data = JSON.parse(raw);
    } catch {
        throw new Error("저장된 로그아웃 요청이 올바르지 않습니다.");
    }

    if(!data || typeof data !== "object") {
        throw new Error("저장된 로그아웃 요청이 올바르지 않습니다.");
    }

    const request = data as Partial<LogoutRequest>;

    if(
        typeof request.operation_key !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request.operation_key) ||
        typeof request.origin_uuid !== "string" ||
        !request.origin_uuid.trim() ||
        (
            request.transition_id !== undefined &&
            (
                typeof request.transition_id !== "string" ||
                !request.transition_id.trim()
            )
        )
    ) {
        throw new Error("저장된 로그아웃 요청이 올바르지 않습니다.");
    }

    return request as LogoutRequest;
}

export function createLogoutRequest(originUuid: string): LogoutRequest {
    if(!originUuid.trim()) {
        throw new Error("로그아웃할 사용자 정보가 없습니다.");
    }

    const existing = readLogoutRequest();

    if(existing) {
        if(existing.origin_uuid !== originUuid) {
            throw new Error("이전 로그아웃 작업 상태 확인이 필요합니다.");
        }
        return existing;
    }
    const request: LogoutRequest = {
        operation_key: window.crypto.randomUUID(),
        origin_uuid: originUuid,
    };

    storage().setItem(REQUEST_KEY, JSON.stringify(request));
    return request;
}

export function saveLogoutTransitionId(transitionId: string): void {
    if(!transitionId.trim()) {
        throw new Error("로그아웃 전환 ID가 없습니다.");
    }

    const request = readLogoutRequest();
    if(!request) {
        throw new Error('로그아웃 요청 정보가 없습니다.');
    }

    if( request.transition_id && request.transition_id !== transitionId){
        throw new Error("기존 로그아웃 전환 ID와 일치하지 않습니다.");
    }
    storage().setItem(
        REQUEST_KEY,
        JSON.stringify({
            ...request,
            transition_id: transitionId,
        }),
    );
}

export function clearLogoutRequest(): void {
    storage().removeItem(REQUEST_KEY);
}