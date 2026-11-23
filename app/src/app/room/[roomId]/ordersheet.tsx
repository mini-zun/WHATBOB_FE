import { useLocalSearchParams } from "expo-router";

import { RoomOrderSheet } from "@/components/order-sheet/RoomOrderSheet";
import { RoomStatus } from "@/components/order-sheet/RoomStatus";
import { useRoomSession } from "@/contexts/RoomSessionContext";
import { isAnsweringRound } from "@/lib/room-flow";
import { parseRoomId } from "@/lib/rooms";

export default function RoomOrderSheetScreen() {
  const params = useLocalSearchParams<{ roomId: string }>();
  const roomId = parseRoomId(params.roomId ?? "");
  const { room, loading, error, closedReason, refresh, requestExit } = useRoomSession();
  if (!roomId) return <RoomStatus message="잘못된 방 주소예요." onExit={requestExit} />;
  if (loading) return <RoomStatus message="방 정보를 불러오는 중이에요." onExit={requestExit} />;
  if (!room || closedReason || (error && error.status === 403)) {
    return <RoomStatus message={closedReason ? "방이 종료됐어요." : error?.message ?? "방에 접근할 수 없습니다."}
      onExit={requestExit} onRetry={!closedReason && error?.status !== 403 ? refresh : undefined} />;
  }
  if (!room.is_member) return <RoomStatus message="방 참가자만 주문서를 작성할 수 있어요." onExit={requestExit} />;
  const round = room.current_round;
  if (!round || round.status === "CANCELLED") {
    return <RoomStatus message="대기실로 이동하고 있어요." onExit={requestExit} />;
  }
  if (room.viewer_state?.has_submitted_order_sheet) {
    return <RoomStatus message="이미 주문서를 제출했습니다. 다른 참가자의 진행을 기다려 주세요." onExit={requestExit} />;
  }
  if (!isAnsweringRound(room)) {
    const message = round.status === "RESULT" ? "최종 결과가 확정됐습니다." :
      round.status === "VOTING" || round.status === "VOTING_PAUSED" ? "메뉴 투표 단계입니다." :
      "현재 라운드의 주문서에 접근할 수 없습니다.";
    return <RoomStatus message={message} onExit={requestExit} />;
  }
  return <RoomOrderSheet key={round.round_id} roomId={roomId} roundId={round.round_id}
    roundStatus={round.status} onRefreshRoom={refresh} onExit={requestExit} />;
}
