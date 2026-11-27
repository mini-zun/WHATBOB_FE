import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, Fonts } from "@/constants/theme";

type Props = {
  visible: boolean;
  canReset: boolean;
  onSelectCamera: () => void;
  onSelectLibrary: () => void;
  onReset: () => void;
  onClose: () => void;
};

export function ProfileImageSheet({
  visible,
  canReset,
  onSelectCamera,
  onSelectLibrary,
  onReset,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <>
      <Animated.View
        entering={FadeIn.duration(100)}
        exiting={FadeOut.duration(100)}
        style={styles.backdrop}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessible={false}
        />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.duration(180)}
        exiting={SlideOutDown.duration(120)}
        style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}
        accessibilityViewIsModal
      >
        <View style={styles.handle} />
        <Text style={styles.title}>프로필 사진 변경</Text>

        <SheetItem icon="camera" label="카메라로 촬영" onPress={onSelectCamera} />
        <SheetItem icon="image" label="앨범에서 선택" onPress={onSelectLibrary} />
        {canReset && (
          <SheetItem
            icon="rotate-ccw"
            label="기본 이미지로 변경"
            onPress={onReset}
            destructive
          />
        )}

        <Pressable
          style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
          onPress={onClose}
          accessibilityRole="button"
        >
          <Text style={styles.cancelText}>취소</Text>
        </Pressable>
      </Animated.View>
    </>
  );
}

type SheetItemProps = {
  icon: ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

function SheetItem({ icon, label, onPress, destructive = false }: SheetItemProps) {
  const color = destructive ? Colors.errorText : Colors.textBrown;

  return (
    <Pressable
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Feather name={icon} size={22} color={color} />
      <Text style={[styles.itemText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    alignSelf: "center",
    width: "100%",
    maxWidth: 500,
    paddingTop: 10,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.lightBrown,
    marginBottom: 14,
  },
  title: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 17,
    color: Colors.textBrown,
    marginLeft: 8,
    marginBottom: 6,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 52,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  itemText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
  },
  pressed: {
    backgroundColor: Colors.backOrange,
  },
  cancelButton: {
    marginTop: 10,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: Colors.backGrey,
  },
  cancelText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
    color: Colors.textSecondary,
  },
});
