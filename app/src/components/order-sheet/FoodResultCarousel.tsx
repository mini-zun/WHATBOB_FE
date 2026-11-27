import { type ImageSource } from "expo-image";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
import FoodIllustration from "@/components/FoodIllustration";
import type { RecommendedMenu } from "@/types/order_sheet";

const CARD_W = 130;
const CARD_H = 190;
const CIRCLE = 90;
const DOT = 13;

const STAGE_TOP = 64;
const STAGE_BOTTOM = 18;
const STAGE_H = STAGE_TOP + CARD_H + STAGE_BOTTOM;

type Slots = {
  at: number[];
  x: number[];
  y: number[];
  scale: number[];
  rotateY: number[];
  skewY: number[];
  dim: number[];
};

const SLOTS_DEFAULT: Slots = {
  at: [0, 1, 2, 2.5],
  x: [0, 113, 65, 30],
  y: [0, -16, -60, -64],
  scale: [1, 0.95, 0.85, 0.8],
  rotateY: [0, 50, 20, 10],
  skewY: [0, 9, 4, 0],
  dim: [0, 0, 0.1, 0.15],
};

const SLOTS_FOUR: Slots = {
  at: [0, 1, 2],
  x: [0, 113, 0],
  y: [0, -16, -60],
  scale: [1, 0.95, 0.85],
  rotateY: [0, 50, 0],
  skewY: [0, 9, 0],
  dim: [0, 0, 0.1],
};

const STEP_PX = SLOTS_DEFAULT.x[1];
const PERSPECTIVE = 700;
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

const offsetOf = (index: number, p: number, total: number, loop: boolean) => {
  "worklet";
  return loop ? wrap(index - p, total) : index - p;
};

const fadeEdgeOf = (total: number, loop: boolean) => {
  if (!loop) return 2.5;
  if (total === 4) return 3;
  return Math.min(total / 2, 2.5);
};

const slotsOf = (total: number, loop: boolean) =>
  loop && total === 4 ? SLOTS_FOUR : SLOTS_DEFAULT;

type CardProps = {
  menu: RecommendedMenu;
  index: number;
  total: number;
  loop: boolean;
  fadeEdge: number;
  slots: Slots;
  relative: number;
  progress: SharedValue<number>;
  imageSource?: ImageSource | number;
  onNavigate: (delta: number) => void;
};

function FoodCard({
  menu,
  index,
  total,
  loop,
  fadeEdge,
  slots,
  relative,
  progress,
  imageSource,
  onNavigate,
}: CardProps) {
  const cardStyle = useAnimatedStyle(() => {
    const o = offsetOf(index, progress.get(), total, loop);
    const abs = Math.abs(o);
    const dir = Math.sign(o);
    const at = (out: number[]) =>
      interpolate(abs, slots.at, out, Extrapolation.CLAMP);

    return {
      opacity: interpolate(
        abs,
        [fadeEdge - 0.5, fadeEdge],
        [1, 0],
        Extrapolation.CLAMP,
      ),
      zIndex: Math.round(100 - abs * 10),
      transform: [
        { perspective: PERSPECTIVE },
        { translateX: dir * at(slots.x) },
        { translateY: at(slots.y) },
        { scale: at(slots.scale) },
        { rotateY: `${dir * at(slots.rotateY)}deg` },
        { skewY: `${-dir * at(slots.skewY)}deg` },
      ],
    };
  });

  const dimStyle = useAnimatedStyle(() => {
    const o = offsetOf(index, progress.get(), total, loop);
    return {
      opacity: interpolate(
        Math.abs(o),
        slots.at,
        slots.dim,
        Extrapolation.CLAMP,
      ),
    };
  });

  const isCenter = relative === 0;
  const isHidden = Math.abs(relative) >= fadeEdge;

  return (
    <Animated.View
      style={[styles.card, cardStyle, isHidden && styles.noTouch]}
      aria-hidden={isHidden}
    >
      <Pressable
        role="button"
        aria-label={isCenter ? menu.name : `${menu.name} 보기`}
        disabled={isCenter}
        onPress={() => onNavigate(relative)}
        style={styles.cardBody}
      >
        <View style={styles.circle}>
          <FoodIllustration
            imageKey={menu.menu_id}
            imageUrl={menu.image_url}
            source={imageSource}
            style={styles.foodImage}
            accessibilityLabel={menu.name}
          />
        </View>
        <Text style={styles.name} numberOfLines={2} maxFontSizeMultiplier={1.2}>
          {menu.name}
        </Text>
      </Pressable>

      <Animated.View style={[styles.dim, styles.noTouch, dimStyle]} />
    </Animated.View>
  );
}

type Props = {
  menus: RecommendedMenu[];
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
  getImageSource?: (menu: RecommendedMenu) => ImageSource | number;
  disabled?: boolean;
};

export function FoodResultCarousel({
  menus,
  initialIndex = 0,
  onIndexChange,
  getImageSource,
  disabled = false,
}: Props) {
  const n = menus.length;
  const loop = n >= 3;
  const fadeEdge = fadeEdgeOf(n, loop);
  const slots = slotsOf(n, loop);

  const progress = useSharedValue(initialIndex);
  const target = useSharedValue(initialIndex);
  const dragStart = useSharedValue(initialIndex);
  const [active, setActive] = useState(initialIndex);

  const settle = useCallback(
    (next: number) => {
      setActive(next);
      onIndexChange?.(next);
    },
    [onIndexChange],
  );

  const moveBy = (delta: number) => {
    if (delta === 0 || disabled) return;
    const raw = target.get() + delta;
    const next = loop ? raw : Math.min(Math.max(raw, 0), n - 1);
    target.set(next);
    progress.set(withTiming(next, TIMING));
    settle(loop ? mod(next, n) : next);
  };

  const pan = Gesture.Pan()
    .enabled(n > 1 && !disabled)
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onStart(() => {
      cancelAnimation(progress);
      dragStart.set(progress.get());
    })
    .onUpdate((e) => {
      const p = dragStart.get() - e.translationX / STEP_PX;
      progress.set(loop ? p : clamp(p, -0.3, n - 1 + 0.3));
    })
    .onEnd((e) => {
      const moved = progress.get() - dragStart.get();
      const speed = -e.velocityX / STEP_PX;
      const dir = Math.sign(moved);
      const commit =
        Math.abs(moved) > 0.3 ||
        (Math.sign(speed) === dir && Math.abs(speed) > 1.5);
      const raw = target.get() + (commit ? dir : 0);
      const to = loop ? raw : clamp(raw, 0, n - 1);
      target.set(to);
      progress.set(withTiming(to, TIMING));
      scheduleOnRN(settle, loop ? mod(to, n) : to);
    });

  if (n === 0) return null;

  return (
    <View
      style={[styles.root, disabled && styles.noTouch]}
      aria-disabled={disabled}
    >
      <GestureDetector gesture={pan} touchAction="pan-y">
        <View style={styles.stage}>
          {menus.map((menu, i) => (
            <FoodCard
              key={menu.menu_id}
              menu={menu}
              index={i}
              total={n}
              loop={loop}
              fadeEdge={fadeEdge}
              slots={slots}
              relative={loop ? wrap(i - active, n) : i - active}
              progress={progress}
              imageSource={getImageSource?.(menu)}
              onNavigate={moveBy}
            />
          ))}
        </View>
      </GestureDetector>

      <Text style={styles.counter}>
        {active + 1}/{n}
      </Text>

      {n > 1 && (
        <View style={styles.dots}>
          {menus.map((menu, i) => (
            <Pressable
              key={menu.menu_id}
              role="button"
              aria-label={`${i + 1}번째 메뉴: ${menu.name}`}
              aria-selected={i === active}
              disabled={disabled}
              hitSlop={7}
              onPress={() => moveBy(loop ? wrap(i - active, n) : i - active)}
            >
              <View style={[styles.dot, i === active && styles.dotActive]} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    alignItems: "center",
  },
  stage: {
    width: "100%",
    height: STAGE_H,
  },
  card: {
    position: "absolute",
    top: STAGE_TOP,
    left: "50%",
    marginLeft: -CARD_W / 2,
    width: CARD_W,
    height: CARD_H,
    borderRadius: 20,
    backgroundColor: Colors.cardYellow,
    boxShadow: "0px 6px 8px -4px rgba(0, 0, 0, 0.22)",
  },
  cardBody: {
    flex: 1,
    alignItems: "center",
    paddingTop: 22,
    paddingHorizontal: 8,
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: "#FFF9E3",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  foodImage: {
    width: CIRCLE - 14,
    height: CIRCLE - 14,
  },
  name: {
    marginTop: 18,
    fontFamily: Fonts.nonpreferencefood,
    fontSize: 20,
    lineHeight: 26,
    color: Colors.maintext,
    textAlign: "center",
  },
  dim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 20,
    backgroundColor: "#A68A3C",
  },
  noTouch: {
    pointerEvents: "none",
  },
  counter: {
    marginTop: 4,
    fontFamily: Fonts.bodyDesc,
    fontSize: 22,
  },
  dots: {
    flexDirection: "row",
    gap: 14,
    marginTop: 14,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: Colors.lightBrown,
  },
  dotActive: {
    backgroundColor: Colors.darkBrown,
  },
});
