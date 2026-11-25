import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Fonts } from "@/constants/theme";

export default function NearbyPlacesScreen() {
    const { menuId, menuName } = useLocalSearchParams<{
        menuId?: string;
        menuName?: string;
    }>();

    const parsedMenuId = Number(menuId);
    const isValidMenu = typeof menuId === "string" &&
        Number.isSafeInteger(parsedMenuId) &&
        parsedMenuId > 0;

    const name = typeof menuName === "string" &&
        menuName.trim() ? menuName : "선택한 음식";

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/home");
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.page}>
                <Pressable
                    onPress={handleBack}
                    accessibilityRole="button"
                    style={styles.backButton}
                >
                    <Text>뒤로가기</Text>
                </Pressable>

                {isValidMenu ? (
                    <>
                        <Text style={styles.title}>{name} 파는 곳</Text>
                        <Text>현재 위치와 주변 음식점을 연결할 예정이에요.</Text>
                    </>
                ) : (
                    <Text accessibilityRole="alert">
                        메뉴 정보가 올바르지 않습니다. 다시 선택해 주세요.
                    </Text>
                )}
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
    },

    page: {
        flex: 1,
        width: "100%",
        maxWidth: 430,
        alignSelf: "center",
        padding: 24,
        gap: 24,
    },

    backButton: {
        alignSelf: "flex-start",
    },

    title: {
        fontFamily: Fonts.nonpreferencefood,
        fontSize: 30,
        color: Colors.maintext,
    },
});
