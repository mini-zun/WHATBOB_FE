import { ApiError } from "./api";
import { AuthApiError } from "./auth";

export function getAuthRestartMessage(error: unknown): string | null {
    if (
        !(error instanceof AuthApiError) &&
        !(error instanceof ApiError)
    ) {
        return null;
    }

    if (
        error.status === 401 && (
            error.code === 'SESSION_EXPIRED' ||
            error.code === 'SESSION_REVOKED' ||
            error.code === 'SESSION_NOT_FOUND' ||
            error.code === 'ACCESS_TOKEN_MISSING'
        )
    ) {
        return "인증이 종료되었습니다. 다시 시작하면 홈으로 이동하며, 실패한 요청은 자동으로 재전송되지 않습니다.";
    }
    return null;
}