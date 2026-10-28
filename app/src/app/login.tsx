import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import { getKakaoLoginUrl } from '@/lib/auth';
import { prepareKakaoLogin } from '@/lib/web-auth';

export default function LoginScreen() {
    const insets = useSafeAreaInsets();
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const loginInProgress = useRef(false);

    const handleKakaoLogin = async () => {
        if (loginInProgress.current) return;
        loginInProgress.current = true;
        setIsLoggingIn(true);
        setErrorMessage(null);

        try {
            if (Platform.OS !== 'web') {
                throw new Error('현재는 웹에서 카카오 로그인을 이용해 주세요.');
            }
            const state = window.crypto.randomUUID();
            const loginUrl = await getKakaoLoginUrl(state);
            window.location.assign(prepareKakaoLogin(loginUrl));
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : '로그인을 시작하지 못했습니다.');
        } finally {
            loginInProgress.current = false;
            setIsLoggingIn(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.page} bounces={false}>
                <View style={styles.hero}>
                    <Image
                        source={require('@/assets/images/login-icon.png')}
                        contentFit='contain'
                        style={styles.character}
                    />

                    <Text style={styles.brand}>왓밥</Text>
                    <Text style={styles.question}>오늘 뭐 먹지?</Text>
                    <Text style={styles.description}>왓밥이 더 맛있는 선택을 도와줄게요!</Text>
                </View>

                <View style={[
                    styles.footer,
                    { paddingBottom: Math.max(16, 58 - insets.bottom) },
                ]}>
                    <Pressable
                        accessibilityRole='button'
                        accessibilityLabel='카카오 로그인'
                        onPress={handleKakaoLogin}
                        disabled={isLoggingIn}
                        accessibilityState={{ disabled: isLoggingIn, busy: isLoggingIn }}
                        style={styles.kakaoButton}>
                        <Image
                            source={require('@/assets/images/kakao_login_button.png')}
                            contentFit='contain'
                            style={styles.kakaoButtonImage}
                        />
                    </Pressable>
                    {isLoggingIn && <ActivityIndicator color={Colors.maintext} style={styles.feedback} />}
                    {errorMessage && (
                        <Text accessibilityRole="alert" style={styles.errorMessage}>{errorMessage}</Text>
                    )}
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
    page: {
        flexGrow: 1,
        paddingHorizontal: 24,
    },
    hero: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 52,
    },
    character: {
        width: 150.51,
        height: 152.59,
        transform: [{ translateX: 11 }],
    },
    brand: {
        fontFamily: Fonts.brand,
        fontSize: 51.86,
        lineHeight: 67,
        color: Colors.maintext,
        transform: [{ translateX: 5 }],
    },
    question: {
        marginTop: 18,
        fontFamily: Fonts.brand,
        fontSize: 23.83,
        lineHeight: 31,
        color: Colors.textSecondary,
        transform: [{ translateX: 5 }],
    },
    description: {
        marginTop: 18,
        fontFamily: Fonts.bodyBold,
        fontSize: 20.51,
        lineHeight: 24,
        color: Colors.textMuted,
        textAlign: 'center',
        transform: [{ translateX: 5 }],
    },
    footer: {
        alignItems: 'center',
    },
    kakaoButton: {
        width: '100%',
        maxWidth: 336,
    },
    kakaoButtonImage: {
        width: '100%',
        aspectRatio: 336 / 69,
    },
    feedback: {
        marginTop: 12,
    },
    errorMessage: {
        marginTop: 12,
        color: Colors.errorText,
        textAlign: 'center',
    },
});
