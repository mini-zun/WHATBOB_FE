import { useRef, useState } from "react";

import { decideRoomRound, type RoomDecisionAction, type RoomDetail } from "@/lib/rooms";

export function useRoomDecision(room: RoomDetail | null, refresh: () => void) {
  const round = room?.current_round ?? null;
  const isPaused = round?.status === "ANSWERING_PAUSED" || round?.status === "VOTING_PAUSED";
  const required = Boolean(room?.viewer_state?.requires_host_decision && isPaused);
  const [deciding, setDeciding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const decide = async (action: RoomDecisionAction) => {
    if (!room || !round || !required || inFlight.current) return;
    inFlight.current = true;
    setDeciding(true);
    setError(null);
    try {
      await decideRoomRound(room.room_id, round, action);
    } catch (e) {
      setError(e instanceof Error ? e.message : "진행 여부를 결정하지 못했습니다.");
    } finally {
      inFlight.current = false;
      setDeciding(false);
      refresh();
    }
  };

  return {
    required,
    phase: round?.status ?? null,
    departedMembers: round?.pending_departed_members ?? [],
    decide,
    deciding,
    error,
  };
}
