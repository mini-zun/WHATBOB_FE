import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View, ScrollView, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useEffect, useState, useRef } from "react";

import { getOrderSheetQuestions } from "@/lib/order_sheet";
import type { OrderSheetAnswer, OrderSheetQuestion } from "@/types/order_sheet";

import { Colors, Fonts } from "@/constants/theme";

export default function OrderSheetScreen() {
    const { height } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    const [questions, setQuestions] = useState<OrderSheetQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<OrderSheetAnswer[]>([]);

    const availableHeight = height - insets.top - insets.bottom;
    const scrollRef = useRef<ScrollView>(null);

    const questionTopSpacing = Math.max(
        32, Math.min(146, 146 - (852 - availableHeight)),
    );

    useEffect(() => {
        let cancelled = false;

        const loadQuestions = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const data = await getOrderSheetQuestions();

                if (!cancelled) {
                    setQuestions(data.questions);
                }
            } catch (error) {
                if (!cancelled) {
                    setError(
                        error instanceof Error ? error.message : "질문을 불러오지 못했습니다.",
                    );
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        void loadQuestions();

        return () => {
            cancelled = true;
        };
    }, [retryCount]);

    useEffect(() => {
        scrollRef.current?.scrollTo({
            y: 0,
            animated: false,
        });
    }, [questionIndex]);

    const question = questions[questionIndex];

    const selectedOptionId = answers.find(
        (answer) => answer.question_id === question?.id,
    )?.option_id;

    const handleAnswer = (optionId: string) => {
        if (!question) return;

        setAnswers((previous) => [
            ...previous.filter(
                (answer) => answer.question_id !== question.id,
            ),
            {
                question_id: question.id,
                option_id: optionId,
            },
        ]);
        if (questionIndex < questions.length - 1) {
            setQuestionIndex(questionIndex + 1);
        }
    };

    const handleBack = () => {
        if (questionIndex === 0) {
            router.back();
            return;
        }

        setQuestionIndex(questionIndex - 1);
    };

    if (isLoading || error || !question) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={[styles.page, styles.statusPage]}>
                    <Text style={styles.skipText}>
                        {isLoading
                            ? "질문을 불러오는 중이에요."
                            : error || "표시할 질문이 없습니다."}
                    </Text>

                    {!isLoading && (
                        <Pressable
                            accessibilityRole="button"
                            style={styles.answerButton}
                            onPress={() => setRetryCount((count) => count + 1)}
                        >
                            <Text style={styles.answerButtonText}>다시 시도</Text>
                        </Pressable>
                    )}

                    <Pressable
                        accessibilityRole="button"
                        onPress={() => router.back()}
                    >
                        <Text style={styles.skipText}>뒤로가기</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.scroll}
                ref={scrollRef}
                contentContainerStyle={styles.page}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                <View style={styles.header}>
                    <Pressable
                        onPress={handleBack}
                        style={styles.backButton}
                        accessibilityRole="button"
                        accessibilityLabel="뒤로가기"
                    >
                        <Feather name="arrow-left" size={26} color={Colors.maintext} />
                    </Pressable>
                    <View style={styles.progressTrack}>
                        <View style={styles.progressBackground} />
                        <View style={[styles.progressFill, { width: `${((questionIndex + 1) / questions.length) * 100}%` },
                        ]}
                        />
                    </View>

                    <Text style={styles.progressText}>{questionIndex + 1}/{questions.length}</Text>
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
                        <Text style={styles.questionText}>{question.question_text}</Text>

                    </View>
                </View>

                <View style={styles.answerSection}>
                    <View style={styles.answerButtons}>
                        {question.options.filter((option) => option.option_id !== "any").map((option) => (
                            <Pressable key={option.option_id}
                                style={[
                                    styles.answerButton,
                                    selectedOptionId === option.option_id && styles.selectedOption,
                                ]}
                                accessibilityRole="button"
                                accessibilityState={{
                                    selected: selectedOptionId === option.option_id,
                                }}
                                onPress={() => handleAnswer(option.option_id)}
                            >
                                <Text style={styles.answerButtonText}>{option.label}</Text>
                            </Pressable>
                        ))
                        }
                    </View>
                    {question.options.filter((option) => option.option_id === "any").map((option) => (
                        <Pressable key={option.option_id}
                            style={[
                                styles.skipButton,
                                selectedOptionId === option.option_id && styles.selectedOption,
                            ]}
                            hitSlop={12}
                            accessibilityRole="button"
                            accessibilityState={{
                                selected: selectedOptionId === option.option_id,
                            }}
                            onPress={() => handleAnswer(option.option_id)}
                        >
                            <Text style={styles.skipText}>{option.label} · 건너뛰기</Text>
                        </Pressable>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    selectedOption: {
        opacity: 0.65,
    },
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
    statusPage: {
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
        gap: 20,
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
