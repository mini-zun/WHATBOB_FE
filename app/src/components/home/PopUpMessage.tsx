import { useEffect } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { Colors, Fonts } from "@/constants/theme";

type Props = {
  visible: boolean;
  isOnlyOk?: boolean;
  message: string;
  leftButtonText?: string;
  rightButtonText: string;
  onLeftButtonClick?: () => void;
  onRightButtonClick: () => void;
  onClose?: () => void;
};

export function PopUpBox({
  visible,
  isOnlyOk = false,
  message,
  leftButtonText = "",
  rightButtonText,
  onLeftButtonClick = () => null,
  onRightButtonClick,
  onClose = onRightButtonClick,
}: Props) {
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
        entering={FadeIn.duration(130)}
        exiting={FadeOut.duration(80)}
        style={[styles.popUpBox]}
      >
        <View style={styles.content}>
          <Text style={styles.textStyle}>{message}</Text>
        </View>
        <View style={styles.popUpBottomLayout}>
          {!isOnlyOk && (
            <>
              <Pressable style={styles.popUpbutton} onPress={onLeftButtonClick}>
                <Text style={styles.textStyle}>{leftButtonText}</Text>
              </Pressable>
              <View style={styles.buttonDivider} />
            </>
          )}
          <Pressable style={styles.popUpbutton} onPress={onRightButtonClick}>
            <Text style={styles.textStyle}>{rightButtonText}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  popUpBox: {
    alignSelf: "center",
    position: "absolute",
    width: "100%",
    maxWidth: 335,
    top: "50%",
    transform: [{ translateY: -87 }],
    marginHorizontal: 29,
    height: 174,
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: Colors.textSecondary,
    alignItems: "stretch",
    overflow: "hidden",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  textStyle: {
    fontFamily: Fonts.nonpreferencefood,
    fontSize: 20,
    textAlign: "center",
  },
  popUpBottomLayout: {
    flexDirection: "row",
    height: 53,
  },
  buttonDivider: {
    width: 1,
    height: "100%",
    backgroundColor: Colors.textSecondary,
  },
  popUpbutton: {
    flex: 1,
    backgroundColor: Colors.translucentGray,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});
