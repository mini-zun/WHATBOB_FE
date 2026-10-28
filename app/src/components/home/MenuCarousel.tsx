import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  clamp,
  Easing,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { Colors, Fonts } from "@/constants/theme";

export type MenuCard = {
  key: string;
  title: string;
  desc: string;
  sideTitle: string;
  sideDesc: string;
  bg: string;
  image: number;
  sideImage: number;
};

const CARDS: MenuCard[] = [
  {
    key: "random",
    title: "아무거나 골라줘",
    desc: "오늘은 뭐가 나올까?",
    sideTitle: "아무거나\n골라줘",
    sideDesc: "오늘은 뭐가\n나올까?",
    bg: Colors.cardPink,
    image: require("@/assets/images/with_random_icon.png"),
    sideImage: require("@/assets/images/with_random_icon_side.png"),
  },
  {
    key: "form",
    title: "주문서로 골라줘",
    desc: "몇 가지 질문에 답하면\n나에게 딱 맞는 메뉴를 추천해요.",
    sideTitle: "주문서로\n골라줘",
    sideDesc: "몇 가지 질문에\n답하면 나에게\n딱 맞는 메뉴를\n추천해요.",
    bg: Colors.cardYellow,
    image: require("@/assets/images/with_form_icon.png"),
    sideImage: require("@/assets/images/with_form_icon_side.png"),
  },
  {
    key: "bowl",
    title: "그릇에 골라담기",
    desc: "원하는 재료와 취향을 담아\n메뉴를 추천해요.",
    sideTitle: "그릇에\n골라담기",
    sideDesc: "원하는 재료와\n취향을 담아\n메뉴를 추천해요.",
    bg: Colors.cardGreen,
    image: require("@/assets/images/with_bowl_icon.png"),
    sideImage: require("@/assets/images/with_bowl_icon_side.png"),
  },
];

/* ───────── 레이아웃 ───────── */
const BASE_W = 390;
const MAX_STAGE_W = 430;
const CARD_W = 193;
const CARD_H = 248;
const CARD_GAP = 186;
const STAGE_PAD_Y = 16;

const ART_TOP = 7.5;
const ART_H = 108;

const SIDE_SCALE = 0.9;
const SIDE_ANGLE = 10;
const PERSPECTIVE = 800;

const SIDE_COL_W = 86;
const SIDE_SHIFT = 44;

const MAX_FONT_SCALE = 1.2;
const TIMING = { duration: 380, easing: Easing.out(Easing.cubic) };

const mod = (v: number, n: number) => {
  "worklet";
  return ((v % n) + n) % n;
};

const wrap = (v: number, n: number) => {
  "worklet";
  const m = mod(v, n);
  return m > n / 2 ? m - n : m;
};

/* ───────── 카드 ───────── */
type CarouselStyles = ReturnType<typeof createStyles>;

type CardProps = {
  item: MenuCard;
  index: number;
  total: number;
  progress: SharedValue<number>;
  relative: number;
  k: number;
  styles: CarouselStyles;
  onNavigate: (delta: number) => void;
  onStart?: (item: MenuCard) => void;
};

function CarouselCard({
  item,
  index,
  total,
  progress,
  relative,
  k,
  styles,
  onNavigate,
  onStart,
}: CardProps) {
  const cardStyle = useAnimatedStyle(() => {
    const o = wrap(index - progress.get(), total);
    const abs = Math.abs(o);
    return {
      opacity: interpolate(abs, [1, 1.5], [1, 0], Extrapolation.CLAMP),
      zIndex: Math.round(10 - abs * 4),
      transform: [
        { perspective: PERSPECTIVE * k },
        { translateX: o * CARD_GAP * k },
        {
          scale: interpolate(abs, [0, 1], [1, SIDE_SCALE], Extrapolation.CLAMP),
        },
        { rotateY: `${clamp(o, -1, 1) * SIDE_ANGLE}deg` },
      ],
    };
  });

  const centerFaceStyle = useAnimatedStyle(() => {
    const o = wrap(index - progress.get(), total);
    return {
      opacity: interpolate(Math.abs(o), [0, 0.45], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateX: -clamp(o, -1, 1) * SIDE_SHIFT * k }],
    };
  });

  const sideFaceStyle = useAnimatedStyle(() => {
    const o = wrap(index - progress.get(), total);
    return {
      opacity: interpolate(
        Math.abs(o),
        [0.45, 0.9],
        [0, 1],
        Extrapolation.CLAMP,
      ),
      transform: [{ translateX: -clamp(o, -1, 1) * SIDE_SHIFT * k }],
    };
  });

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: wrap(index - progress.get(), total) < 0 ? -1 : 1 }],
  }));

  const isCenter = relative === 0;

  return (
    <Animated.View
      style={[styles.card, { backgroundColor: item.bg }, cardStyle]}
    >
      <Animated.View
        style={[
          styles.centerFace,
          centerFaceStyle,
          { pointerEvents: isCenter ? "box-none" : "none" },
        ]}
        aria-hidden={!isCenter}
      >
        <Image
          style={styles.centerImage}
          source={item.image}
          contentFit="contain"
        />
        <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {item.title}
        </Text>
        <Text style={styles.desc} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {item.desc}
        </Text>
        <Pressable
          role="button"
          aria-label={`${item.title} 시작하기`}
          onPress={() => onStart?.(item)}
          style={({ pressed }) => [styles.startBtn, pressed && styles.pressed]}
        >
          <Text style={styles.startText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            시작하기
          </Text>
          <Feather name="chevron-right" size={15 * k} color={Colors.white} />
        </Pressable>
      </Animated.View>

      <Animated.View
        style={[
          styles.sideFace,
          sideFaceStyle,
          { pointerEvents: isCenter ? "none" : "auto" },
        ]}
        aria-hidden={isCenter}
      >
        <Pressable
          role="button"
          aria-label={`${relative < 0 ? "이전" : "다음"} 메뉴: ${item.title}`}
          onPress={() => onNavigate(relative)}
          style={styles.sideBody}
        >
          {({ pressed }) => (
            <>
              <Image
                style={styles.sideImage}
                source={item.sideImage}
                contentFit="contain"
              />
              <Text
                style={styles.sideTitle}
                maxFontSizeMultiplier={MAX_FONT_SCALE}
              >
                {item.sideTitle}
              </Text>
              <Text
                style={styles.sideDesc}
                maxFontSizeMultiplier={MAX_FONT_SCALE}
              >
                {item.sideDesc}
              </Text>
              <Animated.View
                style={[
                  styles.arrowBtn,
                  pressed && styles.arrowBtnPressed,
                  arrowStyle,
                ]}
              >
                <Feather
                  name="chevron-right"
                  size={20 * k}
                  color={Colors.darkBrown}
                />
              </Animated.View>
            </>
          )}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

export function MenuCarousel({
  initialIndex = 1,
  onStart,
}: {
  initialIndex?: number;
  onStart?: (item: MenuCard) => void;
}) {
  const n = CARDS.length;
  const { width } = useWindowDimensions();
  const k = Math.min(width, MAX_STAGE_W) / BASE_W;
  const styles = useMemo(() => createStyles(k), [k]);
  const gapPx = CARD_GAP * k;

  const progress = useSharedValue(initialIndex);
  const target = useSharedValue(initialIndex);
  const dragStart = useSharedValue(0);
  const [active, setActive] = useState(() => mod(initialIndex, n));

  const goBy = useCallback(
    (delta: number) => {
      if (delta === 0) return;
      const next = target.get() + delta;
      target.set(next);
      progress.set(withTiming(next, TIMING));
      setActive(mod(next, n));
    },
    [n, progress, target],
  );

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onStart(() => {
      cancelAnimation(progress);
      dragStart.set(progress.get());
    })
    .onUpdate((e) => {
      progress.set(dragStart.get() - e.translationX / gapPx);
    })
    .onEnd((e) => {
      const moved = progress.get() - dragStart.get();
      const speed = -e.velocityX / gapPx;
      const dir = Math.sign(moved);
      const commit =
        Math.abs(moved) > 0.3 ||
        (Math.sign(speed) === dir && Math.abs(speed) > 1.5);
      const to = target.get() + (commit ? dir : 0);
      target.set(to);
      progress.set(withTiming(to, TIMING));
      scheduleOnRN(setActive, mod(to, n));
    });

  return (
    <View style={styles.root}>
      <GestureDetector gesture={pan}>
        <View style={styles.stage}>
          {CARDS.map((item, i) => (
            <CarouselCard
              key={item.key}
              item={item}
              index={i}
              total={n}
              progress={progress}
              relative={wrap(i - active, n)}
              k={k}
              styles={styles}
              onNavigate={goBy}
              onStart={onStart}
            />
          ))}
        </View>
      </GestureDetector>

      <View style={styles.dots}>
        {CARDS.map((c, i) => (
          <Pressable
            key={c.key}
            role="button"
            aria-label={c.title}
            aria-selected={i === active}
            hitSlop={8}
            onPress={() => goBy(wrap(i - active, n))}
          >
            <View style={[styles.dot, i === active && styles.dotActive]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const ARROW_BG = "rgba(106, 57, 7, 0.13)";
const ARROW_BG_PRESSED = "rgba(106, 57, 7, 0.24)";

function createStyles(k: number) {
  const s = (v: number) => v * k;

  return StyleSheet.create({
    root: { width: s(BASE_W) },
    stage: {
      width: s(BASE_W),
      height: s(CARD_H + STAGE_PAD_Y * 2),
      overflow: "hidden",
    },
    card: {
      position: "absolute",
      left: s((BASE_W - CARD_W) / 2),
      top: s(STAGE_PAD_Y),
      width: s(CARD_W),
      height: s(CARD_H),
      borderRadius: s(22),
      boxShadow: "0px 10px 10px -10px rgba(0, 0, 0, 0.2)",
    },
    centerFace: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: "center",
      paddingTop: s(ART_TOP),
      paddingBottom: s(18),
      paddingHorizontal: s(10),
    },
    centerImage: { width: s(CARD_W), height: s(ART_H), flexShrink: 1 },
    title: {
      marginTop: s(8.5),
      fontFamily: Fonts.brand,
      fontSize: s(16.5),
      lineHeight: s(22),
      color: Colors.textBrown,
      textAlign: "center",
    },
    desc: {
      marginTop: s(4),
      marginBottom: s(10),
      fontFamily: Fonts.bodyDesc,
      fontSize: s(12),
      lineHeight: s(17),
      color: Colors.textBrown,
      textAlign: "center",
    },
    startBtn: {
      marginTop: "auto",
      width: s(138),
      height: s(32),
      borderRadius: s(16),
      backgroundColor: Colors.buttonBrown,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: s(2),
    },
    startText: {
      fontFamily: Fonts.brand,
      fontSize: s(13),
      color: Colors.white,
    },
    pressed: { opacity: 0.85 },
    sideFace: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: s((CARD_W - SIDE_COL_W) / 2),
      width: s(SIDE_COL_W),
    },
    sideBody: {
      flex: 1,
      alignItems: "center",
      paddingTop: s(14),
      paddingBottom: s(18),
    },
    sideImage: { width: s(SIDE_COL_W), height: s(84), flexShrink: 1 },
    sideTitle: {
      marginTop: s(6),
      fontFamily: Fonts.brand,
      fontSize: s(16),
      lineHeight: s(19),
      color: Colors.textBrown,
      textAlign: "center",
    },
    sideDesc: {
      marginTop: s(5),
      marginBottom: s(8),
      fontFamily: Fonts.bodyDesc,
      fontSize: s(10.5),
      lineHeight: s(14),
      color: Colors.textBrown,
      textAlign: "center",
    },
    arrowBtn: {
      marginTop: "auto",
      width: s(32),
      height: s(32),
      borderRadius: s(16),
      backgroundColor: ARROW_BG,
      alignItems: "center",
      justifyContent: "center",
    },
    arrowBtnPressed: { backgroundColor: ARROW_BG_PRESSED },

    dots: {
      flexDirection: "row",
      justifyContent: "center",
      gap: s(14),
      marginTop: s(6),
    },
    dot: {
      width: s(13),
      height: s(13),
      borderRadius: s(6.5),
      backgroundColor: Colors.lightBrown,
    },
    dotActive: { backgroundColor: Colors.darkBrown },
  });
}
