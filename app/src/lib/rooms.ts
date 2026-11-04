import { ApiError, apiFetch } from "./api";

export type RoomMember = {
  user_id: number;
  nickname: string | null;
  profile_image: string | null;
  role: string;
  joined_at: string;
};

export type RoomCreateResponse = {
  room_id: string;
  join_url: string;
  host_user_id: number;
  status: string;
  max_members: number;
  created_at: string;
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
  members: RoomMember[];
};

const ROOM_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

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

export function parseRoomId(data: string): string | null {
  return data.match(ROOM_ID)?.[0].toLowerCase() ?? null;
}
