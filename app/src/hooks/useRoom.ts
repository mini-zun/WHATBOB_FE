import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { ApiError, getAccessToken, handleUnauthorized } from "@/lib/api";
import {
  getRoom,
  roomSocketUrl,
  type RoomCloseReason,
  type RoomDetail,
  type RoomSocketMessage,
} from "@/lib/rooms";

const PING_INTERVAL = 25000;
const MAX_RECONNECT_DELAY = 10000;
const GONE_STATUSES = [404, 410];

const SOCKET_CLOSE = {
  roomClosed: 4000,
  memberLeft: 4001,
  unauthorized: 4401,
  forbidden: 4403,
  notFound: 4404,
};

export type RoomClosedReason = RoomCloseReason | "UNKNOWN";

function parseMessage(data: unknown): RoomSocketMessage | null {
  if (typeof data !== "string") return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function useRoom(roomId: string | undefined) {
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [closedReason, setClosedReason] = useState<RoomClosedReason | null>(
    null,
  );
  const refreshRef = useRef<() => void>(() => {});
  const isMember = room?.is_member ?? false;

  useEffect(() => {
    if (!roomId) return;

    const controller = new AbortController();
    let inFlight = false;
    let queued = false;
    let loaded = false;

    const load = async () => {
      if (inFlight) {
        queued = true;
        return;
      }
      inFlight = true;
      try {
        setRoom(await getRoom(roomId, controller.signal));
        setError(null);
        loaded = true;
      } catch (e) {
        if (controller.signal.aborted) return;
        const apiError =
          e instanceof ApiError
            ? e
            : new ApiError("방 정보를 불러오지 못했습니다.", 0);
        // 보고 있던 방이 사라진 경우는 에러가 아니라 종료로 처리한다
        if (loaded && GONE_STATUSES.includes(apiError.status)) {
          setClosedReason((prev) => prev ?? "UNKNOWN");
        } else {
          setError(apiError);
        }
      } finally {
        inFlight = false;
        if (!controller.signal.aborted) {
          setLoading(false);
          if (queued) {
            queued = false;
            load();
          }
        }
      }
    };

    refreshRef.current = load;
    load();

    return () => {
      controller.abort();
      refreshRef.current = () => {};
    };
  }, [roomId]);

  // 멤버만 소켓에 접속할 수 있다. 화면 포커스와 무관하게 유지해야
  // 방장이 다른 화면에 있어도 연결이 끊긴 것으로 처리되지 않는다
  useEffect(() => {
    if (!roomId || !isMember) return;

    let socket: WebSocket | null = null;
    let pingTimer: ReturnType<typeof setInterval> | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let retries = 0;
    let stopped = false;

    const connect = () => {
      const token = getAccessToken();
      if (!token) {
        handleUnauthorized();
        return;
      }
      clearTimeout(retryTimer);

      const ws = new WebSocket(roomSocketUrl(roomId));
      socket = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "auth", access_token: token }));
      };

      ws.onmessage = (event) => {
        const message = parseMessage(event.data);
        if (!message) return;
        if (message.type === "connection.ready") {
          retries = 0;
          clearInterval(pingTimer);
          pingTimer = setInterval(() => {
            ws.send(JSON.stringify({ type: "ping" }));
          }, PING_INTERVAL);
          refreshRef.current();
        } else if (message.type === "room.updated") {
          refreshRef.current();
        } else if (message.type === "room.closed") {
          stopped = true;
          setClosedReason(message.reason);
        }
      };

      ws.onclose = (event) => {
        clearInterval(pingTimer);
        if (socket !== ws) return;
        socket = null;
        if (stopped) return;

        switch (event.code) {
          case SOCKET_CLOSE.roomClosed:
          case SOCKET_CLOSE.notFound:
            stopped = true;
            setClosedReason((prev) => prev ?? "UNKNOWN");
            return;
          case SOCKET_CLOSE.unauthorized:
            stopped = true;
            handleUnauthorized();
            return;
          case SOCKET_CLOSE.memberLeft:
          case SOCKET_CLOSE.forbidden:
            stopped = true;
            refreshRef.current();
            return;
        }

        if (AppState.currentState !== "active") return;
        const delay = Math.min(1000 * 2 ** retries, MAX_RECONNECT_DELAY);
        retries += 1;
        retryTimer = setTimeout(connect, delay);
      };
    };

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && !socket && !stopped) connect();
    });
    connect();

    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      clearInterval(pingTimer);
      subscription.remove();
      socket?.close();
    };
  }, [roomId, isMember]);

  const refresh = useCallback(() => refreshRef.current(), []);

  return { room, error, loading, refresh, closedReason };
}
