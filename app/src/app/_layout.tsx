import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import {
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Cafe24Ssurround: require("../../assets/fonts/Cafe24Ssurround-v2.0.otf"),
    Cafe24Simplehae: require("../../assets/fonts/Cafe24Simplehae-v2.0.otf"),
    PretendardBold: require("../../assets/fonts/Pretendard-Bold.otf"),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
