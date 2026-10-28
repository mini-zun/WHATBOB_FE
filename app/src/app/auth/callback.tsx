import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, Platform, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { clearLoginRequest, completeKakaoLogin } from '@/lib/web-auth';

export default function KakaoCallbackScreen() {
    const { code, state, error } = useLocalSearchParams();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        const complete = async () => {
            try {
                if (Platform.OS !== 'web') throw new Error('현재는 웹에서 로그인해 주세요.');
                if (error) {
                    clearLoginRequest();
                    throw new Error('카카오 로그인이 취소되었거나 실패했습니다.');
                }
                if (typeof code !== 'string' || !code || typeof state !== 'string' || !state) {
                    throw new Error('로그인 정보가 누락되었습니다. 다시 로그인해 주세요.');
                }
                await completeKakaoLogin(code, state);
                if (active) router.replace('/non_preference_food');
            } catch (failure) {
                if (active) setErrorMessage(failure instanceof Error ? failure.message : '로그인에 실패했습니다.');
            }
        };
        void complete();
        return () => { active = false; };
    }, [code, state, error]);

    return (
        <View style={styles.container}>
            {errorMessage ? (
                <>
                    <Text accessibilityRole="alert" style={styles.message}>{errorMessage}</Text>
                    <Button title="로그인으로 돌아가기" onPress={() => router.replace('/login')} />
                </>
            ) : (
                <>
                    <ActivityIndicator color={Colors.maintext} />
                    <Text style={styles.message}>로그인 중입니다.</Text>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: Colors.background },
    message: { textAlign: 'center', marginVertical: 16 },
});
