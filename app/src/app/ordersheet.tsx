import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Pressable,
  Text,
  View,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { ScrollView as GestureScrollView } from "react-native-gesture-handler";
import { Image } from "expo-image";
import { useEffect, useState, useRef } from "react";
import { orderSheetStyles as styles } from "@/components/order-sheet/orderSheetStyles";
import { OrderSheetQuestions } from "@/components/order-sheet/OrderSheetQuestions";

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
import { getAuthRestartMessage } from "@/lib/auth_recovery";
import { FoodResultCarousel } from "@/components/order-sheet/FoodResultCarousel";

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
  const [authRestartMessage, setAuthRestartMessage] = useState<string | null>(
    null,
  );

  const feedbackInProgress = useRef(false);
  const lastFeedback = useRef(new Map<string, boolean>());

  const availableHeight = height - insets.top - insets.bottom;

  const questionTopSpacing = Math.max(
    32,
    Math.min(146, 146 - (852 - availableHeight)),
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
          lastFeedback.current.clear();
        }
      } catch (error) {
        if (!cancelled) {
          const restartMessage = getAuthRestartMessage(error);
          if (restartMessage) {
            setAuthRestartMessage(restartMessage);
          }

          setError(
            error instanceof Error
              ? error.message
              : "질문을 불러오지 못했습니다.",
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

  const question = questions[questionIndex];

  const currentMenu = recommendation?.recommended_menus[recommendationIndex];

  const selectedOptionId = answers.find(
    (answer) => answer.question_id === question?.id,
  )?.option_id;

  const handleSubmit = async (submittedAnswers: OrderSheetAnswer[]) => {
    if (submitInProgress.current || recommendation) return;

    const hasAllAnswers =
      questions.length > 0 &&
      questions.every((question) =>
        submittedAnswers.some((answer) => answer.question_id === question.id),
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
      lastFeedback.current.clear();
      setRecommendation(data);
    } catch (error) {
      const restartMessage = getAuthRestartMessage(error);
      if (restartMessage) {
        setAuthRestartMessage(restartMessage);
      }

      setSubmitError(
        error instanceof Error ? error.message : "추천 요청에 실패했습니다.",
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
      ...answers.filter((answer) => answer.question_id !== question.id),
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

  const handleReject = async () => {
    if (!recommendation || isAccepted || feedbackInProgress.current) return;

    feedbackInProgress.current = true;
    setIsFeedbackSubmitting(true);
    setFeedbackError(null);

    try {
      for (const menu of recommendation.recommended_menus) {
        const feedbackKey = `${recommendation.recommendation_id}:${menu.menu_id}`;
        if (lastFeedback.current.get(feedbackKey) === false) continue;

        await submitRecommendationFeedback(recommendation.recommendation_id, {
          selected_menu_id: menu.menu_id,
          is_satisfied: false,
        });

        lastFeedback.current.set(feedbackKey, false);
      }

      router.replace("/home");
    } catch (error) {
      const restartMessage = getAuthRestartMessage(error);
      if (restartMessage) {
        setAuthRestartMessage(restartMessage);
      }

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

  const handleFeedback = async (isSatisfied: boolean) => {
    if (!recommendation || !currentMenu || isAccepted) return;

    const feedbackKey = `${recommendation.recommendation_id}:${currentMenu.menu_id}`;

    if (feedbackInProgress.current) return;

    if (lastFeedback.current.get(feedbackKey) === isSatisfied) {
      if (isSatisfied) setIsAccepted(true);
      return;
    }

    feedbackInProgress.current = true;
    setIsFeedbackSubmitting(true);
    setFeedbackError(null);

    try {
      await submitRecommendationFeedback(recommendation.recommendation_id, {
        selected_menu_id: currentMenu.menu_id,
        is_satisfied: isSatisfied,
      });

      lastFeedback.current.set(feedbackKey, isSatisfied);

      if (isSatisfied) {
        setIsAccepted(true);
        return;
      }

      if (recommendationIndex >= recommendation.recommended_menus.length - 1) {
        router.replace("/home");
        return;
      }

      setRecommendationIndex(recommendationIndex + 1);
    } catch (error) {
      const restartMessage = getAuthRestartMessage(error);
      if (restartMessage) {
        setAuthRestartMessage(restartMessage);
      }

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

  if (authRestartMessage) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.page, styles.statusPage]}>
          <Text accessibilityRole="alert" style={styles.skipText}>
            {authRestartMessage}
          </Text>

          <Pressable
            accessibilityRole="button"
            style={styles.answerButton}
            onPress={() => {
              if (typeof window !== "undefined") {
                window.location.replace("/");
              }
            }}
          >
            <Text style={styles.answerButtonText}>인증 다시 시작</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

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

          <Pressable accessibilityRole="button" onPress={() => router.back()}>
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
          <Text style={styles.skipText}>답변에 맞는 메뉴를 찾고 있어요.</Text>
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
          <View style={styles.resultImageCircle}>
            <Image
              source={require("@/assets/images/whatbob_icon.png")}
              contentFit="contain"
              style={styles.characterImage}
            />
          </View>
          <Text style={styles.resultTitle}>
            오늘 메뉴는 {currentMenu.name}!
          </Text>
          <Text style={styles.skipText}>맛있게 드세요.</Text>
          <Pressable
            accessibilityRole="button"
            style={[styles.answerButton, styles.completionButton]}
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
        <View style={resultStyles.header}>
          <Pressable
            onPress={() => router.replace("/home")}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="홈으로 돌아가기"
            disabled={isFeedbackSubmitting}
          >
            <Feather name="arrow-left" size={26} color={Colors.maintext} />
          </Pressable>
          <Text style={resultStyles.headerTitle}>오늘의 메뉴는?</Text>
        </View>

        <GestureScrollView
          style={resultStyles.scroll}
          contentContainerStyle={resultStyles.middle}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <FoodResultCarousel
            key={recommendation.recommendation_id}
            menus={recommendation.recommended_menus}
            onIndexChange={setRecommendationIndex}
            disabled={isFeedbackSubmitting}
          />
        </GestureScrollView>

        <View style={resultStyles.footer}>
          {feedbackError && (
            <Text style={styles.skipText}>{feedbackError}</Text>
          )}

          <Pressable
            accessibilityRole="button"
            style={[
              resultStyles.decideButton,
              isFeedbackSubmitting && styles.selectedOption,
            ]}
            disabled={isFeedbackSubmitting}
            accessibilityState={{
              disabled: isFeedbackSubmitting,
              busy: isFeedbackSubmitting,
            }}
            onPress={() => void handleFeedback(true)}
          >
            <Text style={resultStyles.decideButtonText}>이걸로 정했어요!</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isFeedbackSubmitting}
            accessibilityState={{
              disabled: isFeedbackSubmitting,
              busy: isFeedbackSubmitting,
            }}
            hitSlop={8}
            onPress={() => void handleReject()}
          >
            <Text style={resultStyles.cancelText}>
              마음에 드는 메뉴가 없어요
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <OrderSheetQuestions
      question={question}
      questionIndex={questionIndex}
      totalCount={questions.length}
      selectedOptionId={selectedOptionId}
      questionTopSpacing={questionTopSpacing}
      onBack={handleBack}
      onAnswer={handleAnswer}
    >
      {submitError && (
        <View style={styles.submitErrorSection}>
          <Text style={styles.skipText}>{submitError}</Text>

          <Pressable
            accessibilityRole="button"
            style={styles.answerButton}
            onPress={() => void handleSubmit(answers)}
          >
            <Text style={styles.answerButtonText}>추천 다시 요청하기</Text>
          </Pressable>
        </View>
      )}
    </OrderSheetQuestions>
  );
}

const resultStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 30,
    paddingHorizontal: 30,
  },
  headerTitle: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 26,
    color: Colors.maintext,
  },
  scroll: {
    flex: 1,
  },
  middle: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    paddingHorizontal: 23,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    paddingHorizontal: 23,
    paddingBottom: 24,
    alignItems: "center",
    gap: 8,
  },
  decideButton: {
    width: "100%",
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.textBrown,
    alignItems: "center",
    justifyContent: "center",
  },
  decideButtonText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.white,
  },
  cancelText: {
    fontFamily: Fonts.nonpreferencefood,
    fontSize: 12,
    textDecorationLine: "underline",
    color: Colors.textSecondary,
    marginTop: 10,
  },
});
