import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View, ScrollView, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";

import { Colors, Fonts } from "@/constants/theme";

export default function OrderSheetScreen() {
    const { height } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    const availableHeight = height - insets.top - insets.bottom;

    const questionTopSpacing = Math.max(
        32, Math.min(146, 146 - (852 - availableHeight)),
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.scroll}
                contentContainerStyle={styles.page}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                <View style={styles.header}>
                    <Pressable
                        onPress={() => router.back()}
                        style={styles.backButton}
                        accessibilityRole="button"
                        accessibilityLabel="뒤로가기"
                    >
                        <Feather name="arrow-left" size={26} color={Colors.maintext} />
                    </Pressable>
                    <View style={styles.progressTrack}>
                        <View style={styles.progressBackground}/>
                        <View style={styles.progressFill} />
                    </View>

                    <Text style={styles.progressText}>1/8</Text>
                </View>

                <View
                    style={[
                        styles.questionSection,
                        { paddingTop: questionTopSpacing },
                    ]}
                >
                    <View style={styles.imageCircle}>
                        <Image
                            source={require("@/assets/images/whatbob_icon.png")}
                            contentFit="contain"
                            style={styles.characterImage}
                        />
                    </View>

                    <View style={styles.questionTextBox}>
                        <Text style={styles.questionText}>국물 있는 음식이 당기시나요?</Text>

                    </View>
                </View>

                <View style={styles.answerSection}>
                    <View style={styles.answerButtons}>
                        <Pressable style={styles.answerButton}>
                            <Text style={styles.answerButtonText}>예</Text>
                        </Pressable>

                        <Pressable style={styles.answerButton}>
                            <Text style={styles.answerButtonText}>아니요</Text>
                        </Pressable>
                    </View>

                    <Pressable
                        style={styles.skipButton}
                        hitSlop={12}
                        accessibilityRole="button"
                    >
                        <Text style={styles.skipText}>상관없어요 · 건너뛰기</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scroll: {
        flex: 1,
    },
    page: {
        flexGrow: 1,
        paddingBottom: 32,
        width: "100%",
        maxWidth: 430,
        alignSelf: "center",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 30,
        paddingLeft: 30,
        paddingRight: 21
    },
    backButton: {
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: "#EFEFE5",
        alignItems: "center",
        justifyContent: "center",
    },
    progressTrack: {
        flex: 1,
        height: 10,
        marginLeft: 10,
        marginRight: 13,
        justifyContent: "center",
    },
    progressBackground: {
        position: "absolute",
        left: 0,
        right: 0,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#F0EFE3"  
    },
    progressFill: {
        width: "12.5%",
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.textBrown,
    },
    progressText: {
        width: 33,
        height: 26,
        lineHeight: 26,
        textAlign: "center",
        fontFamily: Fonts.bodyDesc,
        fontSize: 21.32,
        color: Colors.maintext,
    },
    questionSection: {
        alignItems: "center",
        paddingHorizontal: 20,
    },
    imageCircle: {
        width: 216,
        maxWidth: "100%",
        aspectRatio: 1,
        borderRadius: 108,
        backgroundColor: "#EFEFE5",
        alignItems: "center",
        justifyContent: "center",
    },
    questionTextBox: {
        marginTop: 50,
        width: "100%",
        maxWidth: 352,
        minHeight: 43,
        justifyContent: "center",
    },
    questionText: {
        fontFamily: Fonts.nonpreferencefood,
        fontSize: 28.5,
        lineHeight: 28.5,
        color: Colors.textBrown,
        textAlign: "center",
    },

    answerSection: {
        alignSelf: "center",
        width: "100%",
        paddingHorizontal: 23,
        marginTop: 45,
    },
    answerButtons: {
        gap: 16,
    },
    answerButton: {
        minHeight: 64,
        paddingVertical: 20,
        paddingHorizontal: 13,
        borderRadius: 999,
        backgroundColor: Colors.textBrown,
        alignItems: "center",
        justifyContent: "center",
        gap: 8.99,
    },
    answerButtonText: {
        fontFamily: Fonts.bodyBold,
        fontSize: 20,
        lineHeight: 24,
        color: Colors.white,
        textAlign: "center",
    },
    skipButton: {
        alignSelf: "center",
        marginTop: 49,
        maxWidth: "100%",
        minHeight: 23,
        alignItems: "center",
        justifyContent: "center",
    },
    skipText: {
        fontFamily: Fonts.bodyDesc,
        fontSize: 18.81,
        lineHeight: 23,
        color: Colors.textSecondary,
        textAlign: "center",
    },
    characterImage: {
        width: 107,
        height: 108,
        transform: [
            { translateX: 4.5 },
            { translateY: -6 },
        ],
    },
})
