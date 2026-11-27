import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { SafeAreaView, useSafeAreaInsets} from "react-native-safe-area-context";

import { ApiError } from "@/lib/api";
import {
  ROOM_ERROR_CODE,
  getRoomNoResultsSuggestions,
  getRoomQuestions,
  submitRoomOrderSheet,
  type RoomNoResultsData,
  type RoomNoResultsSuggestion,
  type RoomRoundStatus,
} from "@/lib/rooms";
import type { OrderSheetAnswer, OrderSheetQuestion } from "@/types/order_sheet";
import { OrderSheetQuestions } from "./OrderSheetQuestions";
import { orderSheetStyles as styles } from "./orderSheetStyles";

type Props = {
  roomId: string;
  roundId: number;
  roundNo: number;
  roundStatus: RoomRoundStatus;
  onRefreshRoom: () => void;
  onExit: () => void;
};

export function RoomOrderSheet({
  roomId,
  roundId,
  roundNo,
  roundStatus,
  onRefreshRoom,
  onExit,
}: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [questions, setQuestions] = useState<OrderSheetQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<OrderSheetAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<RoomNoResultsData | null>(null);
  const submitInProgress = useRef(false);

  const availableHeight = height - insets.top - insets.bottom;
  const questionTopSpacing = Math.max(
    32,
    Math.min(146, 146 - (852 - availableHeight)),
  );

  useEffect(() => {
    const controller = new AbortController();

    const loadQuestions = async () => {
      setLoading(true);
      setError(null);
      setNotice(null);

      try {
        const data = await getRoomQuestions(
          roomId,
          controller.signal,
        );

        if (controller.signal.aborted) return;

        if (data.round_id !== roundId) {
          throw new Error("라운드가 변경됐습니다. 방 상태를 다시 확인해 주세요.");
        }

        if (data.has_submitted) {
          onRefreshRoom();
          setNotice("이미 주문서를 제출했습니다.");
          return;
        }

        if (data.round_status !== "ANSWERING" && data.round_status !== "ANSWERING_PAUSED") {
          onRefreshRoom();
          setNotice("현재 주문서에 답변할 수 있는 단계가 아닙니다.");
          return;
        }

        if (data.round_status === "ANSWERING_PAUSED") onRefreshRoom();

        if (!Array.isArray(data.questions) || data.questions.length === 0) {
          throw new Error("표시할 질문이 없습니다.");
        }

        setQuestions(data.questions);
        setQuestionIndex(0);
        setAnswers([]);
      } catch (error) {
        if (controller.signal.aborted) return;

        onRefreshRoom();
        setError(
          error instanceof Error
            ? error.message
            : "질문을 불러오지 못했습니다.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadQuestions();

    return () => controller.abort();
  }, [roomId, roundId, retryCount, onRefreshRoom]);

  const question = questions[questionIndex];

  const selectedOptionId = answers.find(
    (answer) => answer.question_id === question?.id,
  )?.option_id;

  const handleSubmit = async (submittedAnswers: OrderSheetAnswer[]) => {
    if (submitInProgress.current || roundStatus !== "ANSWERING") return;

    submitInProgress.current = true;
    setSubmitting(true);
    setSubmitError(null);
    setSuggestions(null);

    const round = { round_id: roundId, round_no: roundNo };

    try {
      await submitRoomOrderSheet(roomId, round, submittedAnswers);
      onRefreshRoom();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "주문서를 제출하지 못했습니다.",
      );

      if (
        error instanceof ApiError &&
        error.code === ROOM_ERROR_CODE.noMatchingMenus
      ) {
        try {
          setSuggestions(
            await getRoomNoResultsSuggestions(roomId, round, submittedAnswers),
          );
        } catch {
          setSuggestions(null);
        }
      } else {
        onRefreshRoom();
      }
    } finally {
      submitInProgress.current = false;
      setSubmitting(false);
    }
  };

  const handleAnswer = (optionId: string) => {
    if (!question || roundStatus !== "ANSWERING" || submitInProgress.current) {
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
    setSuggestions(null);

    if (questionIndex < questions.length - 1) {
      setQuestionIndex(questionIndex + 1);
      return;
    }

    void handleSubmit(nextAnswers);
  };

  const applySuggestion = (suggestion: RoomNoResultsSuggestion) => {
    const nextAnswers = answers.map((answer) =>
      answer.question_id === suggestion.question_id
        ? { ...answer, option_id: suggestion.replacement_option_id }
        : answer,
    );
    setAnswers(nextAnswers);
    void handleSubmit(nextAnswers);
  };

  const reviewAnswers = () => {
    if (submitInProgress.current) return;
    setSubmitError(null);
    setSuggestions(null);
    setQuestionIndex(0);
  };

  const handleBack = () => {
    if (submitInProgress.current) return;
    if (questionIndex === 0) {
      onExit();
      return;
    }

    setQuestionIndex((previous) => previous - 1);
  };

  if (loading || error || notice || !question) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.page, styles.statusPage]}>
          <Text style={styles.skipText}>
            {loading
              ? "질문을 불러오는 중이에요."
              : error || notice || "표시할 질문이 없습니다."}
          </Text>

          {!loading && error && (
            <Pressable
              accessibilityRole="button"
              style={styles.answerButton}
              onPress={() => setRetryCount((previous) => previous + 1)}
            >
              <Text style={styles.answerButtonText}>다시 시도</Text>
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={onExit}
          >
            <Text style={styles.skipText}>나가기</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isLastQuestion = questionIndex === questions.length - 1;

  return (
    <OrderSheetQuestions
      question={question}
      questionIndex={questionIndex}
      totalCount={questions.length}
      selectedOptionId={selectedOptionId}
      questionTopSpacing={questionTopSpacing}
      onBack={handleBack}
      onAnswer={handleAnswer}
      disabled={roundStatus !== "ANSWERING" || submitting}
    >
      {roundStatus === "ANSWERING_PAUSED" && (
        <Text style={styles.skipText} accessibilityRole="alert">
          참여자 퇴장으로 잠시 멈췄어요. 방장의 결정을 기다려 주세요.
        </Text>
      )}
      {submitting && (
        <Text style={styles.skipText}>주문서를 제출하는 중이에요.</Text>
      )}
      {!submitting && submitError && (
        <Text style={styles.skipText} accessibilityRole="alert">
          {submitError}
        </Text>
      )}
      {!submitting && suggestions?.suggested_answer_changes.map((suggestion) => (
        <Pressable
          key={`${suggestion.question_id}:${suggestion.replacement_option_id}`}
          accessibilityRole="button"
          style={styles.answerButton}
          onPress={() => applySuggestion(suggestion)}
        >
          <Text style={styles.answerButtonText}>{suggestion.display_text}</Text>
        </Pressable>
      ))}
      {!submitting && suggestions?.can_review_my_answers && (
        <Pressable accessibilityRole="button" onPress={reviewAnswers}>
          <Text style={styles.skipText}>내 답변 다시 보기</Text>
        </Pressable>
      )}
      {!submitting && submitError && !suggestions && isLastQuestion &&
        selectedOptionId !== undefined && roundStatus === "ANSWERING" && (
        <Pressable
          accessibilityRole="button"
          style={styles.answerButton}
          onPress={() => void handleSubmit(answers)}
        >
          <Text style={styles.answerButtonText}>다시 제출하기</Text>
        </Pressable>
      )}
    </OrderSheetQuestions>
  );
}
