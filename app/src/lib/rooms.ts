import { ApiError, apiFetch, getApiBaseUrl, getCurrentUserId, handleUnauthorized } from "./api";

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
