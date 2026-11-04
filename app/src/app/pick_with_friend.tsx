import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Colors, Fonts } from "@/constants/theme";
import { ApiError } from "@/lib/api";
import { createRoom } from "@/lib/rooms";
import { Feather } from "@expo/vector-icons";

const handleBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/home");
};

export default function PickWithFriendScreen() {
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreateRoom = async () => {
    if (creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const room = await createRoom();
      router.push(`/room/${room.room_id}`);
    } catch (e) {
      setCreateError(
        e instanceof ApiError ? e.message : "방을 만들지 못했습니다.",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = () => {
    router.push("/scan_room");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Feather name="arrow-left" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>친구와 같이 고르기</Text>
      </View>
      <ScrollView contentContainerStyle={styles.page} bounces={false}>
        <View style={styles.content}>
          <Text style={styles.bodyTitle}>{`방을 만들고\n링크를 보내세요`}</Text>
        </View>
      </ScrollView>

      <View style={styles.bottomLayout}>
        {createError && <Text style={styles.errorText}>{createError}</Text>}
        <Pressable
          style={[styles.makeRoomBtn, creating && styles.disabled]}
          onPress={handleCreateRoom}
          disabled={creating}
        >
          <Text style={styles.makeRoomBtnText}>
            {creating ? "만드는 중..." : "방 만들기"}
          </Text>
        </Pressable>
        <Pressable
          style={styles.enterRoomBtn}
          onPress={handleJoinRoom}
          disabled={creating}
        >
          <Text style={styles.enterRoomBtnText}>방 참여하기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
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
  bodyTitle: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 36,
    marginBottom: 47,
  },
  bottomLayout: {
    width: "100%",
    gap: 10,
    alignSelf: "center",
    marginBottom: 28,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  makeRoomBtn: {
    backgroundColor: Colors.textBrown,
    borderRadius: 100,
    width: "100%",
    maxWidth: 348,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  makeRoomBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
    color: Colors.white,
  },
  enterRoomBtn: {
    borderRadius: 100,
    borderColor: Colors.textBrown,
    borderWidth: 3,
    width: "100%",
    maxWidth: 348,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  enterRoomBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
    color: Colors.textBrown,
  },
  errorText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: Colors.red,
    textAlign: "center",
  },
  disabled: {
    opacity: 0.5,
  },
});
