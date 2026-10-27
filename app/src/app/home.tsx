import { router } from 'expo-router';
import { useEffect, useSyncExternalStore } from 'react';
import { ActivityIndicator, Button, Platform, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import type { KakaoLoginResponse } from '@/lib/auth';
import { clearWebSession, readWebSession } from '@/lib/web-auth';

function subscribe(listener: () => void) {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
}

function getSnapshot(): string | null {
    try {
        const session = Platform.OS === 'web' ? readWebSession() : null;
        return session ? JSON.stringify(session) : null;
    } catch {
        return null;
    }
}

function getServerSnapshot(): undefined { return undefined; }

export default function HomeScreen() {
    const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    const session: KakaoLoginResponse | null = snapshot ? JSON.parse(snapshot) : null;

    useEffect(() => {
        if (snapshot === null) router.replace('/login');
    }, [snapshot]);

    const logout = () => {
        clearWebSession();
        router.replace('/login');
    };

    return (
        <View style={styles.container}>
            {session ? (
                <>
                    <Text style={styles.title}>왓밥</Text>
                    <Text style={styles.message}>{session.user.nickname || '사용자'}님, 반가워요!</Text>
                    <Text style={styles.message}>오늘 뭐 먹지?</Text>
                    <Button title="로그아웃" onPress={logout} />
                </>
            ) : <ActivityIndicator color={Colors.maintext} />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: Colors.background },
    title: { fontFamily: Fonts.brand, fontSize: 40, color: Colors.maintext },
    message: { fontFamily: Fonts.bodyBold, marginVertical: 12, textAlign: 'center' },
});
