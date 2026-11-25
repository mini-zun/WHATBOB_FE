import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Keyboard, Platform, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, Fonts } from "@/constants/theme";

const TOAST_DURATION = 2500;

type ToastState = { id: number; message: string } | null;
type ShowToast = (message: string) => void;

const ToastContext = createContext<ShowToast | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const idRef = useRef(0);

  const showToast = useCallback<ShowToast>((message) => {
    idRef.current += 1;
    setToast({ id: idRef.current, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <ToastView toast={toast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  const showToast = useContext(ToastContext);
  if (!showToast) {
    throw new Error("useToast는 ToastProvider 안에서만 사용할 수 있어요.");
  }
  return showToast;
}

function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) =>
      setHeight(e.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}

function ToastView({ toast }: { toast: ToastState }) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();

  const bottom = keyboardHeight > 0 ? keyboardHeight + 16 : insets.bottom + 24;

  return (
    <View pointerEvents="none" style={[styles.wrapper, { bottom }]}>
      {toast && (
        <Animated.View
          key={toast.id}
          entering={FadeInDown.duration(150)}
          exiting={FadeOutDown.duration(150)}
          style={styles.toast}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.text}>{toast.message}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 24,
    right: 24,
    alignItems: "center",
  },
  toast: {
    maxWidth: 420,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: "rgba(40, 30, 20, 0.9)",
  },
  text: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    color: Colors.white,
    textAlign: "center",
  },
});
