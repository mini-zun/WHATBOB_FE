import { useEffect } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { Colors, Fonts } from "@/constants/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function PrivacyPolicyPopUp({ visible, onClose }: Props) {
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
        entering={FadeIn.duration(100)}
        exiting={FadeOut.duration(100)}
        style={styles.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        entering={FadeIn.duration(130)}
        exiting={FadeOut.duration(100)}
        style={[styles.popUpBack]}
      >
        <View style={styles.textSec}>
          <Text style={styles.title}>개인정보 처리방침</Text>
          <Text style={styles.titleDesc}>
            왓밥은 이용자의 개인정보를 소중히 다루며 관련 법령을 준수합니다.
          </Text>
        </View>
        <Pressable style={styles.exitButton} onPress={onClose}>
          <Text
            style={{
              fontFamily: Fonts.bodySemiBold,
              fontSize: 20,
              color: Colors.white,
            }}
          >
            확인했어요
          </Text>
        </Pressable>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  popUpBack: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.white,
    borderRadius: 20,
    justifyContent: "space-between",
    marginVertical: 68,
    marginHorizontal: 20,
    paddingTop: 33,
    paddingBottom: 30,
  },
  textSec: {
    marginLeft: 28,
    marginRight: 19,
  },
  title: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 26,
    marginBottom: 14,
  },
  titleDesc: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 18,
    color: Colors.textBrown,
    marginBottom: 32,
  },
  exitButton: {
    backgroundColor: Colors.buttonLightBrown,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    height: 47,
    marginLeft: 33,
    marginRight: 33,
  },
});
