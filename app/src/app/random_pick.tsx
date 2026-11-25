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
  withDelay,
} from "react-native-reanimated";

import { Colors, Fonts } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";

import { scheduleOnRN } from "react-native-worklets";

import { getRandomMenu, type RandomMenu } from "@/lib/random_menu";
import { getAuthRestartMessage } from "@/lib/auth_recovery";

const twinkle = (repeats: number) =>
  withSequence(
    withTiming(1, { duration: 150 }),
    withRepeat(
      withSequence(
        withTiming(0.5, { duration: 200 }),
        withTiming(1, { duration: 200 }),
      ),
      repeats,
    ),
    withTiming(0, { duration: 300 }),
  );

const handleBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/home");
};

export default function PickWithFriendScreen() {
  const [isPicking, setIsPicking] = useState(false);
  const [topOpen, setTopOpen] = useState(false);
  const [foodShow, setFoodShow] = useState(false);
  const [menuOnceShown, setMenuOnceShown] = useState(false);

  const [menu, setMenu] = useState<RandomMenu | null>(null);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [seenFoodList, setSeenFoodList] = useState<string[]>([]);
  const [authRestartMessage, setAuthRestartMessage] = useState<string | null>(
    null,
  );

  const rotation = useSharedValue(0);
  const translateY = useSharedValue(0);
  const starLeft = useSharedValue(0);
  const starRight = useSharedValue(0);

  const openCap = () => {
    setTopOpen(true);
    handleMoveUp();
  };

  const loadMenu = async () => {
    setMenu(null);
    setMenuError(null);
    try {
      const picked = await getRandomMenu([], seenFoodList);
      setMenu(picked);
      setSeenFoodList((prev) => [...prev, picked.name]);
    } catch (e) {
      const restartMessage = getAuthRestartMessage(e);

      if (restartMessage) {
        setAuthRestartMessage(restartMessage);
      }

      setMenuError(
        e instanceof Error ? e.message : "메뉴를 불러오지 못했어요.",
      );
    }
  };

  const startAnimation = () => {
    loadMenu();
    setIsPicking(true);
    setTopOpen(false);
    setFoodShow(false);
    translateY.value = 0;
    starLeft.value = 0;
    starRight.value = 0;
    starLeft.value = twinkle(5);
    starRight.value = withDelay(200, twinkle(4));
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
        scheduleOnRN(setMenuOnceShown, true);
      }
    });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const animatedStarLeft = useAnimatedStyle(() => ({
    opacity: starLeft.value,
    transform: [
      { scale: interpolate(starLeft.value, [0, 1], [0.4, 1]) },
      { rotate: `${interpolate(starLeft.value, [0, 1], [-20, 0])}deg` },
    ],
  }));

  const animatedStarRight = useAnimatedStyle(() => ({
    opacity: starRight.value,
    transform: [
      { scaleX: -1 },
      { scale: interpolate(starRight.value, [0, 1], [0.4, 1]) },
      { rotate: `${interpolate(starRight.value, [0, 1], [-20, 0])}deg` },
    ],
  }));

  const animatedCap = useAnimatedStyle(() => {
    return {
      opacity: interpolate(translateY.value, [0, -100], [1, 0]),
      transform: [{ translateY: translateY.value }],
    };
  });

  if (authRestartMessage) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            gap: 24,
          }}
        >
          <Text accessibilityRole="alert" style={{ textAlign: "center" }}>
            {authRestartMessage}
          </Text>

          <Pressable
            accessibilityRole="button"
            style={styles.pickButton}
            onPress={() => {
              if (typeof window !== "undefined") {
                window.location.replace("/");
              }
            }}
          >
            <Text style={styles.pickButtonText}>인증 다시 시작</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

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
          <View style={styles.stage}>
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
            <Animated.View
              pointerEvents="none"
              style={[styles.star, styles.starLeft, animatedStarLeft]}
            >
              <Image
                source={require("@/assets/images/random_dish_star.png")}
                contentFit="contain"
                style={styles.starImage}
              />
            </Animated.View>
            <Animated.View
              pointerEvents="none"
              style={[styles.star, styles.starRight, animatedStarRight]}
            >
              <Image
                source={require("@/assets/images/random_dish_star.png")}
                contentFit="contain"
                style={styles.starImage}
              />
            </Animated.View>
            <Image
              source={require("@/assets/images/random_dish_bottom.png")}
              contentFit="contain"
              style={[
                styles.dish,
                styles.overlay,
                { opacity: topOpen ? 1 : 0 },
              ]}
            />
            <Animated.View style={[styles.overlay, animatedCap]}>
              <Image
                source={require("@/assets/images/random_dish_top.png")}
                contentFit="contain"
                style={[styles.dish, { opacity: topOpen ? 1 : 0 }]}
              />
            </Animated.View>
            <Image
              source={
                !menuError && menu?.image_url
                  ? menu.image_url
                  : require("@/assets/images/whatbob_icon.png")
              }
              contentFit="contain"
              style={[
                styles.resultImage,
                styles.overlay,
                { opacity: foodShow ? 1 : 0 },
              ]}
            />
          </View>
          <Text style={[styles.resultText, { opacity: foodShow ? 1 : 0 }]}>
            {menuError ?? menu?.name ?? "..."}
          </Text>
          <View style={styles.spacer} />
          <Pressable
            style={[
              styles.selectButton,
              { opacity: isPicking ? 0 : 1 },
              { height: menuOnceShown ? 70 : 0 },
              { marginBottom: menuOnceShown ? 7 : 0 },
            ]}
            onPress={() => console.log("메뉴 선택!")}
            disabled={isPicking || !menu}
          >
            <Text style={styles.selectButtonText}>좋아 이 메뉴로!</Text>
          </Pressable>
          <Pressable
            style={[
              styles.pickButton,
              { opacity: isPicking ? 0 : 1 },
              { marginBottom: menuOnceShown ? 60 : 130 },
            ]}
            onPress={startAnimation}
            disabled={isPicking}
          >
            <Text style={styles.pickButtonText}>
              {menuOnceShown ? "다시! " : "아무거나 골라줘!"}
            </Text>
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
    backgroundColor: Colors.backGrey,
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
  stage: {
    width: 284,
    height: 202,
  },
  overlay: {
    position: "absolute",
  },
  dish: {
    width: 284,
    height: 202,
  },
  star: {
    position: "absolute",
    top: 8,
    opacity: 0,
  },
  starLeft: {
    left: 5,
  },
  starRight: {
    right: 10,
  },
  starImage: {
    width: 57,
    height: 63,
  },
  resultImage: {
    width: 284,
    height: 202,
    transform: [{ translateX: 15 }, { translateY: -50 }],
  },
  resultText: {
    fontFamily: Fonts.nonpreferencefood,
    fontSize: 30,
    marginTop: 25,
  },
  pickButton: {
    backgroundColor: "#F0EFE3",
    borderRadius: 100,
    width: "100%",
    height: 70,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 130,
  },
  pickButtonText: {
    fontFamily: Fonts.nonpreferencefood,
    fontSize: 20,
  },
  spacer: {
    flexGrow: 1,
    minHeight: 48,
  },
  selectButton: {
    backgroundColor: Colors.textBrown,
    borderRadius: 100,
    width: "100%",
    height: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  selectButtonText: {
    fontFamily: Fonts.nonpreferencefood,
    fontSize: 20,
    color: Colors.white,
  },
});
