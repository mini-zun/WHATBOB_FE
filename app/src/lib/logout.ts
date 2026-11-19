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

import {
    readWebSession,
    saveWebSession,
    waitForTokenRefresh,
    clearWebSession,
} from "./web-auth";

import { ApiError } from "./api";

import { beginLogoutOperation } from "./auth_operation";

import type { TransitionCommitResponse, TransitionPrepareResponse } from "@/types/auth_transition";

async function getLogoutStatus(
    transitionId: string,
    originUuid: string,
) {
    const status = await getTransitionStatus(transitionId, true);

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
        return await commitTransition(transitionId, true);
    } catch (error) {
        const status = await getLogoutStatus(transitionId, originUuid);

        if (status.status === "COMMITTED") {
            return recoverTransition(transitionId, true);
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
            result = await recoverTransition(request.transition_id, true);
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

        let prepared: TransitionPrepareResponse;

        try {
            prepared = await prepareTransition({
                action: "LOGOUT",
                operation_key: request.operation_key,
            });
        } catch (error) {
            if (
                error instanceof ApiError &&
                error.status === 409 &&
                error.code === "ROOM_PARTICIPATION_ACTIVE"
            ) {
                clearLogoutRequest();
            }

            throw error;
        }

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
let finishLogoutOperation: (() => void) | null = null;

function releaseLogoutIfResolved(): void {
    try {
        if (readLogoutRequest()) return;
    } catch {
        return;
    }
    finishLogoutOperation?.();
    finishLogoutOperation = null;
}

export function completeLogout(): Promise<void> {
    if (logoutInProgress) return logoutInProgress;

    logoutInProgress = (async () => {
        if (!finishLogoutOperation) {
            finishLogoutOperation = beginLogoutOperation();
        }

        try {
            await waitForTokenRefresh();
            await runLogout();
        } catch (error) {
            const restartRequired =
                error instanceof ApiError &&
                (
                    error.status === 404 &&
                    error.code === "TRANSITION_NOT_FOUND" ||
                    error.status === 401 && (
                        error.code === "TRANSITION_RECOVERY_EXPIRED" ||
                        error.code === "TRANSITION_SECRET_REQUIRED" ||
                        error.code === "SESSION_UNAVAILABLE"
                    )
                );
            if (restartRequired) {
                clearWebSession();
                clearLogoutRequest();
                throw new LogoutRestartRequiredError();
            }
            throw error;
        }
    })().finally(() => {
        releaseLogoutIfResolved();
        logoutInProgress = null;
    });

    return logoutInProgress;
}

export class LogoutRestartRequiredError extends Error {
    constructor() {
        super("로그아웃 결과를 복구할 수 없어 인증을 다시 시작합니다.");
        this.name = "LogoutRestartRequiredError";
    }
}