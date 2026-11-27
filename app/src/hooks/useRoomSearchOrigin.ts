import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/api";
import { getCurrentLocation } from "@/lib/location";
import { ROOM_ERROR_CODE, setRoomSearchOrigin, type RoomDetail } from "@/lib/rooms";

type RegisterState = {
  roundId: number;
  status: "registering" | "done" | "error";
  error?: string;
};

export function useRoomSearchOrigin(room: RoomDetail | null, refresh: () => void) {
  const round = room?.current_round ?? null;
  const roundId = round?.status === "RESULT" ? round.round_id : null;
  const isHost = room?.my_role === "HOST";
  const [state, setState] = useState<RegisterState | null>(null);
  const current = state?.roundId === roundId ? state : null;
  const ready = Boolean(roundId && (round?.nearby_location_ready || current?.status === "done"));
  const inFlight = useRef(false);
  const attempted = useRef<number | null>(null);
  const roomId = room?.room_id;

  const register = useCallback(async () => {
    if (!roomId || !roundId || !isHost || ready || inFlight.current) return false;
    inFlight.current = true;
    attempted.current = roundId;
    setState({ roundId, status: "registering" });
    try {
      const origin = await getCurrentLocation();
      await setRoomSearchOrigin(roomId, roundId, origin);
      setState({ roundId, status: "done" });
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.code === ROOM_ERROR_CODE.nearbyLocationAlreadySet) {
        setState({ roundId, status: "done" });
        return true;
      }
      setState({
        roundId,
        status: "error",
        error: e instanceof Error ? e.message : "방장 위치를 등록하지 못했어요.",
      });
      return false;
    } finally {
      inFlight.current = false;
      refresh();
    }
  }, [roomId, roundId, isHost, ready, refresh]);

  useEffect(() => {
    if (!roundId || !isHost || ready || attempted.current === roundId) return;
    void register();
  }, [roundId, isHost, ready, register]);

  return {
    ready,
    isHost,
    registering: current?.status === "registering",
    error: current?.status === "error" ? current.error ?? null : null,
    register,
  };
}
