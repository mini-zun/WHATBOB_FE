import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Image } from "expo-image";
import Animated, {
  interpolate,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
} from "react-native-reanimated";

import { Colors, Fonts } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";

import { scheduleOnRN } from "react-native-worklets";

const handleBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/home");
};

export default function PickWithFriendScreen() {
  const [isPicking, setIsPicking] = useState(false);
  const [topOpen, setTopOpen] = useState(false);
  const [foodShow, setFoodShow] = useState(false);

  const rotation = useSharedValue(0);
  const translateY = useSharedValue(0);

  const openCap = () => {
    setTopOpen(true);
    handleMoveUp();
  };

  const showResult = () => {
    setFoodShow(true);
  };

  const startAnimation = () => {
    setIsPicking(true);
    setTopOpen(false);
    setFoodShow(false);
    translateY.value = 0;
    rotation.value = withSequence(
      withTiming(10, { duration: 100 }),
      withRepeat(withTiming(-10, { duration: 200 }), 10, true),
      withTiming(0, { duration: 300 }, (finished) => {
        if (finished) scheduleOnRN(openCap);
      }),
    );
  };

  const handleMoveUp = () => {
    translateY.value = withTiming(-100, { duration: 1000 }, (finished) => {
      if (finished) {
        scheduleOnRN(setIsPicking, false);
        scheduleOnRN(setFoodShow, true);
      }
    });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const animatedCap = useAnimatedStyle(() => {
    return {
      opacity: interpolate(translateY.value, [0, -100], [1, 0]),
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Feather name="arrow-left" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>아무거나 골라줘</Text>
      </View>
      <ScrollView contentContainerStyle={styles.page} bounces={false}>
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.overlay,
              animatedStyle,
              { opacity: topOpen ? 0 : 1 },
            ]}
          >
            <Image
              source={require("@/assets/images/random_dish.png")}
              contentFit="contain"
              style={styles.dish}
            />
          </Animated.View>
          <Image
            source={require("@/assets/images/random_dish_bottom.png")}
            contentFit="contain"
            style={[styles.dish, styles.overlay, { opacity: topOpen ? 1 : 0 }]}
          />
          <Animated.View style={[styles.overlay, animatedCap]}>
            <Image
              source={require("@/assets/images/random_dish_top.png")}
              contentFit="contain"
              style={[styles.dish, { opacity: topOpen ? 1 : 0 }]}
            />
          </Animated.View>
          <Image
            source={require("@/assets/images/login-icon.png")}
            contentFit="contain"
            style={[
              styles.resultImage,
              styles.overlay,
              { opacity: foodShow ? 1 : 0 },
            ]}
          />
          <Pressable
            style={styles.pickButton}
            disabled={isPicking}
            onPress={startAnimation}
          >
            <Text style={styles.pickButtonText}>아무거나 골라줘!</Text>
          </Pressable>
        </View>
      </ScrollView>
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
    backgroundColor: "#F0EFE3",
    justifyContent: "center",
    alignItems: "center",
  },
  page: {
    flexGrow: 1,
    paddingHorizontal: 23,
    paddingVertical: 16,
    alignItems: "center",
    paddingTop: 129,
  },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 352,
    // justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    position: "absolute",
  },
  dish: {
    width: 284,
    height: 202,
  },
  resultImage: {
    width: 284,
    height: 202,
    transform: [{ translateX: 15 }, { translateY: -50 }],
  },
  pickButton: {
    backgroundColor: "#F0EFE3",
    borderRadius: 100,
    width: "100%",
    height: 70,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 148,

    transform: [{ translateY: 300 }],
  },
  pickButtonText: {
    fontFamily: Fonts.nonpreferencefood,
    fontSize: 20,
  },
});
