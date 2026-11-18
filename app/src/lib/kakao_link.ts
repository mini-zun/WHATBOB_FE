import {
    prepareTransition,
    commitTransition,
    getTransitionStatus,
    recoverTransition,
} from "./auth_transition";
import {
    readKakaoLinkRequest,
    saveKakaoTransitionId,
    saveWebSession,
    clearLoginRequest,
} from "./web-auth";
import type { TransitionCommitResponse } from "@/types/auth_transition";


let completion: {
    code: string;
    state: string;
    promise: Promise<void>;   
} | null = null;

async function commitOrRecover(
    transitionId: string,
): Promise<TransitionCommitResponse> {
    try {
        return await commitTransition(transitionId);
    } catch (error) {
        const status = await getTransitionStatus(transitionId);

        if (status.action !== "KAKAO_LINK") {
            throw new Error('카카오 연결 작업이 아닙니다.');
        }
        if (status.status === "COMMITTED") {
            return recoverTransition(transitionId);
        }

        throw error;
    }
}

async function runKakaoLink(code: string, state: string): Promise<void> {
    const request = readKakaoLinkRequest(state);
    let result: TransitionCommitResponse;

    if (request.transition_id) {
        const status = await getTransitionStatus(request.transition_id);

        if(status.action !== "KAKAO_LINK") {
            throw new Error('카카오 연결 작업이 아닙니다.');
        }

        if (status.status === "COMMITTED") {
            result = await recoverTransition(request.transition_id);
        } else if (status.status === "PREPARED") {
            result = await commitOrRecover(request.transition_id);
        } else {
            throw new Error(
                "진행할 수 없는 계정 전환 상태입니다. 카카오 연결을 다시 시작해 주세요.",
            );
        }
    } else {
        if (!code.trim()) {
            throw new Error("카카오 인가 코드가 없습니다.");
        }

        const prepared = await prepareTransition({
            action: "KAKAO_LINK",
            code,
            state,
            expected_state: request.state,
            operation_key: request.operation_key,
        });

        saveKakaoTransitionId(state, prepared.transition_id);
        result = await commitOrRecover(prepared.transition_id);
    }

    if (result.action !== "KAKAO_LINK") {
        throw new Error("카카오 연결 완료 응답이 올바르지 않습니다.");
    }

    saveWebSession(result);
    clearLoginRequest();

}

export function completeKakaoLink(
    code: string,
    state: string,
): Promise<void> {
    if (completion?.code === code && completion.state === state) {
        return completion.promise;
    }

    if (completion) {
        return Promise.reject(
            new Error("다른 카카오 연결 작업이 진행 중입니다."),
        );
    }

    const promise = runKakaoLink(code, state).catch((error) => {
        if (completion?.promise === promise) {
            completion = null;
        }
        throw error;
    });

    completion = { code, state, promise };
    return promise;
}