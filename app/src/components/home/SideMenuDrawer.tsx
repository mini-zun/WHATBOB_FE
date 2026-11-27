import { useCallback, useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Pressable,
  StyleSheet,
  ScrollView,
  Text,
  TextInput,
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
import { useToast } from "@/components/common/Toast";
import { PopUpBox } from "./PopUpMessage";
import { ProfileImageSheet } from "./ProfileImageSheet";
import {
  getNicknameErrorMessage,
  getProfileImageErrorMessage,
  resetMyProfileImage,
  resolveProfileImageUrl,
  syncSessionUser,
  updateMyNickname,
  uploadMyProfileImage,
  validateNickname,
  NICKNAME_MAX_LENGTH,
} from "@/lib/profile_edit";
import {
  pickProfileImage,
  prepareProfileImage,
  type ProfileImageSource,
} from "@/lib/profile_image_picker";

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

  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [nicknameSaving, setNicknameSaving] = useState(false);

  const nicknameSavingRef = useRef(false);

  const showToast = useToast();

  const startNicknameEdit = (currentNickname: string) => {
    if (logoutOpen || isLogoutInProgress()) return;
    setNicknameDraft(currentNickname);
    setIsEditingNickname(true);
  };

  const cancelNicknameEdit = useCallback(() => {
    if (nicknameSavingRef.current) return;
    setIsEditingNickname(false);
    setNicknameDraft("");
  }, []);

  const handleSaveNickname = async () => {
    if (nicknameSavingRef.current) return;

    const validationError = validateNickname(nicknameDraft);
    if (validationError) {
      showToast(validationError);
      return;
    }

    nicknameSavingRef.current = true;
    setNicknameSaving(true);
    try {
      const updated = await updateMyNickname(nicknameDraft);
      syncSessionUser(updated, "nickname");
      setIsEditingNickname(false);
      showToast("닉네임을 변경했어요.");
    } catch (error) {
      showToast(getNicknameErrorMessage(error));
    } finally {
      nicknameSavingRef.current = false;
      setNicknameSaving(false);
    }
  };

  useEffect(() => {
    if (!visible) cancelNicknameEdit();
  }, [visible, cancelNicknameEdit]);

  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [cameraSettingsOpen, setCameraSettingsOpen] = useState(false);
  const [profileImageBusy, setProfileImageBusy] = useState(false);
  const [profileImageOverride, setProfileImageOverride] = useState<
    string | null | undefined
  >(undefined);

  const profileImageBusyRef = useRef(false);

  const handleOpenProfileSheet = () => {
    if (
      logoutOpen ||
      isLogoutInProgress() ||
      isEditingNickname ||
      profileImageBusyRef.current
    ) {
      return;
    }
    setProfileSheetOpen(true);
  };

  const closeProfileSheet = useCallback(() => setProfileSheetOpen(false), []);

  const handleSelectProfileImage = async (source: ProfileImageSource) => {
    setProfileSheetOpen(false);
    if (profileImageBusyRef.current) return;

    let picked: Awaited<ReturnType<typeof pickProfileImage>>;
    try {
      picked = await pickProfileImage(source);
    } catch {
      showToast("사진을 불러오지 못했어요. 다시 시도해 주세요.");
      return;
    }

    if (picked.status === "canceled") return;

    if (picked.status === "permission-denied") {
      if (picked.canAskAgain) {
        showToast("카메라 권한을 허용해야 촬영할 수 있어요.");
      } else {
        setCameraSettingsOpen(true);
      }
      return;
    }

    profileImageBusyRef.current = true;
    setProfileImageBusy(true);
    try {
      const prepared = await prepareProfileImage(
        picked.uri,
        picked.width,
        picked.height,
      );
      setProfileImageOverride(prepared);
      const updated = await uploadMyProfileImage(prepared);
      syncSessionUser(updated, "profile_image");
      showToast("프로필 사진을 변경했어요.");
    } catch (error) {
      setProfileImageOverride(undefined);
      showToast(getProfileImageErrorMessage(error));
    } finally {
      profileImageBusyRef.current = false;
      setProfileImageBusy(false);
    }
  };

  const handleResetProfileImage = async () => {
    setProfileSheetOpen(false);
    if (profileImageBusyRef.current) return;

    profileImageBusyRef.current = true;
    setProfileImageBusy(true);
    setProfileImageOverride(null);
    try {
      const updated = await resetMyProfileImage();
      syncSessionUser(updated, "profile_image");
      showToast("기본 이미지로 변경했어요.");
    } catch (error) {
      setProfileImageOverride(undefined);
      showToast(getProfileImageErrorMessage(error));
    } finally {
      profileImageBusyRef.current = false;
      setProfileImageBusy(false);
    }
  };

  const handleOpenCameraSettings = () => {
    setCameraSettingsOpen(false);
    Linking.openSettings();
  };

  const closeCameraSettings = useCallback(
    () => setCameraSettingsOpen(false),
    [],
  );

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
    if (cameraSettingsOpen) {
      closeCameraSettings();
      return;
    }

    if (profileSheetOpen) {
      closeProfileSheet();
      return;
    }

    if (logoutOpen) {
      handleCancelLogout();
      return;
    }

    if (isEditingNickname) {
      cancelNicknameEdit();
      return;
    }

    if (
      profileImageBusyRef.current ||
      logoutBusyRef.current ||
      isLogoutInProgress()
    ) {
      return;
    }
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

  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setPendingPath(null);
      setProfileImageOverride(undefined);
    }
  }

  useEffect(() => {
    if (!visible || !pendingPath || logoutOpen || isLogoutInProgress()) return;
    onClose();
    router.push(pendingPath);
  }, [visible, pendingPath, onClose, logoutOpen]);

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

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (cameraSettingsOpen) {
        closeCameraSettings();
        return true;
      }

      if (profileSheetOpen) {
        closeProfileSheet();
        return true;
      }

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

      if (isEditingNickname) {
        if (!nicknameSavingRef.current) cancelNicknameEdit();
        return true;
      }

      if (!profileImageBusyRef.current && !isLogoutInProgress()) onClose();
      return true;
    });
    return () => sub.remove();
  }, [
    visible,
    onClose,
    logoutOpen,
    logoutCanCancel,
    isEditingNickname,
    cancelNicknameEdit,
    profileSheetOpen,
    closeProfileSheet,
    cameraSettingsOpen,
    closeCameraSettings,
  ]);

  if (!visible) return null;

  const user =
    Platform.OS === "web" && typeof window !== "undefined"
      ? readWebSession()?.user
      : null;
  const nickname = user?.nickname?.trim() || "사용자";
  const remoteProfileImage = resolveProfileImageUrl(user?.profile_image);
  const displayedProfileImage =
    profileImageOverride === undefined
      ? remoteProfileImage
      : profileImageOverride;
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
        <View
          style={[styles.profileBack, isKakaoLinked && { marginBottom: 0 }]}
        >
          <Pressable
            style={styles.closeButton}
            onPress={handleDrawerClose}
            accessibilityRole="button"
            accessibilityLabel="사이드 메뉴 닫기"
          >
            <Feather name="arrow-right" size={26} color={Colors.textBrown} />
          </Pressable>
          <Pressable
            style={styles.profileEditLayout}
            onPress={handleOpenProfileSheet}
            disabled={profileImageBusy}
            accessibilityRole="button"
            accessibilityLabel="프로필 사진 변경"
            accessibilityState={{ disabled: profileImageBusy, busy: profileImageBusy }}
          >
            <View style={styles.profileIconSec}>
              {displayedProfileImage ? (
                <Image
                  source={{ uri: displayedProfileImage }}
                  contentFit="cover"
                  style={styles.profileImageFill}
                />
              ) : (
                <Image
                  source={require("@/assets/images/profile_default.png")}
                  contentFit="contain"
                  style={styles.profileDefaultIcon}
                />
              )}
              {profileImageBusy && (
                <View style={styles.profileImageOverlay}>
                  <ActivityIndicator color={Colors.white} />
                </View>
              )}
            </View>
            <Image
              source={require("@/assets/images/profile_edit_btn.png")}
              contentFit="contain"
              style={styles.profileEditButton}
            />
          </Pressable>
          <View style={styles.userNameSec}>
            {isEditingNickname ? (
              <>
                <TextInput
                  value={nicknameDraft}
                  onChangeText={setNicknameDraft}
                  autoFocus
                  maxLength={NICKNAME_MAX_LENGTH}
                  returnKeyType="done"
                  onSubmitEditing={handleSaveNickname}
                  submitBehavior="submit"
                  autoCorrect={false}
                  autoCapitalize="none"
                  editable={!nicknameSaving}
                  underlineColorAndroid="transparent"
                  placeholder="닉네임 입력"
                  placeholderTextColor="rgba(106, 57, 7, 0.4)"
                  style={styles.nicknameInput}
                />

                <Pressable
                  style={styles.editButtonBack}
                  onPress={handleSaveNickname}
                  accessibilityRole="button"
                  accessibilityLabel="닉네임 수정"
                >
                  <Feather name="check" color={Colors.cardGreen} size={23} />
                </Pressable>

                <Pressable
                  style={styles.editButtonBack}
                  onPress={cancelNicknameEdit}
                  accessibilityRole="button"
                  accessibilityLabel="닉네임 수정"
                >
                  <Feather name="x" color={Colors.red} size={23} />
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.userName} numberOfLines={1}>
                  {nickname} 님
                </Text>

                <Pressable
                  onPress={() => startNicknameEdit(user?.nickname ?? "")}
                >
                  <Image
                    source={require("@/assets/images/edit_pen.png")}
                    contentFit="contain"
                    style={styles.nameEditPen}
                  />
                </Pressable>
              </>
            )}
          </View>
          <Text style={styles.profileDesc}>오늘도 맛있는 하루 되세요!</Text>
        </View>

        <ScrollView
          style={styles.menuScroll}
          contentContainerStyle={styles.menuScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {isKakaoLinked && (
            <View style={styles.kakaoCard}>
              <Image
                source={require("@/assets/images/kakao_icon.png")}
                contentFit="contain"
                style={styles.kakaoLogo}
                accessible={false}
              />
              <View>
                <Text style={styles.kakaoAccountTitle}>카카오 계정</Text>
                <Text style={styles.kakaoAccountStatus}>연결됨</Text>
              </View>
            </View>
          )}
          <Text style={styles.menuTitle}>나의 활동</Text>
          <View style={styles.menuStart} />
          <MenuItem
            menuTitle="못 먹는 음식 수정"
            menuImage={require("@/assets/images/menu_non_preference.png")}
            onPress={handleToNonPreferenceFood}
          />
          <MenuItem
            menuTitle="기록 모아보기"
            menuImage={require("@/assets/images/history.png")}
            onPress={handleToFoodHistory}
          />

          {canLinkKakao && (
            <MenuItem
              menuTitle="카카오 계정 연결"
              menuImage={require("@/assets/images/kakao_connect.png")}
              onPress={handleToKakaoLink}
            />
          )}
          <View style={styles.menuEnd} />

          <Text style={styles.menuTitle}>약관 및 정보</Text>
          <View style={styles.menuStart} />
          <MenuItem
            menuTitle="개인정보 처리방침"
            menuImage={require("@/assets/images/menu_privacy.png")}
            onPress={() => {
              if (logoutOpen || isLogoutInProgress()) return;
              setPrivacyOpen(true);
            }}
          />
          <MenuItem
            menuTitle="앱 버전"
            menuImage={require("@/assets/images/info.png")}
            isVersion
          />
          <View style={styles.menuEnd} />
        </ScrollView>
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
      <ProfileImageSheet
        visible={profileSheetOpen}
        canReset={remoteProfileImage !== null}
        onSelectCamera={() => handleSelectProfileImage("camera")}
        onSelectLibrary={() => handleSelectProfileImage("library")}
        onReset={handleResetProfileImage}
        onClose={closeProfileSheet}
      />
      <PopUpBox
        visible={cameraSettingsOpen}
        message={"카메라 권한이 꺼져 있어요.\n설정에서 허용해 주세요."}
        leftButtonText="설정으로 이동"
        rightButtonText="취소"
        onLeftButtonClick={handleOpenCameraSettings}
        onRightButtonClick={closeCameraSettings}
      />
    </>
  );
}

type MenuItemProps = {
  menuIcon?: ComponentProps<typeof Feather>["name"];
  menuImage?: ComponentProps<typeof Image>["source"];
  menuIconColor?: keyof typeof Colors;
  menuTitle: string;
  onPress?: () => void;
  isVersion?: boolean;
};

function MenuItem({
  menuIcon,
  menuImage,
  menuIconColor = "maintext",
  menuTitle,
  onPress,
  isVersion = false,
}: MenuItemProps) {
  return (
    <Pressable style={styles.menuButton} onPress={onPress} disabled={isVersion}>
      <View style={styles.menuItemLayout}>
        <View style={styles.menuItemIntro}>
          {menuImage ? (
            <Image
              source={menuImage}
              contentFit="contain"
              style={styles.menuIconImage}
              accessible={false}
            />
          ) : menuIcon ? (
            <Feather name={menuIcon} size={23} color={Colors[menuIconColor]} />
          ) : null}
          <Text style={styles.menuItem}>{menuTitle}</Text>
          {isVersion && (
            <Text style={styles.menuVersion}>{`v${APP_VERSION}`}</Text>
          )}
        </View>
        {!isVersion && (
          <Image
            source={require("@/assets/images/arrow.png")}
            contentFit="contain"
            style={styles.menuArrow}
            accessible={false}
          />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
  },
  panel: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: "77.61%",
    maxWidth: 500,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 30,
    borderBottomLeftRadius: 30,
  },
  profileBack: {
    backgroundColor: Colors.backOrange,
    width: "100%",
    borderTopLeftRadius: 30,
    paddingLeft: 24,
    paddingTop: 61,
    paddingBottom: 21,
    marginBottom: 12,
  },
  profileEditLayout: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "flex-end",
    marginLeft: -7,
    marginBottom: 13,
  },
  profileIconSec: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  profileImageFill: {
    width: "100%",
    height: "100%",
  },
  profileDefaultIcon: {
    width: 50,
    height: 50,
  },
  profileImageOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  profileEditButton: {
    width: 31,
    height: 31,
    transform: [{ translateX: -22 }],
  },
  userNameSec: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    marginBottom: 7,
    minHeight: 32,
    paddingRight: 20,
  },
  userName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 22,
  },
  nameEditPen: {
    width: 15,
    height: 15,
  },
  nicknameInput: {
    flex: 1,
    minWidth: 0,
    height: 32,
    padding: 0,
    includeFontPadding: false,
    textAlignVertical: "center",
    fontFamily: Fonts.bodySemiBold,
    fontSize: 22,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.textBrown,
    outlineWidth: 0,
  },
  editButtonBack: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: Colors.background,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  profileDesc: {
    fontFamily: Fonts.bodyDesc,
    fontSize: 19.73,
    color: Colors.textBrown,
  },
  menuStart: {
    borderColor: Colors.backOrange,
    borderTopWidth: 1,
  },
  menuEnd: {
    marginBottom: 36,
  },
  menuTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 19.74,
    color: "rgba(106, 57, 7, 0.8)",
    marginLeft: 18,
    marginBottom: 12,
  },
  menuButton: {
    width: "100%",
    minHeight: 50,
    justifyContent: "center",
    borderColor: Colors.backOrange,
    borderBottomWidth: 1,
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
  menuIconImage: {
    width: 26,
    height: 26,
  },
  menuArrow: {
    width: 28 / 3,
    height: 32 / 3,
    flexShrink: 0,
  },
  menuItem: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 16,
    color: Colors.textBrown,
    alignItems: "center",
  },
  menuVersion: {
    fontFamily: Fonts.bodyDesc,
    fontSize: 17.27,
    color: Colors.textBrown,
    flexShrink: 0,
  },
  kakaoLogo: {
    width: 28,
    height: 28,
    flexShrink: 0,
  },
  accountActions: {
    marginTop: "auto",
    flexShrink: 0,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  logoutButton: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  logoutButtonDisabled: {
    opacity: 0.45,
  },
  logoutText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  closeButton: {
    position: "absolute",
    top: 29,
    right: 16,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  kakaoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 19,
    minHeight: 47,
    marginHorizontal: 6,
    marginTop: 12,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.backOrange,
    borderRadius: 12,
  },
  kakaoAccountTitle: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12.71,
    color: Colors.maintext,
  },
  kakaoAccountStatus: {
    marginTop: 2,
    fontFamily: Fonts.bodyMedium,
    fontSize: 9.39,
    color: Colors.textBrown,
  },
  menuScroll: {
    flex: 1,
    minHeight: 0,
  },
  menuScrollContent: {
    paddingBottom: 12,
  },
});
