import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { ActivityIndicator, Button, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { initializeAuthentication } from "@/lib/web-auth";
import { readLogoutRequest } from '@/lib/logout_request';
import { completeLogout } from '@/lib/logout';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Cafe24Ssurround: require("../../assets/fonts/Cafe24Ssurround-v2.0.otf"),
    Cafe24Simplehae: require("../../assets/fonts/Cafe24Simplehae-v2.0.otf"),
    PretendardBold: require("../../assets/fonts/Pretendard-Bold.otf"),
    PretendardBlack: require("../../assets/fonts/Pretendard-Black.otf"),
    PretendardSemiBold: require("../../assets/fonts/Pretendard-SemiBold.otf"),
    PretendardMedium: require("../../assets/fonts/Pretendard-Medium.otf"),
    BusanDandiMyeongjoM: require("../../assets/fonts/BusanDandiMyeongjoM.otf"),
  });

  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  useEffect(() => {
    let active = true;

    setAuthReady(false);
    setAuthError(null);

    const startAuthentication = async () => {
      const pendingLogout = readLogoutRequest();

      if (pendingLogout) {
        await completeLogout();
        return;
      }

      await initializeAuthentication();
    };

    startAuthentication().then(() => {
      if (active) setAuthReady(true);
    })
      .catch((error: unknown) => {
        if (!active) return;

        setAuthError(
          error instanceof Error ? error.message : "인증 상태를 확인하지 못했습니다. 다시 시도해 주세ㅛㅇ.",
        );
      });

    return () => {
      active = false;
    };
  }, [retryCount]);

  if (!loaded && !error) {
    return null;
  }
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {authReady ? (
        <Stack screenOptions={{ headerShown: false }} />
      ) : (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            gap: 16,
          }}
        >
          {authError ? (
            <>
              <Text accessibilityRole="alert">{authError}</Text>
              <Button
                title="다시 시도"
                onPress={() => {
                  setAuthError(null);
                  setRetryCount((count) => count + 1);
                }}
              />
            </>
          ) : (
            <>
              <ActivityIndicator />
              <Text>시작하는 중입니다.</Text>
            </>
          )}
        </View>
      )}
    </GestureHandlerRootView>
  );
}
