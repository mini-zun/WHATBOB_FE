import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { ApiError, getAccessToken, handleUnauthorized } from "@/lib/api";
import { keepLatestRoom } from "@/lib/room-flow";
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
const REFRESH_INTERVAL = 5000;

function isForeground() {
  return AppState.currentState !== "background" && AppState.currentState !== "inactive" &&
    (typeof document === "undefined" || document.visibilityState === "visible");
}

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
    const message = JSON.parse(data);
    return message && typeof message === "object" && typeof message.type === "string" ? message : null;
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
  const terminalRef = useRef(false);
  const latestVersionRef = useRef(0);
  const isMember = room?.is_member ?? false;

  useEffect(() => {
    if (!roomId) return;

    const controller = new AbortController();
    let inFlight = false;
    let queued = false;

    const load = async () => {
      if (terminalRef.current || controller.signal.aborted) return;
      if (inFlight) {
        queued = true;
        return;
      }
      inFlight = true;
      try {
        const next = await getRoom(roomId, controller.signal);
        if (controller.signal.aborted || terminalRef.current) return;
        if (next.state_version < latestVersionRef.current) return;
        latestVersionRef.current = next.state_version;
        setRoom((previous) => keepLatestRoom(previous, next));
        setError(null);
      } catch (e) {
        if (controller.signal.aborted || terminalRef.current) return;
        const apiError =
          e instanceof ApiError
            ? e
            : new ApiError("방 정보를 불러오지 못했습니다.", 0);
        // 보고 있던 방이 사라진 경우는 에러가 아니라 종료로 처리한다
        if (GONE_STATUSES.includes(apiError.status)) {
          terminalRef.current = true;
          setRoom(null);
          setClosedReason((prev) => prev ?? "UNKNOWN");
        } else {
          if (apiError.status === 403) {
            terminalRef.current = true;
            setRoom(null);
          }
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

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void load();
    });
    const onVisible = () => {
      if (isForeground()) void load();
    };
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisible);

    return () => {
      controller.abort();
      subscription.remove();
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisible);
      refreshRef.current = () => {};
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !isMember || closedReason) return;
    const timer = setInterval(() => {
      if (isForeground() && !terminalRef.current) refreshRef.current();
    }, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [roomId, isMember, closedReason]);

  useEffect(() => {
    if (!roomId || !isMember || closedReason || terminalRef.current) return;

    let socket: WebSocket | null = null;
    let pingTimer: ReturnType<typeof setInterval> | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let retries = 0;
    let stopped = false;

    const connect = () => {
      if (stopped || terminalRef.current || socket) return;
      const token = getAccessToken();
      if (!token) {
        handleUnauthorized();
        return;
      }
      clearTimeout(retryTimer);

      const ws = new WebSocket(roomSocketUrl(roomId));
      socket = ws;

      ws.onopen = () => {
        if (stopped || socket !== ws) return;
        ws.send(JSON.stringify({ type: "auth", access_token: token }));
      };

      ws.onmessage = (event) => {
        if (stopped || socket !== ws || terminalRef.current) return;
        const message = parseMessage(event.data);
        if (!message) return;
        if ("room_id" in message && message.room_id !== roomId) return;
        if (message.type === "connection.ready") {
          retries = 0;
          clearInterval(pingTimer);
          pingTimer = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping" }));
            }
          }, PING_INTERVAL);
          refreshRef.current();
        } else if (message.type === "room.updated") {
          if (Number.isInteger(message.state_version) && message.state_version! >= 0) {
            latestVersionRef.current = Math.max(latestVersionRef.current, message.state_version!);
          }
          refreshRef.current();
        } else if (message.type === "room.closed") {
          stopped = true;
          terminalRef.current = true;
          clearInterval(pingTimer);
          setRoom(null);
          setClosedReason(["HOST_LEFT", "HOST_DISCONNECTED", "EXPIRED"].includes(message.reason)
            ? message.reason : "UNKNOWN");
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
            terminalRef.current = true;
            setRoom(null);
            setClosedReason((prev) => prev ?? "UNKNOWN");
            return;
          case SOCKET_CLOSE.unauthorized:
            stopped = true;
            handleUnauthorized();
            return;
          case SOCKET_CLOSE.memberLeft:
          case SOCKET_CLOSE.forbidden:
            stopped = true;
            terminalRef.current = true;
            setRoom(null);
            setError(new ApiError("이 방에 참여할 권한이 없습니다.", 403));
            return;
        }

        if (!isForeground()) return;
        const delay = Math.min(1000 * 2 ** retries, MAX_RECONNECT_DELAY);
        retries += 1;
        retryTimer = setTimeout(connect, delay);
      };
    };

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && !socket && !stopped) connect();
    });
    const onVisible = () => {
      if (isForeground() && !socket && !stopped) connect();
    };
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisible);
    connect();

    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      clearInterval(pingTimer);
      subscription.remove();
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisible);
      socket?.close();
    };
  }, [roomId, isMember, closedReason]);

  const refresh = useCallback(() => refreshRef.current(), []);

  return { room, error, loading, refresh, closedReason };
}
