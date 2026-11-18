import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

import { PopUpBox } from "@/components/home/PopUpMessage";
import { Colors, Fonts } from "@/constants/theme";
import { useRoom, type RoomClosedReason } from "@/hooks/useRoom";
import { ApiError } from "@/lib/api";
import {
  deleteRoom,
  joinRoom,
  leaveRoom,
  parseRoomId,
  type RoomDetail,
  type RoomMember,
} from "@/lib/rooms";

const handleBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/pick_with_friend");
};

const GONE_STATUSES = [404, 409, 410];

const CLOSED_MESSAGES: Record<RoomClosedReason, string> = {
  HOST_LEFT: "방장이 방을 나가서\n방이 사라졌어요.",
  HOST_DISCONNECTED: "방장의 연결이 끊겨서\n방이 사라졌어요.",
  EXPIRED: "방을 만든 지 1시간이 지나\n방이 사라졌어요.",
  UNKNOWN: "방이 사라졌어요.",
};

function getErrorTitle(error: ApiError | null) {
  if (error?.status === 404) return "존재하지 않는 방이에요.";
  if (error?.status === 410) return "이미 사라진 방이에요.";
  return error?.message ?? "방 정보를 불러오지 못 했습니다.";
}

export default function RoomScreen() {
  const params = useLocalSearchParams<{ roomId: string }>();
  const roomId = parseRoomId(params.roomId ?? "") ?? undefined;
  const { room, error, loading, refresh, closedReason } = useRoom(roomId);
  const navigation = useNavigation();
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isAllPicked, setIsAllPicked] = useState(false);
  const [leaveRequest, setLeaveRequest] = useState<{
    action: Parameters<typeof navigation.dispatch>[0];
  } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [left, setLeft] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  // 정적 HTML에는 방 ID가 없으므로 브라우저에 마운트된 뒤에 화면 내용을 정한다
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isHost = room?.my_role === "HOST";
  const shouldInterceptLeave = !!room?.is_member && !closedReason && !left;

  const handleLeaveRoom = async () => {
    if (!roomId || leaving) return;
    setLeaving(true);
    setLeaveError(null);
    try {
      if (isHost) await deleteRoom(roomId);
      else await leaveRoom(roomId);
    } catch (e) {
      const alreadyGone =
        e instanceof ApiError && GONE_STATUSES.includes(e.status);
      if (!alreadyGone) {
        setLeaveError(
          e instanceof ApiError ? e.message : "방을 나가지 못했습니다.",
        );
        setLeaving(false);
        return;
      }
    }
    setLeft(true);
  };

  useEffect(() => {
    if (!shouldInterceptLeave) return;
    return navigation.addListener("beforeRemove", (e) => {
      e.preventDefault();
      setLeaveRequest({ action: e.data.action });
    });
  }, [navigation, shouldInterceptLeave]);

  useEffect(() => {
    if (left && leaveRequest) navigation.dispatch(leaveRequest.action);
  }, [navigation, left, leaveRequest]);

  const handleCancelLeave = () => {
    if (leaving) return;
    setLeaveRequest(null);
    setLeaveError(null);
  };

  const handleJoin = async () => {
    if (!roomId || joining) return;
    setJoining(true);
    setJoinError(null);
    try {
      await joinRoom(roomId);
      refresh();
    } catch (e) {
      setJoinError(
        e instanceof ApiError ? e.message : "방에 참여하지 못했습니다.",
      );
    } finally {
      setJoining(false);
    }
  };

  const getPopUp = () => {
    if (!mounted) return null;
    if (!roomId) {
      return {
        isOnlyOk: true,
        message: "잘못된 방 주소예요.",
        rightButtonText: "확인",
        onRightButtonClick: handleBack,
      };
    }
    if (leaveRequest) {
      return {
        message:
          leaveError ??
          (isHost
            ? "정말로 나가시겠습니까?\n방을 나가면 모두가 굶게돼요😭."
            : "방을 나가시겠습니까?"),
        leftButtonText: leaving ? "나가는 중..." : "예",
        rightButtonText: "아니요",
        onLeftButtonClick: handleLeaveRoom,
        onRightButtonClick: handleCancelLeave,
      };
    }
    if (closedReason) {
      return {
        isOnlyOk: true,
        message: CLOSED_MESSAGES[closedReason] ?? CLOSED_MESSAGES.UNKNOWN,
        rightButtonText: "확인",
        onRightButtonClick: handleBack,
      };
    }
    if (!room) {
      if (loading) return null;
      return {
        message: getErrorTitle(error),
        leftButtonText: "다시 시도",
        rightButtonText: "나가기",
        onLeftButtonClick: refresh,
        onRightButtonClick: handleBack,
      };
    }
    if (room.is_member) return null;
    if (room.is_full) {
      return {
        message: "인원이 가득 찬 방이에요.",
        leftButtonText: "다시 확인",
        rightButtonText: "나가기",
        onLeftButtonClick: refresh,
        onRightButtonClick: handleBack,
      };
    }
    const hostName =
      room.members.find((member) => member.user_id === room.host_user_id)
        ?.nickname ?? "친구";
    return {
      message: joinError ?? `${hostName}님의 방에\n참여하시겠습니까?`,
      leftButtonText: joining ? "참여 중..." : "예",
      rightButtonText: "아니요",
      onLeftButtonClick: handleJoin,
      onRightButtonClick: handleBack,
    };
  };

  const renderBody = () => {
    if (!mounted || (roomId && !room && loading)) {
      return (
        <ActivityIndicator color={Colors.textBrown} style={styles.loading} />
      );
    }
    if (room?.is_member) {
      return (
        <>
          <Text
            style={styles.bodyTitle}
          >{`QR을 보여 주고\n친구를 기다리세요`}</Text>
          <View style={styles.qrBox}>
            <QRCode value={room.join_url} size={200} />
          </View>
          <MemberList room={room} />
        </>
      );
    }
    return (
      <Text style={styles.bodyTitle}>{`방을 만들고\n링크를 보내세요`}</Text>
    );
  };

  const popUp = getPopUp();
  const canStart = room?.is_member && room.member_count >= 2;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Feather name="arrow-left" size={22} />
          </Pressable>
          <Text style={styles.headerTitle}>친구와 같이 고르기</Text>
        </View>
        <ScrollView contentContainerStyle={styles.page} bounces={false}>
          <View style={styles.content}>{renderBody()}</View>
        </ScrollView>

        {room?.is_member && (
          <View style={styles.bottomLayout}>
            <Pressable
              style={[styles.primaryBtn, !canStart && styles.disabled]}
              onPress={() => console.log("각자 고르러 가기 선택됨")}
              disabled={!canStart}
            >
              <Text style={styles.primaryBtnText}>각자 고르러 가기</Text>
            </Pressable>
            <Pressable
              style={[styles.secondaryBtn, !isAllPicked && styles.disabled]}
              onPress={() => console.log("다음 단계로 넘어가기 선택됨")}
              disabled={!isAllPicked}
            >
              <Text style={styles.secondaryBtnText}>다음 단계로 넘어가기</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
      {popUp && <PopUpBox visible {...popUp} />}
    </View>
  );
}

function MemberList({ room }: { room: RoomDetail }) {
  return (
    <>
      <View style={styles.joinedListLayout}>
        <Text style={styles.joinedListTitle}>참여 중</Text>
        <Text style={styles.joinedListTitle}>
          ({room.member_count}/{room.max_members})
        </Text>
        <Image
          source={require("@/assets/images/people_icon.png")}
          contentFit="contain"
          style={styles.joinedListIcon}
        />
      </View>
      <View style={styles.joinedUserListLayout}>
        {room.members.map((member) => (
          <JoinedUser
            key={member.user_id}
            member={member}
            isHost={member.user_id === room.host_user_id}
          />
        ))}
      </View>
    </>
  );
}

type JoinedUserProps = {
  member: RoomMember;
  isHost: boolean;
};

function JoinedUser({ member, isHost }: JoinedUserProps) {
  return (
    <View style={styles.joinedUserLayout}>
      <Image
        source={
          member.profile_image
            ? { uri: member.profile_image }
            : require("@/assets/images/empty_user_icon.png")
        }
        contentFit="cover"
        style={styles.joinedUserListIcon}
      />
      <Text style={styles.joinedUserListText} numberOfLines={1}>
        {member.nickname ?? "이름 없음"}
      </Text>
      {isHost && <Text style={styles.hostBadge}>방장</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    paddingHorizontal: 23,
    paddingTop: 27,
    paddingBottom: 27,
    alignItems: "center",
    gap: 28,
    width: "100%",
    maxWidth: 352 + 23 * 2,
    alignSelf: "center",
  },
  headerTitle: {
    fontFamily: Fonts.nonpreferencefood,
    fontSize: 27,
  },
  backButton: {
    height: 58,
    width: 55,
    borderRadius: 100,
    backgroundColor: Colors.backGrey,
    justifyContent: "center",
    alignItems: "center",
  },
  page: {
    flexGrow: 1,
    paddingHorizontal: 23,
    paddingVertical: 16,
    alignItems: "center",
  },
  content: {
    width: "100%",
    maxWidth: 352,
  },
  loading: {
    marginTop: 80,
  },
  bodyTitle: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 36,
    marginBottom: 32,
  },
  qrBox: {
    alignSelf: "center",
    padding: 16,
    borderRadius: 20,
    backgroundColor: Colors.white,
    marginBottom: 32,
  },
  joinedListLayout: {
    flexDirection: "row",
    gap: 6,
    alignItems: "flex-end",
    marginBottom: 13,
  },
  joinedListTitle: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 18,
    color: Colors.textSecondary,
  },
  joinedListIcon: {
    width: 20,
    height: 16,
  },
  joinedUserListLayout: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    alignItems: "flex-start",
  },
  joinedUserLayout: {
    gap: 3,
    alignItems: "center",
    maxWidth: 56,
  },
  joinedUserListIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  joinedUserListText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  hostBadge: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.textBrown,
  },
  bottomLayout: {
    width: "100%",
    gap: 10,
    alignSelf: "center",
    marginBottom: 28,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  primaryBtn: {
    backgroundColor: Colors.textBrown,
    borderRadius: 100,
    width: "100%",
    maxWidth: 348,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
    color: Colors.white,
  },
  secondaryBtn: {
    borderRadius: 100,
    borderWidth: 3,
    borderColor: Colors.textBrown,
    width: "100%",
    maxWidth: 348,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
    color: Colors.textBrown,
  },
  disabled: {
    opacity: 0.5,
  },
});
