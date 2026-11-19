import {
    prepareTransition,
    commitTransition,
    getTransitionStatus,
    recoverTransition,
} from "./auth_transition";

import {
    readLogoutRequest,
    createLogoutRequest,
    saveLogoutTransitionId,
    clearLogoutRequest,
} from "./logout_request";

import { readWebSession, saveWebSession } from "./web-auth";

import type { TransitionCommitResponse } from "@/types/auth_transition";

async function getLogoutStatus(
    transitionId: string,
    originUuid: string,
) {
    const status = await getTransitionStatus(transitionId);

    if (
        status.action !== "LOGOUT" ||
        status.origin_uuid !== originUuid
    ) {
        throw new Error("저장된 로그아웃 작업 정보가 일치하지 않습니다.");
    }
    return status;
}

async function commitOrRecover(
    transitionId: string,
    originUuid: string,
): Promise<TransitionCommitResponse> {
    try {
        return await commitTransition(transitionId);
    } catch (error) {
        const status = await getLogoutStatus(transitionId, originUuid);

        if (status.status === "COMMITTED") {
            return recoverTransition(transitionId);
        }

        throw error;
    }
}

async function runLogout(): Promise<void> {
    const session = readWebSession();
    let request = readLogoutRequest();

    if (!request) {
        if (!session || session.user.kakao_id === null) {
            throw new Error("카카오 연결 사용자만 로그아웃할 수 있습니다.");
        }

        request = createLogoutRequest(session.user.uuid);
    }

    let result: TransitionCommitResponse;

    if (request.transition_id) {
        const status = await getLogoutStatus(
            request.transition_id,
            request.origin_uuid,
        );

        if (status.status === "COMMITTED") {
            result = await recoverTransition(request.transition_id);
        } else if (status.status === "PREPARED") {
            result = await commitOrRecover(
                request.transition_id,
                request.origin_uuid,
            );
        } else {
            if (
                status.status === "EXPIRED" ||
                status.status === "CANCELLED"
            ) {
                clearLogoutRequest();
            }

            throw new Error(
                "진행할 수 없는 로그아웃 상태입니다. 다시 시도해 주세요.",
            );
        }
    } else {
        if (
            !session ||
            session.user.uuid !== request.origin_uuid ||
            session.user.kakao_id === null
        ) {
            throw new Error("로그아웃을 시작한 사용자 정보가 변경되었습니다.");
        }

        const prepared = await prepareTransition({
            action: "LOGOUT",
            operation_key: request.operation_key,
        });

        saveLogoutTransitionId(prepared.transition_id);

        result = await commitOrRecover(
            prepared.transition_id,
            request.origin_uuid,
        );
    }

    if (
        result.action !== "LOGOUT" ||
        result.user.kakao_id !== null ||
        result.user.uuid === request.origin_uuid
    ) {
        throw new Error("로그아웃 완료 응답이 올바르지 않습니다.");
    }

    saveWebSession(result);
    clearLogoutRequest();
}

let logoutInProgress: Promise<void> | null = null;

export function completeLogout(): Promise<void> {
    if (logoutInProgress) return logoutInProgress;

    logoutInProgress = runLogout().finally(() => {
        logoutInProgress = null;
    });

    return logoutInProgress;
}