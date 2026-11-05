import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View, ScrollView, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useEffect, useState, useRef } from "react";

import {
    getOrderSheetQuestions,
    submitOrderSheet,
    submitRecommendationFeedback,
} from "@/lib/order_sheet";
import type {
    OrderSheetAnswer,
    OrderSheetQuestion,
    OrderSheetRecommendData,
} from "@/types/order_sheet";


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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [recommendation, setRecommendation] =
        useState<OrderSheetRecommendData | null>(null);
    const [recommendationIndex, setRecommendationIndex] = useState(0);
    const submitInProgress = useRef(false);
    const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
    const [feedbackError, setFeedbackError] = useState<string | null>(null);
    const [isAccepted, setIsAccepted] = useState(false);

    const feedbackInProgress = useRef(false);
    const completedFeedback = useRef(new Set<string>());

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
                    setQuestionIndex(0);
                    setAnswers([]);
                    setSubmitError(null);
                    setRecommendation(null);
                    setRecommendationIndex(0);
                    setFeedbackError(null);
                    setIsAccepted(false);
                    completedFeedback.current.clear();
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


    const currentMenu =
        recommendation?.recommended_menus[recommendationIndex];

    const selectedOptionId = answers.find(
        (answer) => answer.question_id === question?.id,
    )?.option_id;

    const handleSubmit = async (submittedAnswers: OrderSheetAnswer[]) => {
        if (submitInProgress.current || recommendation) return;

        const hasAllAnswers =
            questions.length > 0 &&
            questions.every((question) =>
                submittedAnswers.some(
                    (answer) => answer.question_id === question.id,
                ),
            );

        if (!hasAllAnswers) {
            setSubmitError("모든 질문에 답변해 주세요.");
            return;
        }

        submitInProgress.current = true;
        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const data = await submitOrderSheet({
                answers: submittedAnswers,
                exclusions: [],
                top_k: 5,
            });

            setRecommendationIndex(0);
            setFeedbackError(null);
            setIsAccepted(false);
            completedFeedback.current.clear();
            setRecommendation(data);
        } catch (error) {
            setSubmitError(
                error instanceof Error
                    ? error.message
                    : "추천 요청에 실패했습니다.",
            );
        } finally {
            submitInProgress.current = false;
            setIsSubmitting(false);
        }
    };

    const handleAnswer = (optionId: string) => {
        if (!question || submitInProgress.current || recommendation) {
            return;
        }

        const nextAnswers: OrderSheetAnswer[] = [
            ...answers.filter(
                (answer) => answer.question_id !== question.id,
            ),
            {
                question_id: question.id,
                option_id: optionId,
            },
        ];

        setAnswers(nextAnswers);
        setSubmitError(null);

        if (questionIndex < questions.length - 1) {
            setQuestionIndex(questionIndex + 1);
            return;
        }

        void handleSubmit(nextAnswers);
    };

    const handleBack = () => {
        if (submitInProgress.current) return;

        setSubmitError(null);

        if (questionIndex === 0) {
            router.back();
            return;
        }

        setQuestionIndex(questionIndex - 1);
    };

    const handleFeedback = async (isSatisfied: boolean) => {
        if (!recommendation || !currentMenu || isAccepted) return;

        const feedbackKey = `${recommendation.recommendation_id}:${currentMenu.menu_id}`;

        if (
            feedbackInProgress.current ||
            completedFeedback.current.has(feedbackKey)
        ) {
            return;
        }

        feedbackInProgress.current = true;
        setIsFeedbackSubmitting(true);
        setFeedbackError(null);

        try {
            await submitRecommendationFeedback(
                recommendation.recommendation_id,
                {
                    selected_menu_id: currentMenu.menu_id,
                    is_satisfied: isSatisfied,
                },
            );

            completedFeedback.current.add(feedbackKey);

            if (isSatisfied) {
                setIsAccepted(true);
                return;
            }

            if (
                recommendationIndex >=
                recommendation.recommended_menus.length - 1
            ) {
                router.replace("/home");
                return;
            }

            setRecommendationIndex(recommendationIndex + 1);
        } catch (error) {
            setFeedbackError(
                error instanceof Error
                    ? error.message
                    : "피드백을 저장하지 못했습니다.",
            );
        } finally {
            feedbackInProgress.current = false;
            setIsFeedbackSubmitting(false);
        }
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

    if (isSubmitting) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View
                    style={[styles.page, styles.statusPage]}
                    accessibilityState={{ busy: true }}
                >
                    <Text style={styles.skipText}>
                        답변에 맞는 메뉴를 찾고 있어요.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (recommendation && currentMenu && isAccepted) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={[styles.page, styles.statusPage]}
                    bounces={false}
                >
                    <Text style={styles.resultTitle}>
                        오늘 메뉴는 {currentMenu.name}!
                    </Text>
                    <Text style={styles.skipText}>맛있게 드세요.</Text>
                    <Pressable
                        accessibilityRole="button"
                        style={styles.answerButton}
                        onPress={() => router.replace("/home")}
                    >
                        <Text style={styles.answerButtonText}>홈으로</Text>
                    </Pressable>
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (recommendation && currentMenu) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.replace("/home")}
                        style={styles.backButton}
                        accessibilityRole="button"
                        accessibilityLabel="홈으로 돌아가기"
                        disabled={isFeedbackSubmitting}
                        accessibilityState={{ disabled: isFeedbackSubmitting }}
                    >
                        <Feather
                            name="arrow-left"
                            size={26}
                            color={Colors.maintext}
                        />
                    </Pressable>

                    <View style={styles.progressTrack}>
                        <View style={styles.progressBackground} />
                        <View
                            style={[
                                styles.progressFill,
                                { width: "100%" },
                            ]}
                        />
                    </View>

                    <Text style={styles.progressText}>
                        {questions.length}/{questions.length}
                    </Text>
                </View>

                <ScrollView
                    key={`recommendation-${currentMenu.menu_id}`}
                    style={styles.scroll}
                    contentContainerStyle={[styles.page, styles.resultPage, { paddingTop: Math.max(24, questionTopSpacing - 46) },]}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    <Text style={styles.recommendationTitle}>혹시 이 메뉴인가요?</Text>

                    <View style={styles.resultImageCircle}>
                        <Image source={require("@/assets/images/whatbob_icon.png")}
                            contentFit="contain"
                            style={styles.characterImage}
                        />
                    </View>

                    <Text style={styles.resultMenuName}>{currentMenu.name}</Text>

                    {isFeedbackSubmitting && (
                        <Text style={styles.skipText}>
                            선택을 저장하고 있어요.
                        </Text>
                    )}
                    {feedbackError && (
                        <Text style={styles.skipText}>{feedbackError}</Text>
                    )}

                    <View style={[styles.answerButtons, styles.resultActions]}>
                        <Pressable
                            accessibilityRole="button"
                            style={[
                                styles.answerButton,
                                isFeedbackSubmitting && styles.selectedOption,
                            ]}
                            disabled={isFeedbackSubmitting}
                            accessibilityState={{
                                disabled: isFeedbackSubmitting,
                                busy: isFeedbackSubmitting,
                            }}
                            onPress={() => void handleFeedback(true)}
                        >
                            <Text style={styles.answerButtonText}>
                                맞아요! 이걸로
                            </Text>
                        </Pressable>

                        <Pressable
                            accessibilityRole="button"
                            style={[
                                styles.answerButton,
                                isFeedbackSubmitting && styles.selectedOption,
                            ]}
                            disabled={isFeedbackSubmitting}
                            accessibilityState={{
                                disabled: isFeedbackSubmitting,
                                busy: isFeedbackSubmitting,
                            }}
                            onPress={() => void handleFeedback(false)}
                        >
                            <Text style={styles.answerButtonText}>
                                아니에요, 계속 할래요
                            </Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </SafeAreaView >
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
                    {submitError && (
                        <View style={styles.submitErrorSection}>
                            <Text style={styles.skipText}>{submitError}</Text>
                            <Pressable
                                accessibilityRole="button"
                                style={styles.answerButton}
                                onPress={() => void handleSubmit(answers)}
                            >
                                <Text style={styles.answerButtonText}>
                                    추천 다시 요청하기
                                </Text>
                            </Pressable>
                        </View>
                    )}
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
    resultPage: {
        paddingHorizontal: 23,
        paddingTop: 32,
    },
    resultTitle: {
        fontFamily: Fonts.nonpreferencefood,
        fontSize: 28.5,
        lineHeight: 36,
        color: Colors.textBrown,
        textAlign: "center",
    },
    resultMenuName: {
        fontFamily: Fonts.nonpreferencefood,
        fontSize: 30.13,
        lineHeight: 46,
        color: Colors.textBrown,
        textAlign: "center",
        marginTop: 38,
    },
    submitErrorSection: {
        gap: 12,
        marginBottom: 20,
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
        backgroundColor: Colors.backGrey,
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
        backgroundColor: Colors.backGrey
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
        backgroundColor: Colors.backGrey,
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
        lineHeight: 36,
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
        fontFamily: Fonts.bodyBlack,
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

    recommendationTitle: {
        fontFamily: Fonts.nonpreferencefood,
        fontSize: 25.17,
        lineHeight: 38,
        color: Colors.textSecondary,
        textAlign: "center",
    },

    resultImageCircle: {
        alignSelf: "center",
        width: 216,
        maxWidth: "100%",
        aspectRatio: 1,
        borderRadius: 108,
        backgroundColor: Colors.cardYellow,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
    },

    resultActions: {
        marginTop: 54,
    },
})
