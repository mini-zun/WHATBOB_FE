import { useEffect, useState } from "react";
import type { ComponentProps } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutRight,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Constants from "expo-constants";

import { Colors, Fonts } from "@/constants/theme";
import { PrivacyPolicyPopUp } from "./PrivacyPolicyPop";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const APP_VERSION = Constants.expoConfig?.version ?? "";

export function SideMenuDrawer({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();

  const [menuOpen, setMenuOpen] = useState(false);

  const handleToNonPreferenceFood = () => {
    router.replace("/non_preference_food");
  };

  const handleToFoodHistory = () => {
    router.replace("/food_history");
  };

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <>
      <Animated.View
        entering={FadeIn.duration(80)}
        exiting={FadeOut.duration(80)}
        style={styles.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        entering={SlideInRight.duration(130)}
        exiting={SlideOutRight.duration(80)}
        style={[styles.panel]}
      >
        <View style={styles.profileBack}>
          <View style={styles.profileIconSec} />
          <Text style={styles.userName}>USER 님</Text>
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
        <View style={styles.menuEnd} />

        <Text style={styles.menuTitle}>약관 및 정보</Text>
        <View style={styles.menuStart} />
        <MenuItem
          menuTitle="개인정보 처리방침"
          menuIcon="lock"
          menuIconColor="yellow"
          onPress={() => setMenuOpen(true)}
        />
        <MenuItem
          menuTitle="앱 버전"
          menuIcon="info"
          menuIconColor="blue"
          isVersion
        />
        <View style={styles.menuEnd} />
      </Animated.View>
      <PrivacyPolicyPopUp
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
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
    backgroundColor: Colors.background,
    // paddingHorizontal: 24,
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
  profileIconSec: {
    width: 85,
    height: 85,
    borderRadius: 100,
    backgroundColor: Colors.white,
    marginBottom: 13,
  },
  userName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 22,
    marginBottom: 7,
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
});

// { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
