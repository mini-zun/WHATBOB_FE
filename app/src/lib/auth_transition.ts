import { apiFetch } from "./api";
import { isAuthResponse } from "./auth";
import type {
    TransitionPrepareRequest,
    TransitionPrepareResponse,
    TransitionCommitResponse,
    TransitionStatusResponse,
} from "@/types/auth_transition"

export async function getTransitionStatus(
    transitionId: string,
): Promise<TransitionStatusResponse> {
    if (!transitionId.trim()) {
        throw new Error("계정 전환 ID가 없습니다.");
    }

    const result = await apiFetch<TransitionStatusResponse>(
        `/api/auth/transitions/${encodeURIComponent(transitionId)}`,
        {
            auth: false,
            credentials: "include",
            headers: {
                "X-Whatbob-Request": "1",
            },
        },
    );

    if (
        !result ||
        result.transition_id !== transitionId ||
        !(
            result.action === "KAKAO_LINK" ||
            result.action === "LOGOUT"
        ) ||
        typeof result.status !== "string" ||
        !result.status.trim() ||
        typeof result.origin_uuid !== "string" ||
        !(
            result.result_uuid === null ||
            typeof result.result_uuid === "string"
        ) ||
        typeof result.expires_at !== "string" ||
        Number.isNaN(Date.parse(result.expires_at))
    ) {
        throw new Error("계정 전환 상태 응답이 올바르지 않습니다.");
    }

    return result;
}

export async function recoverTransition(
    transitionId: string,
): Promise<TransitionCommitResponse> {
    if (!transitionId.trim()) {
        throw new Error("계정 전환 ID가 없습니다.");
    }

    const result = await apiFetch<TransitionCommitResponse>(
        `/api/auth/transitions/${encodeURIComponent(transitionId)}/recovery`,
        {
            method: "POST",
            auth: false,
            credentials: "include",
            headers: {
                "X-Whatbob-Request": "1",
            },
        },
    );

    if (
        !isAuthResponse(result) ||
        result.transition_id !== transitionId ||
        result.status !== "COMMITTED" ||
        !(
            result.action === "KAKAO_LINK" ||
            result.action === "LOGOUT"
        )
    ) {
        throw new Error("계정 전환 복구 응답이 올바르지 않습니다.");
    }

    return result;
}

export async function prepareTransition(
    request: TransitionPrepareRequest,
): Promise<TransitionPrepareResponse> {
    if (!request.operation_key?.trim()) {
        throw new Error("계정 전환 요청 식별값이 없습니다.");
    }

    if (
        request.action === "KAKAO_LINK" &&
        !request.code?.trim()
    ) {
        throw new Error("카카오 인가 코드가 없습니다.");
    }

    const result = await apiFetch<TransitionPrepareResponse>(
        "/api/auth/transitions",
        {
            method: "POST",
            credentials: "include",
            headers: {
                "X-Whatbob-Request": "1",
                "Idempotency-Key": request.operation_key,
            },
            body: request,
        },
    );

    if (!result ||
        typeof result.transition_id !== "string" ||
        !result.transition_id.trim() ||
        result.action !== request.action ||
        result.status !== "PREPARED" ||
        typeof result.expires_at !== "string" ||
        Number.isNaN(Date.parse(result.expires_at))
    ) {
        throw new Error("계정 전환 준비 응답이 올바르지 않습니다.");
    }
    return result;
}

export async function commitTransition(
    transitionId: string,
): Promise<TransitionCommitResponse> {
    if (!transitionId.trim()) {
        throw new Error("계정 전환 ID가 없습니다.");
    }

    const result = await apiFetch<TransitionCommitResponse>(
        `/api/auth/transitions/${encodeURIComponent(transitionId)}/commit`,
        {
            method: "POST",
            credentials: "include",
            headers: {
                "X-Whatbob-Request": "1",
            },
        },
    );

    if (
        !isAuthResponse(result) ||
        result.transition_id !== transitionId ||
        result.status !== "COMMITTED" ||
        !(
            result.action === "KAKAO_LINK" ||
            result.action === "LOGOUT"
        )
    ) {
        throw new Error("계정 전환 완료 응답이 올바르지 않습니다.");
    }

    return result;
}