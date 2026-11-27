import { PopUpBox } from "@/components/home/PopUpMessage";
import { useRoomDecision } from "@/hooks/useRoomDecision";
import type { RoomDetail } from "@/lib/rooms";

type Props = {
  room: RoomDetail | null;
  refresh: () => void;
};

export function HostDecisionPop({ room, refresh }: Props) {
  const { required, phase, departedMembers, decide, deciding, error } =
    useRoomDecision(room, refresh);

  if (!required) return null;

  const names = departedMembers
    .map((member) => member.nickname ?? "참여자")
    .join(", ");
  const stage = phase === "VOTING_PAUSED" ? "투표를" : "주문서 작성을";
  const message = error ?? `${names || "참여자"}님이 나갔어요.\n${stage} 계속할까요?`;

  return (
    <PopUpBox
      visible
      message={message}
      leftButtonText={deciding ? "처리 중…" : "계속하기"}
      rightButtonText="그만하기"
      leftDisabled={deciding}
      rightDisabled={deciding}
      closeDisabled
      onLeftButtonClick={() => void decide("CONTINUE")}
      onRightButtonClick={() => void decide("CANCEL")}
    />
  );
}
