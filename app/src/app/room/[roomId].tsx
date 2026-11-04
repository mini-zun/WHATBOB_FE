import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
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

import { Colors, Fonts } from "@/constants/theme";
import { useRoom } from "@/hooks/useRoom";
import { ApiError } from "@/lib/api";
import {
  joinRoom,
  parseRoomId,
  type RoomDetail,
  type RoomMember,
} from "@/lib/rooms";

const handleBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/pick_with_friend");
};

function getErrorTitle(error: ApiError | null) {
  if (error?.status === 404) return "존재하지 않는 방이에요.";
  return error?.message ?? "방 정보를 불러오지 못 했습니다.";
}

export default function RoomScreen() {
  const params = useLocalSearchParams<{ roomId: string }>();
  const roomId = parseRoomId(params.roomId ?? "") ?? undefined;
  const { room, error, loading, refresh } = useRoom(roomId);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isAllPicked, setIsAllPicked] = useState(false);

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

  const renderBody = () => {
    if (!roomId) return <Message title="잘못된 방 주소에요." />;
    if (!room) {
      if (loading) {
        return (
          <ActivityIndicator color={Colors.textBrown} style={styles.loading} />
        );
      }
      return (
        <Message
          title={getErrorTitle(error)}
          actionLabel="다시 시도"
          onAction={refresh}
        />
      );
    }
    if (room.is_member) {
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
    if (room.is_full) {
      return (
        <>
          <Message title="인원이 가득 찼어요" />
          <MemberList room={room} />
        </>
      );
    }
    return (
      <>
        <Text style={styles.bodyTitle}>{`이 방에\n참여할까요?`}</Text>
        <MemberList room={room} />
      </>
    );
  };

  const canJoin = room && !room.is_member && !room.is_full;
  const canStart = room?.is_member && room.member_count >= 2;

  return (
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

      {canJoin && (
        <View style={styles.bottomLayout}>
          {joinError && <Text style={styles.errorText}>{joinError}</Text>}
          <Pressable
            style={[styles.primaryBtn, joining && styles.disabled]}
            onPress={handleJoin}
            disabled={joining}
          >
            <Text style={styles.primaryBtnText}>
              {joining ? "참여하는 중..." : "참여하기"}
            </Text>
          </Pressable>
        </View>
      )}
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
  );
}

type MessageProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

function Message({ title, actionLabel, onAction }: MessageProps) {
  return (
    <View style={styles.message}>
      <Text style={styles.messageTitle}>{title}</Text>
      {actionLabel && onAction && (
        <Pressable style={styles.retryBtn} onPress={onAction}>
          <Text style={styles.retryBtnText}>{actionLabel}</Text>
        </Pressable>
      )}
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
  message: {
    alignItems: "center",
    gap: 16,
    marginTop: 40,
    marginBottom: 32,
  },
  messageTitle: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 20,
    textAlign: "center",
  },
  retryBtn: {
    borderRadius: 100,
    borderColor: Colors.textBrown,
    borderWidth: 2,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.textBrown,
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
  errorText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: Colors.red,
    textAlign: "center",
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
