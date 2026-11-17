import type { AuthResponse } from "@/lib/auth";

export type TransitionAction = "KAKAO_LINK" | "LOGOUT"

export type TransitionPrepareRequest = {
    action: TransitionAction;
    code?: string | null;
    state?: string | null;
    expected_stsate?: string | null;
    operation_key?: string | null;
    trainsition_id?: string | null;
};

export type TransitionPreareResponse = {
    transition_id: string;
    action: TransitionAction;
    status: "PREPARED";
    expires_at: string;
};

export type TransitionCommitResponse = AuthResponse & {
    transition_id: string;
    action: TransitionAction;
    status: "COMMITTED";
};

export type TransitionStatusResponse = {
    transition_id: string;
    action: TransitionAction;
    status: string;
    origin_uuid: string;
    result_uuid: string | null;
    expires_at: string;
}