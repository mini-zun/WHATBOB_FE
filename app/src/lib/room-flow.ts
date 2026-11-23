import type { RoomDetail } from "./rooms";

export function isAnsweringRound(room: RoomDetail): boolean {
  const round = room.current_round;
  return Boolean(room.is_member && room.status !== "CLOSED" && round &&
    (round.status === "ANSWERING" || round.status === "ANSWERING_PAUSED") &&
    room.viewer_state?.round_id === round.round_id);
}

export function getRoomDestination(room: RoomDetail, pathname: string): string | null {
  const lobby = `/room/${room.room_id}`;
  const questions = `${lobby}/ordersheet`;
  const path = pathname.replace(/\/$/, "");
  if (path === lobby && isAnsweringRound(room) &&
      room.current_round?.status === "ANSWERING" &&
      !room.viewer_state?.has_submitted_order_sheet) return questions;
  if (path === questions && room.is_member &&
      (!room.current_round || room.current_round.status === "CANCELLED")) return lobby;
  return null;
}

export function keepLatestRoom(previous: RoomDetail | null, next: RoomDetail): RoomDetail {
  return previous?.room_id === next.room_id && previous.state_version > next.state_version
    ? previous : next;
}
