import { Stack, useLocalSearchParams } from "expo-router";

import { RoomSessionProvider } from "@/contexts/RoomSessionContext";
import { parseRoomId } from "@/lib/rooms";

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
      <Stack screenOptions={{ headerShown: false }} />
    </RoomSessionProvider>
  );
}
