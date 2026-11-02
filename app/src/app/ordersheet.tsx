import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, Fonts } from "@/constants/theme";

export default function OrderSheetScreen() {
    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.page}>
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
                        <View style={styles.progressFill} />
                    </View>

                    <Text style={styles.progressText}>1/8</Text>
                </View>

                <View style={styles.questionSection}>
                    <View style={styles.imageCircle}>
                        <Text style={styles.placeholderEmoji}>🍚</Text>
                    </View>

                    <View style={styles.questionTextBox}>
                        <Text style={styles.questionText}>뭐 먹고싶냐?</Text>

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
        borderRadius: 5,
        backgroundColor: "#EFEFE5",
        overflow: "hidden",
    },
    progressFill: {
        width: "12.5%",
        height: "100%",
        borderRadius: 5,
        backgroundColor: Colors.textBrown,
    },
    progressText: {
        width: 33,
        height: 26,
        lineHeight: 26,
        textAlign: "center",
        fontFamily: Fonts.bodyDesc,
        fontSize: 20,
        color: Colors.maintext,
    },
    questionSection: {
        alignItems: "center",
        paddingTop: 146,
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
    placeholderEmoji: {
        fontSize: 80,
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
        maxWidth: 394,
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
        fontFamily: Fonts.brand,
        fontSize: 20,
        lineHeight: 24,
        color: Colors.white,
        textAlign: "center",
    },
    skipButton: {
        alignSelf: "center",
        marginTop: 49,
        width: 155,
        height: 23,
        alignItems: "center",
        justifyContent: "center",
    },
    skipText: {
        fontFamily: Fonts.bodyDesc,
        fontSize: 16,
        lineHeight: 23,
        color: Colors.textSecondary,
        textAlign: "center",
    },
})
