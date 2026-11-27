import {
  ApiError,
  apiFetch,
  getApiBaseUrl,
  getCurrentUserId,
  handleUnauthorized,
} from "./api";
import type {
  ApiResponse,
  OrderSheetAnswer,
  OrderSheetQuestion,
  OrderSheetQuestionsData,
} from "@/types/order_sheet";

export type RoomMember = {
  user_id: number;
  nickname: string | null;
  profile_image: string | null;
  role: string;
  joined_at: string;
  order_sheet_completed: boolean;
  order_sheet_completed_at: string | null;
};

export type RoomCreateResponse = {
  room_id: string;
  join_url: string;
  host_user_id: number;
  status: string;
  max_members: number;
  created_at: string;
  expires_at: string;
};

export type RoomJoinResponse = {
  room_id: string;
  user_id: number;
  role: string;
  room_status: string;
  member_count: number;
  max_members: number;
  joined_at: string;
};

export type RoomDetail = {
  room_id: string;
  join_url: string;
  host_user_id: number;
  status: string;
  max_members: number;
  member_count: number;
  is_full: boolean;
  is_member: boolean;
  my_role: string | null;
  created_at: string;
  expires_at: string;
  members: RoomMember[];
  completed_member_count: number;
  all_members_completed: boolean;
  state_version: number;
  current_round: RoomRound | null;
  viewer_state: RoomViewerState | null;
};

export type RoomRoundStatus =
  | "ANSWERING"
  | "ANSWERING_PAUSED"
  | "VOTING"
  | "VOTING_PAUSED"
  | "RESULT"
  | "CANCELLED";

export type RoomCandidate = {
  candidate_id: number;
  menu_id: number;
  food_code: string | null;
  name: string | null;
  base_name: string | null;
  category_large: string | null;
  category_medium: string | null;
  display_order: number;
  proposer_user_ids: number[];
  proposer_count: number;
  vote_count: number | null;
  final_vote_count: number | null;
  is_winner: boolean;
  is_uncontested: boolean;
  image_url?: string | null;
};

export type RoomDepartedMember = {
  user_id: number;
  nickname: string | null;
  left_at: string | null;
};

export type RoomRound = {
  round_id: number;
  round_no: number;
  status: RoomRoundStatus;
  vote_round_no: number | null;
  decision_version: number;
  is_uncontested: boolean;
  cancel_reason: string | null;
  active_member_count: number;
  submitted_member_count: number;
  all_orders_submitted: boolean;
  voted_member_count: number;
  all_votes_submitted: boolean;
  pending_departed_members: RoomDepartedMember[];
  candidates: RoomCandidate[];
  winners: RoomCandidate[];
  nearby_location_ready?: boolean;
};

export type RoomViewerState = {
  user_id: number;
  role: string | null;
  is_host: boolean;
  round_id: number | null;
  round_no: number | null;
  round_status: RoomRoundStatus | null;
  vote_round_no: number | null;
  decision_version: number | null;
  has_submitted_order_sheet: boolean;
  submitted_at: string | null;
  has_voted: boolean;
  voted_at: string | null;
  voted_candidate_ids: number[];
  assigned_questions: OrderSheetQuestion[];
  requires_host_decision: boolean;
};

export type RoomRoundFence = Pick<RoomRound, "round_id" | "round_no">;

export type RoomRoundCommandResponse = {
  room_id: string;
  round_id: number;
  round_no: number;
  status: RoomRoundStatus;
  room_status: string;
  vote_round_no: number;
  decision_version: number;
  cancel_reason?: string | null;
};

export type RoomRoundStartResponse = RoomRoundCommandResponse;

export type RoomOrderSheetSubmitResponse = {
  room_id: string;
  round_id: number;
  round_no: number;
  user_id: number;
  round_status: RoomRoundStatus;
  submitted: boolean;
  submitted_at?: string | null;
  recommendation_id?: number | null;
  submitted_member_count: number;
  active_member_count: number;
  all_orders_submitted: boolean;
};

export type RoomNoResultsSuggestion = {
  question_id: number;
  replacement_option_id: string;
  display_text: string;
  display_menu_count: number;
};

export type RoomNoResultsData = {
  suggested_answer_changes: RoomNoResultsSuggestion[];
  can_review_my_answers: boolean;
};

export type RoomVoteSubmitResponse = {
  room_id: string;
  round_id: number;
  round_no: number;
  vote_round_no: number;
  user_id: number;
  round_status: RoomRoundStatus;
  voted: boolean;
  voted_at?: string | null;
  voted_member_count: number;
  active_member_count: number;
  all_votes_submitted: boolean;
};

export type RoomDecisionAction = "CONTINUE" | "CANCEL";

export const ROOM_ERROR_CODE = {
  roundNotActive: "ROUND_NOT_ACTIVE",
  roundPaused: "ROUND_PAUSED_FOR_HOST_DECISION",
  staleRoundId: "STALE_ROUND_ID",
  staleRoundNo: "STALE_ROUND_NO",
  orderSheetAlreadySubmitted: "ORDER_SHEET_ALREADY_SUBMITTED",
  notAcceptingOrderSheets: "ROUND_NOT_ACCEPTING_ORDER_SHEETS",
  noAvailableMenus: "NO_AVAILABLE_MENUS",
  noMatchingMenus: "NO_MATCHING_MENUS_FOR_ANSWERS",
  staleVoteRound: "STALE_VOTE_ROUND",
  candidateInactive: "CANDIDATE_INACTIVE",
  voteAlreadySubmitted: "VOTE_ALREADY_SUBMITTED",
  notInVoting: "ROUND_NOT_IN_VOTING",
  roundNotPaused: "ROUND_NOT_PAUSED",
  staleDecisionVersion: "STALE_DECISION_VERSION",
  nearbyLocationAlreadySet: "ROUND_NEARBY_LOCATION_ALREADY_SET",
  nearbyLocationPending: "ROUND_NEARBY_LOCATION_PENDING",
} as const;

export type RoomSearchOrigin = {
  latitude: number;
  longitude: number;
};

export type RoomSearchOriginResponse = {
  round_id: number;
  common_state: unknown;
};

export type RoomQuestionsResponse = OrderSheetQuestionsData & {
  room_id: string;
  round_id: number;
  round_no: number;
  round_status: RoomRoundStatus;
  has_submitted: boolean;
  submitted_at: string | null;
};

export type RoomCloseReason = "HOST_LEFT" | "HOST_DISCONNECTED" | "EXPIRED";

export type RoomDeleteResponse = {
  room_id: string;
  deleted: boolean;
  close_reason: RoomCloseReason;
  closed_at: string;
};

export type RoomMemberLeaveResponse = {
  room_id: string;
  user_id: number;
  deleted: boolean;
  member_count: number;
  completed_member_count: number;
  all_members_completed: boolean;
};

export type RoomSocketMessage =
  | { type: "connection.ready"; room_id: string; user_id: number }
  | {
      type: "room.updated";
      state_version?: number;
      room_id: string;
      reason: string;
      user_id: number;
      occurred_at: string;
    }
  | {
      type: "room.closed";
      room_id: string;
      reason: RoomCloseReason;
      closed_at: string;
    }
  | { type: "pong" };

const ROOM_ID =
  /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

function roomPath(roomId: string) {
  return `/api/rooms/${encodeURIComponent(roomId)}`;
}

export async function createRoom(
  maxMembers?: number,
): Promise<RoomCreateResponse> {
  const room = await apiFetch<RoomCreateResponse>("/api/rooms", {
    method: "POST",
    body: { max_members: maxMembers },
  });
  if (!room || typeof room.room_id !== "string" || !room.room_id) {
    throw new ApiError("방 생성 응답이 올바르지 않습니다.", 0);
  }
  return room;
}

export function getRoom(
  roomId: string,
  signal?: AbortSignal,
): Promise<RoomDetail> {
  return apiFetch<RoomDetail>(roomPath(roomId), { signal });
}

export function joinRoom(roomId: string): Promise<RoomJoinResponse> {
  return apiFetch<RoomJoinResponse>(`${roomPath(roomId)}/join`, {
    method: "POST",
  });
}

export function startRoomRound(
  roomId: string,
): Promise<RoomRoundStartResponse> {
  return apiFetch<RoomRoundStartResponse>(`${roomPath(roomId)}/rounds/start`, {
    method: "POST",
  });
}

export function getRoomQuestions(
  roomId: string,
  signal?: AbortSignal,
): Promise<RoomQuestionsResponse> {
  return apiFetch<RoomQuestionsResponse>(
    `${roomPath(roomId)}/rounds/current/questions`,
    {
      signal,
    },
  );
}

export function submitRoomOrderSheet(
  roomId: string,
  round: RoomRoundFence,
  answers: OrderSheetAnswer[],
): Promise<RoomOrderSheetSubmitResponse> {
  return apiFetch<RoomOrderSheetSubmitResponse>(
    `${roomPath(roomId)}/rounds/current/order-sheet`,
    {
      method: "POST",
      body: { answers, round_id: round.round_id, round_no: round.round_no },
    },
  );
}

export async function getRoomNoResultsSuggestions(
  roomId: string,
  round: RoomRoundFence,
  answers: OrderSheetAnswer[],
): Promise<RoomNoResultsData> {
  const result = await apiFetch<ApiResponse<Partial<RoomNoResultsData>>>(
    `${roomPath(roomId)}/rounds/current/order-sheet/no-results`,
    {
      method: "POST",
      body: { answers, round_id: round.round_id, round_no: round.round_no },
    },
  );
  if (result?.success !== true || !result.data) {
    throw new ApiError(
      result?.message || "답변 변경 제안을 불러오지 못했습니다.",
      0,
    );
  }
  return {
    suggested_answer_changes: Array.isArray(result.data.suggested_answer_changes)
      ? result.data.suggested_answer_changes
      : [],
    can_review_my_answers: result.data.can_review_my_answers !== false,
  };
}

export function submitRoomVotes(
  roomId: string,
  round: Pick<RoomRound, "round_id" | "round_no" | "vote_round_no">,
  candidateIds: number[],
): Promise<RoomVoteSubmitResponse> {
  return apiFetch<RoomVoteSubmitResponse>(
    `${roomPath(roomId)}/rounds/current/votes`,
    {
      method: "POST",
      body: {
        candidate_ids: candidateIds,
        vote_round_no: round.vote_round_no,
        round_id: round.round_id,
        round_no: round.round_no,
      },
    },
  );
}

export function decideRoomRound(
  roomId: string,
  round: Pick<RoomRound, "round_id" | "decision_version">,
  action: RoomDecisionAction,
): Promise<RoomRoundCommandResponse> {
  return apiFetch<RoomRoundCommandResponse>(
    `${roomPath(roomId)}/rounds/current/decision`,
    {
      method: "POST",
      body: {
        action,
        decision_version: round.decision_version,
        round_id: round.round_id,
      },
    },
  );
}

export function setRoomSearchOrigin(
  roomId: string,
  roundId: number,
  origin: RoomSearchOrigin,
): Promise<RoomSearchOriginResponse> {
  return apiFetch<RoomSearchOriginResponse>(
    `${roomPath(roomId)}/rounds/${roundId}/nearby/location`,
    {
      method: "PUT",
      body: { latitude: origin.latitude, longitude: origin.longitude },
    },
  );
}

export async function leaveRoom(
  roomId: string,
): Promise<RoomMemberLeaveResponse> {
  const userId = getCurrentUserId();
  if (userId === null) {
    handleUnauthorized();
    throw new ApiError("로그인이 필요합니다.", 401);
  }
  return apiFetch<RoomMemberLeaveResponse>(
    `${roomPath(roomId)}/members/${userId}`,
    { method: "DELETE" },
  );
}

export function deleteRoom(roomId: string): Promise<RoomDeleteResponse> {
  return apiFetch<RoomDeleteResponse>(roomPath(roomId), { method: "DELETE" });
}

export function roomSocketUrl(roomId: string) {
  const wsBaseUrl =
    process.env.EXPO_PUBLIC_WS_BASE_URL ??
    getApiBaseUrl().replace(/^http/, "ws");
  return `${wsBaseUrl}/ws/rooms/${encodeURIComponent(roomId)}`;
}

export function parseRoomId(data: string): string | null {
  return data.match(ROOM_ID)?.[0].toLowerCase() ?? null;
}
