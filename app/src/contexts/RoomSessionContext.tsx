import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { View } from "react-native";
import { router, useNavigation } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";

import { PopUpBox } from "@/components/home/PopUpMessage";
import { useRoom } from "@/hooks/useRoom";
import { ApiError } from "@/lib/api";
import { deleteRoom, leaveRoom } from "@/lib/rooms";

type RoomSession = ReturnType<typeof useRoom> & {
  requestExit: () => void;
  exitOpen: boolean;
  leaving: boolean;
  left: boolean;
};

const RoomSessionContext = createContext<RoomSession | null>(null);

type Props = {
  roomId: string | undefined;
  children: ReactNode;
};

export function RoomSessionProvider({ roomId, children }: Props) {
  const session = useRoom(roomId);
  const navigation = useNavigation();
  const [exitOpen, setExitOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [left, setLeft] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const leavingRef = useRef(false);
  const pendingExit = useRef<(() => void) | null>(null);

  const isHost = session.room?.my_role === "HOST";
  const shouldConfirmExit = Boolean(
    session.room?.is_member && !session.closedReason && !left,
  );

  usePreventRemove(shouldConfirmExit || (leaving && !left), ({ data }) => {
    if (pendingExit.current || leavingRef.current) return;
    pendingExit.current = () => navigation.dispatch(data.action);
    setLeaveError(null);
    setExitOpen(true);
  });

  const requestExit = () => {
    if (pendingExit.current || leavingRef.current) return;
    if (!shouldConfirmExit) {
      router.replace("/pick_with_friend");
      return;
    }
    pendingExit.current = () => router.replace("/pick_with_friend");
    setLeaveError(null);
    setExitOpen(true);
  };

  const cancelExit = () => {
    if (leavingRef.current) return;
    pendingExit.current = null;
    setExitOpen(false);
    setLeaveError(null);
  };

  const confirmExit = async () => {
    if (!roomId || !pendingExit.current || leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    setLeaveError(null);

    try {
      if (!session.closedReason && session.error?.status !== 403) {
        if (isHost) await deleteRoom(roomId);
        else await leaveRoom(roomId);
      }
    } catch (error) {
      const alreadyGone = error instanceof ApiError &&
        (error.status === 404 || error.status === 410);
      if (!alreadyGone) {
        leavingRef.current = false;
        setLeaving(false);
        setLeaveError(error instanceof Error ? error.message : "방을 나가지 못했습니다.");
        return;
      }
    }

    setLeft(true);
  };

  useEffect(() => {
    if (!left) return;
    const navigate = pendingExit.current;
    pendingExit.current = null;
    navigate?.();
  }, [left]);

  return (
    <RoomSessionContext.Provider value={{ ...session, requestExit, exitOpen, leaving, left }}>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }} pointerEvents={exitOpen ? "none" : "auto"}>
          {children}
        </View>
        {exitOpen && (
          <PopUpBox
            visible
            message={leaveError ?? (isHost
              ? "방을 나가시겠습니까?\n방장이 나가면 방이 종료됩니다."
              : "방을 나가시겠습니까?")}
            leftButtonText={leaving ? "나가는 중…" : "예"}
            rightButtonText="아니요"
            leftDisabled={leaving}
            rightDisabled={leaving}
            closeDisabled={leaving}
            onLeftButtonClick={() => void confirmExit()}
            onRightButtonClick={cancelExit}
          />
        )}
      </View>
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
