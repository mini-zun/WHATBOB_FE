import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Cafe24Ssurround: require('../../assets/fonts/Cafe24Ssurround-v2.0.otf'),
    PretendardBold: require('../../assets/fonts/Pretendard-Bold.otf'),
    BusanDandiMyeongjoM: require('../../assets/fonts/BusanDandiMyeongjoM.otf')

  });

  useEffect(() => {
    if(loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if(!loaded && !error) {
    return null;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}