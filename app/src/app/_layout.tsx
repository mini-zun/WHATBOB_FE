import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Button, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { initializeAuthentication, clearWebSession } from "@/lib/web-auth";
import { readLogoutRequest } from '@/lib/logout_request';
import { completeLogout, LogoutRestartRequiredError } from '@/lib/logout';
import {
  hasAuthContextChanged,
  subscribeAuthContextChange,
  subscribeAuthContextInvalidation,
} from "@/lib/auth_context";
import { clearLogoutRequest } from "@/lib/logout_request";
import StartupLoadingScreen from "@/components/StartupLoadingScreen";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Cafe24Ssurround: require("../../assets/fonts/Cafe24Ssurround-v2.0.otf"),
    Cafe24Simplehae: require("../../assets/fonts/Cafe24Simplehae-v2.0.otf"),
    Cafe24Danjunghae: require("../../assets/fonts/Cafe24Danjunghae-v2.0.otf"),
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
    if (typeof window === 'undefined') return;

    const checkAuthContext = () => {
      if (!hasAuthContextChanged()) return;

      setAuthReady(false);
      setAuthError("다른 탭에서 계정이 변경되었습니다. 다시 시작해 주세요.",);
    };
    const unsubscribeInvalidation =
      subscribeAuthContextInvalidation(checkAuthContext);
    const unsubscribe = subscribeAuthContextChange(() => {
      checkAuthContext();
    });

    window.addEventListener("focus", checkAuthContext);

    document.addEventListener("visibilitychange", checkAuthContext);
    checkAuthContext();

    return () => {
      unsubscribeInvalidation();
      unsubscribe();
      window.removeEventListener("focus", checkAuthContext);
      document.removeEventListener(
        "visibilitychange",
        checkAuthContext,
      );
    };
  }, []);

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
        try {
          await completeLogout();
        } catch (error) {
          if (!(error instanceof LogoutRestartRequiredError)) {
            throw error;
          }
          await initializeAuthentication();
        }
        return;
      }

      await initializeAuthentication();
    };

    startAuthentication().then(() => {
      if (!active) return;
      if (hasAuthContextChanged()) {
        setAuthError("다른 탭에서 계정이 변경되었습니다. 다시 시작해 주세요.",);
        return;
      }
      setAuthReady(true);
    })
      .catch((error: unknown) => {
        if (!active) return;

        setAuthError(
          error instanceof Error ? error.message : "인증 상태를 확인하지 못했습니다. 다시 시도해 주세요.",
        );
      });

    return () => {
      active = false;
    };
  }, [retryCount]);

  if (!loaded && !error) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StartupLoadingScreen />
      </GestureHandlerRootView>
    );
  }
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {authReady ? (
        <Stack screenOptions={{ headerShown: false }} />
      ) : authError ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            gap: 16,
          }}
        >
          <Text accessibilityRole="alert">{authError}</Text>
          <Button
            title="다시 시도"
            onPress={() => {
              if (
                typeof window !== "undefined" &&
                hasAuthContextChanged()
              ) {
                clearWebSession();
                clearLogoutRequest();
                window.location.replace("/home");
                return;
              }
              setAuthError(null);
              setRetryCount((count) => count + 1);
            }}
          />
        </View>
      ) : (
        <StartupLoadingScreen/>
      )}
    </GestureHandlerRootView>
  );
}