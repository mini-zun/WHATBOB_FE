import { createContext, useContext, type ReactNode } from "react";

import { useRoom } from "@/hooks/useRoom";

type RoomSession = ReturnType<typeof useRoom>;

const RoomSessionContext = createContext<RoomSession | null>(null);

type Props = {
  roomId: string | undefined;
  children: ReactNode;
};

export function RoomSessionProvider({ roomId, children }: Props) {
  const session = useRoom(roomId);

  return (
    <RoomSessionContext.Provider value={session}>
      {children}
    </RoomSessionContext.Provider>
  );
}

export function useRoomSession() {
  const session = useContext(RoomSessionContext);

  if (!session) {
    throw new Error(
      "useRoomSession은 RoomSessionProvider 안에서 사용해야 합니다.",
    );
  }

  return session;
}
