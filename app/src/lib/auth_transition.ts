import { apiFetch } from "./api";
import { isAuthResponse } from "./auth";
import type {
    TransitionPrepareRequest,
    TransitionPrepareResponse,
    TransitionCommitResponse,
} from "@/types/auth_transition"

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