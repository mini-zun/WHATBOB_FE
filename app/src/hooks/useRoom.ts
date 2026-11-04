import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { AppState } from "react-native";

import { ApiError } from "@/lib/api";
import { getRoom, type RoomDetail } from "@/lib/rooms";

const POLL_INTERVAL = 2000;
const STOP_STATUSES = [401, 403, 404];

export function useRoom(roomId: string | undefined) {
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshRef = useRef<() => void>(() => {});

  useFocusEffect(
    useCallback(() => {
      if (!roomId) return;

      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      let inFlight = false;
      let queued = false;
      let stopped = false;

      const load = async () => {
        if (stopped) return;
        if (inFlight) {
          queued = true;
          return;
        }
        clearTimeout(timer);
        inFlight = true;
        try {
          setRoom(await getRoom(roomId, controller.signal));
          setError(null);
        } catch (e) {
          if (controller.signal.aborted) return;
          const apiError =
            e instanceof ApiError
              ? e
              : new ApiError("방 정보를 불러오지 못했습니다.", 0);
          setError(apiError);
          if (STOP_STATUSES.includes(apiError.status)) stopped = true;
        } finally {
          inFlight = false;
          if (!controller.signal.aborted) {
            setLoading(false);
            if (!stopped && AppState.currentState === "active") {
              timer = setTimeout(load, queued ? 0 : POLL_INTERVAL);
            }
            queued = false;
          }
        }
      };

      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") load();
        else clearTimeout(timer);
      });

      refreshRef.current = () => {
        stopped = false;
        load();
      };
      load();

      return () => {
        controller.abort();
        clearTimeout(timer);
        subscription.remove();
        refreshRef.current = () => {};
      };
    }, [roomId]),
  );

  const refresh = useCallback(() => refreshRef.current(), []);

  return { room, error, loading, refresh };
}
