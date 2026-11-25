import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, Fonts } from "@/constants/theme";
import type { RecommendedMenu } from "@/types/order_sheet";

type Props = {
    menu: RecommendedMenu;
    onBack: () => void;
    onOpenMap: () => void;
};

export default function ConfirmedMenuScreen({ menu, onBack, onOpenMap }: Props) {
    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                contentContainerStyle={styles.page}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                <View style={styles.header}>
                    <Pressable
                        style={styles.backButton}
                        onPress={onBack}
                        accessibilityRole="button"
                        accessibilityLabel="추천 결과로 돌아가기"
                    >
                        <Feather name="arrow-left" size={26} color={Colors.maintext} />
                    </Pressable>

                    <Text style={styles.title}>오늘의 메뉴는?</Text>
                </View>

                <View style={styles.content}>
                    <View style={styles.imageCircle}>
                        <Image
                            source={
                                menu.image_url
                                    ? { uri: menu.image_url }
                                    : require("@/assets/images/whatbob_icon.png")
                            }
                            contentFit="contain"
                            style={styles.foodImage}
                            accessibilityLabel={menu.name}
                        />
                    </View>

                    <Text style={styles.menuName}>{menu.name}</Text>

                    <Pressable
                        style={styles.mapButton}
                        onPress={onOpenMap}
                        accessibilityRole="button"
                        accessibilityLabel="지도에서 위치보기"
                    >
                        <Text style={styles.mapButtonText}>
                            📍 지도에서 위치보기 &gt;
                        </Text>
                    </Pressable>
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
        width: "100%",
        maxWidth: 430,
        alignSelf: "center",
        paddingBottom: 32,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 30,
        paddingHorizontal: 30,
        gap: 28,
    },
    backButton: {
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: Colors.backGrey,
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        flex: 1,
        fontFamily: Fonts.nonpreferencefood,
        fontSize: 27.29,
        color: Colors.maintext,
    },
    content: {
        alignItems: "center",
        marginTop: 92,
        paddingHorizontal: 24,
    },
    imageCircle: {
        width: 216,
        maxWidth: "100%",
        aspectRatio: 1,
        borderRadius: 108,
        backgroundColor: Colors.cardYellow,
        alignItems: "center",
        justifyContent: "center",
    },
    foodImage: {
        width: 156,
        height: 124,
    },
    menuName: {
        marginTop: 26,
        fontFamily: Fonts.nonpreferencefood,
        fontSize: 30.13,
        lineHeight: 37,
        color: Colors.textBrown,
        textAlign: "center",
    },
    mapButton: {
        marginTop: 26,
        minHeight: 42,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 21,
        backgroundColor: Colors.backOrange,
        alignItems: "center",
        justifyContent: "center",
    },
    mapButtonText: {
        fontFamily: Fonts.bodyMedium,
        fontSize: 20.59,
        color: Colors.textBrown,
        textAlign: "center",
    },
});