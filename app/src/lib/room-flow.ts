import type { RoomDetail } from "./rooms";

function isCurrentParticipant(room: RoomDetail): boolean {
  const round = room.current_round;
  return Boolean(room.is_member && room.status !== "CLOSED" && round &&
    room.viewer_state?.round_id === round.round_id);
}

export function isAnsweringRound(room: RoomDetail): boolean {
  const status = room.current_round?.status;
  return isCurrentParticipant(room) &&
    (status === "ANSWERING" || status === "ANSWERING_PAUSED");
}

export function isVotingRound(room: RoomDetail): boolean {
  const status = room.current_round?.status;
  return isCurrentParticipant(room) &&
    (status === "VOTING" || status === "VOTING_PAUSED");
}

export function isResultRound(room: RoomDetail): boolean {
  return isCurrentParticipant(room) && room.current_round?.status === "RESULT";
}

export function getRoomDestination(room: RoomDetail, pathname: string): string | null {
  const lobby = `/room/${room.room_id}`;
  const questions = `${lobby}/ordersheet`;
  const vote = `${lobby}/vote`;
  const result = `${lobby}/result`;
  const path = pathname.replace(/\/$/, "");
  const round = room.current_round;
  if (isVotingRound(room)) return path === vote ? null : vote;
  if (isResultRound(room)) return path === result ? null : result;
  if (path === lobby && isAnsweringRound(room) &&
      round?.status === "ANSWERING" &&
      !room.viewer_state?.has_submitted_order_sheet) return questions;
  if ((path === vote || path === result) && isAnsweringRound(room)) return questions;
  if ((path === questions || path === vote || path === result) && room.is_member &&
      (!round || round.status === "CANCELLED")) return lobby;
  return null;
}

export function getRoomScreenPathname(destination: string) {
  if (destination.endsWith("/ordersheet")) return "/room/[roomId]/ordersheet" as const;
  if (destination.endsWith("/vote")) return "/room/[roomId]/vote" as const;
  if (destination.endsWith("/result")) return "/room/[roomId]/result" as const;
  return "/room/[roomId]" as const;
}

export function keepLatestRoom(previous: RoomDetail | null, next: RoomDetail): RoomDetail {
  return previous?.room_id === next.room_id && previous.state_version > next.state_version
    ? previous : next;
}
