import { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import {
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutRight,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { Image } from "expo-image";
import Constants from "expo-constants";

import { Colors, Fonts } from "@/constants/theme";
import { PrivacyPolicyPopUp } from "./PrivacyPolicyPop";
import { readWebSession } from "@/lib/web-auth";
import { LogoutConfirmPopUp } from "./LogoutConfirmPop";
import { completeLogout, LogoutRestartRequiredError } from "@/lib/logout";
import { isLogoutInProgress } from "@/lib/auth_operation";
import { ApiError } from "@/lib/api";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const APP_VERSION = Constants.expoConfig?.version ?? "";

export function SideMenuDrawer({ visible, onClose }: Props) {
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [pendingPath, setPendingPath] = useState<Href | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState<string>();
  const [logoutCanCancel, setLogoutCanCancel] = useState(true);

  const logoutBusyRef = useRef(false);

  const handleOpenLogout = () => {
    if (logoutBusyRef.current) return;

    const needsRecovery = isLogoutInProgress();

    setLogoutError(
      needsRecovery
        ? "로그아웃 상태 확인이 필요해요.\n다시 시도해 주세요."
        : undefined,
    );
    setLogoutCanCancel(!needsRecovery);
    setLogoutOpen(true);
  };

  const handleCancelLogout = () => {
    if (logoutBusyRef.current || isLogoutInProgress() || !logoutCanCancel) {
      return;
    }

    setLogoutOpen(false);
    setLogoutError(undefined);
  };

  const handleDrawerClose = () => {
    if (logoutOpen) {
      handleCancelLogout();
      return;
    }

    if (logoutBusyRef.current || isLogoutInProgress()) return;
    onClose();
  };

  const handleConfirmLogout = async () => {
    if (logoutBusyRef.current) return;
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    logoutBusyRef.current = true;
    setLogoutBusy(true);
    setLogoutError(undefined);
    setLogoutCanCancel(false);

    try {
      await completeLogout();
      window.location.replace("/home");
    } catch (error) {
      if (error instanceof LogoutRestartRequiredError) {
        window.location.replace("/home");
        return;
      }
      const needsRecovery = isLogoutInProgress();

      setLogoutCanCancel(!needsRecovery);

      if (
        error instanceof ApiError &&
        error.code === "ROOM_PARTICIPATION_ACTIVE"
      ) {
        setLogoutError(
          "참여 중인 방이 있어요.\n방 참여를 종료한 뒤 시도해 주세요.",
        );
      } else if (needsRecovery) {
        setLogoutError(
          "로그아웃 상태 확인이 필요해요.\n연결을 확인하고 다시 시도해 주세요.",
        );
      } else {
        setLogoutError("로그아웃하지 못했어요.\n잠시 후 다시 시도해 주세요.");
      }
    } finally {
      logoutBusyRef.current = false;
      setLogoutBusy(false);
    }
  };

  useEffect(() => {
    if (!pendingPath || logoutOpen || isLogoutInProgress()) return;
    onClose();
    router.push(pendingPath);
    setPendingPath(null);
  }, [pendingPath, onClose, logoutOpen]);

  const handleToNonPreferenceFood = () => {
    if (logoutOpen || isLogoutInProgress()) return;
    setPendingPath("/non_preference_food");
  };

  const handleToKakaoLink = () => {
    if (logoutOpen || isLogoutInProgress()) return;
    setPendingPath("/login");
  };

  const handleToFoodHistory = () => {
    if (logoutOpen || isLogoutInProgress()) return;
    setPendingPath("/food_history");
  };

  const handleToProfileEdit = () => {
    setPendingPath("/profile_edit");
  };

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (logoutOpen) {
        if (
          !logoutBusyRef.current &&
          !isLogoutInProgress() &&
          logoutCanCancel
        ) {
          setLogoutOpen(false);
          setLogoutError(undefined);
        }

        return true;
      }

      if (!isLogoutInProgress()) onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose, logoutOpen, logoutCanCancel]);

  if (!visible) return null;

  const user =
    Platform.OS === "web" && typeof window !== "undefined"
      ? readWebSession()?.user
      : null;
  const nickname = user?.nickname?.trim() || "사용자";
  const profileimage = user?.profile_image?.trim();
  const canLinkKakao = !!user && user.kakao_id === null;
  const isKakaoLinked = typeof user?.kakao_id === "number";

  return (
    <>
      <Animated.View
        entering={FadeIn.duration(80)}
        exiting={pendingPath ? undefined : FadeOut.duration(80)}
        style={styles.backdrop}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleDrawerClose}
        />
      </Animated.View>

      <Animated.View
        entering={SlideInRight.duration(130)}
        exiting={pendingPath ? undefined : SlideOutRight.duration(80)}
        style={[styles.panel]}
        pointerEvents={logoutOpen ? "none" : "auto"}
      >
        <View style={styles.profileBack}>
          <View style={styles.profileEditLayout}>
            <Image
              source={
                profileimage
                  ? { uri: profileimage }
                  : require("@/assets/images/empty_user_icon.png")
              }
              contentFit="cover"
              style={styles.profileIconSec}
            />
            <Pressable>
              <Image
                source={require("@/assets/images/profile_edit_btn.png")}
                contentFit="contain"
                style={styles.profileEditButton}
              />
            </Pressable>
          </View>
          <View style={styles.userNameSec}>
            <Text style={styles.userName} numberOfLines={1}>
              {nickname} 님
            </Text>
            {isKakaoLinked && (
              <Image
                source={require("@/assets/images/kakao_login_kr_small.png")}
                contentFit="contain"
                style={styles.kakaoLogo}
                accessible
                accessibilityLabel="카카오 계정 연결됨"
              />
            )}
            <Pressable>
              <Image
                source={require("@/assets/images/edit_pen.png")}
                contentFit="contain"
                style={styles.nameEditPen}
              />
            </Pressable>
          </View>
          <Text style={styles.profileDesc}>오늘도 맛있는 하루 되세요!</Text>
        </View>
        <Text style={styles.menuTitle}>나의 활동</Text>
        <View style={styles.menuStart} />
        <MenuItem
          menuTitle="못 먹는 음식 수정"
          menuIcon="slash"
          menuIconColor="red"
          onPress={handleToNonPreferenceFood}
        />
        <MenuItem
          menuTitle="기록 모아보기"
          menuIcon="calendar"
          menuIconColor="orange"
          onPress={handleToFoodHistory}
        />

        {canLinkKakao && (
          <MenuItem
            menuTitle="카카오 계정 연결"
            menuIcon="link"
            menuIconColor="darkYellow"
            onPress={handleToKakaoLink}
          />
        )}
        <View style={styles.menuEnd} />

        <Text style={styles.menuTitle}>약관 및 정보</Text>
        <View style={styles.menuStart} />
        <MenuItem
          menuTitle="개인정보 처리방침"
          menuIcon="lock"
          menuIconColor="darkYellow"
          onPress={() => {
            if (logoutOpen || isLogoutInProgress()) return;
            setPrivacyOpen(true);
          }}
        />
        <MenuItem
          menuTitle="앱 버전"
          menuIcon="info"
          menuIconColor="blue"
          isVersion
        />
        <View style={styles.menuEnd} />
        {isKakaoLinked && (
          <View style={styles.accountActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="로그아웃"
              accessibilityState={{
                disabled: logoutBusy || Platform.OS !== "web",
                busy: logoutBusy,
              }}
              disabled={logoutBusy || Platform.OS !== "web"}
              onPress={handleOpenLogout}
              style={[
                styles.logoutButton,
                logoutBusy && styles.logoutButtonDisabled,
              ]}
            >
              <Text style={styles.logoutText}>로그아웃</Text>
            </Pressable>
          </View>
        )}
      </Animated.View>
      <PrivacyPolicyPopUp
        visible={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
      />
      <LogoutConfirmPopUp
        visible={logoutOpen}
        busy={logoutBusy}
        errorMessage={logoutError}
        canCancel={logoutCanCancel}
        onCancel={handleCancelLogout}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
}

type MenuItemProps = {
  menuIcon: ComponentProps<typeof Feather>["name"];
  menuIconColor?: keyof typeof Colors;
  menuTitle: string;
  onPress?: () => void;
  isVersion?: boolean;
};

function MenuItem({
  menuIcon,
  menuIconColor = "maintext",
  menuTitle,
  onPress,
  isVersion = false,
}: MenuItemProps) {
  return (
    <Pressable style={styles.menuButton} onPress={onPress} disabled={isVersion}>
      <View style={styles.menuItemLayout}>
        <View style={styles.menuItemIntro}>
          <Feather
            name={menuIcon}
            size={23}
            color={Colors[menuIconColor]}
          ></Feather>
          <Text style={styles.menuItem}>{menuTitle}</Text>
        </View>
        <Text
          style={[
            styles.menuItem,
            { fontFamily: isVersion ? Fonts.bodyDesc : Fonts.bodySemiBold },
          ]}
        >
          {isVersion ? `v${APP_VERSION}` : ">"}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  panel: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: "80%",
    maxWidth: 500,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  profileBack: {
    backgroundColor: Colors.backOrange,
    width: "100%",
    borderTopLeftRadius: 20,
    paddingLeft: 24,
    paddingTop: 61,
    paddingBottom: 21,
    marginBottom: 71,
  },
  profileEditLayout: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 13,
  },
  profileIconSec: {
    width: 85,
    height: 85,
    borderRadius: 100,
    backgroundColor: Colors.white,
  },
  profileEditButton: {
    width: 31,
    height: 31,
    transform: [{ translateX: -20 }],
  },
  userNameSec: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    marginBottom: 7,
  },
  userName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 22,
  },
  nameEditPen: {
    width: 15,
    height: 15,
  },
  profileDesc: {
    fontFamily: Fonts.bodyDesc,
    fontSize: 19,
    color: Colors.textBrown,
  },
  menuStart: {
    borderColor: Colors.backOrange,
    borderTopWidth: 1,
  },
  menuEnd: {
    borderColor: Colors.backOrange,
    borderTopWidth: 1,
    marginBottom: 36,
  },
  menuTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 19,
    color: Colors.textBrown,
    marginLeft: 18,
    marginBottom: 12,
  },
  menuButton: {
    width: "100%",
    borderColor: Colors.backOrange,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  menuItemLayout: {
    flexDirection: "row",
    paddingLeft: 18,
    paddingRight: 30,
    justifyContent: "space-between",
    alignItems: "center",
  },
  menuItemIntro: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  menuItem: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    color: Colors.textBrown,
    alignItems: "center",
  },
  kakaoLogo: {
    width: 70,
    height: 26,
    flexShrink: 0,
  },
  accountActions: {
    marginTop: "auto",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  logoutButton: {
    alignSelf: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  logoutButtonDisabled: {
    opacity: 0.45,
  },
  logoutText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    color: Colors.textBrown,
  },
});
