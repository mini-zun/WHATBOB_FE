import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import {
  Stack, router, useLocalSearchParams, usePathname, useRootNavigationState,
} from "expo-router";

import { RoomStatus } from "@/components/order-sheet/RoomStatus";
import { RoomSessionProvider, useRoomSession } from "@/contexts/RoomSessionContext";
import { getRoomDestination } from "@/lib/room-flow";
import { parseRoomId } from "@/lib/rooms";

const CLOSED_MESSAGES = {
  HOST_LEFT: "방장이 방을 나가서 방이 종료됐어요.",
  HOST_DISCONNECTED: "방장의 연결이 끊겨서 방이 종료됐어요.",
  EXPIRED: "방의 유효 시간이 지났어요.",
  UNKNOWN: "방이 종료됐어요.",
};

function RoomNavigator() {
  const { room, loading, error, closedReason, refresh, requestExit, exitOpen, leaving, left } = useRoomSession();
  const pathname = usePathname();
  const root = useRootNavigationState();
  const pendingNavigation = useRef<string | null>(null);

  useEffect(() => {
    if (!root?.key || !room || loading || error || closedReason || exitOpen || leaving || left) return;
    const destination = getRoomDestination(room, pathname);
    if (!destination) {
      pendingNavigation.current = null;
      return;
    }
    const transition = `${pathname}:${destination}:${room.current_round?.round_id ?? "none"}`;
    if (pendingNavigation.current === transition) return;
    pendingNavigation.current = transition;
    if (destination.endsWith("/ordersheet")) {
      router.replace({ pathname: "/room/[roomId]/ordersheet", params: { roomId: room.room_id } });
    } else {
      router.replace({ pathname: "/room/[roomId]", params: { roomId: room.room_id } });
    }
  }, [root?.key, room, pathname, loading, error, closedReason, exitOpen, leaving, left]);

  const message = closedReason ? CLOSED_MESSAGES[closedReason] : error?.message;
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      {message && !exitOpen && !left && (
        <View style={StyleSheet.absoluteFill}>
          <RoomStatus message={message} onExit={requestExit}
            onRetry={closedReason || error?.status === 403 ? undefined : refresh} />
        </View>
      )}
    </View>
  );
}

export default function RoomLayout() {
  const params = useLocalSearchParams<{
    roomId: string | string[];
  }>();

  const rawRoomId = Array.isArray(params.roomId)
    ? params.roomId[0]
    : params.roomId;
  const roomId = parseRoomId(rawRoomId ?? "") ?? undefined;

  return (
    <RoomSessionProvider key={roomId ?? "invalid-room"} roomId={roomId}>
      <RoomNavigator />
    </RoomSessionProvider>
  );
}
