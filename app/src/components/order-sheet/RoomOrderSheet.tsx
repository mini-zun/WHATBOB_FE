import { useEffect, useState } from "react";
import {
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { SafeAreaView, useSafeAreaInsets} from "react-native-safe-area-context";

import { getRoomQuestions } from "@/lib/rooms";
import type { OrderSheetAnswer, OrderSheetQuestion } from "@/types/order_sheet";
import { OrderSheetQuestions } from "./OrderSheetQuestions";
import { orderSheetStyles as styles } from "./orderSheetStyles";

type Props = {
  roomId: string;
  roundId: number;
  onExit: () => void;
};

export function RoomOrderSheet({
  roomId,
  roundId,
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
          setNotice("이미 주문서를 제출했습니다.");
          return;
        }

        if (data.round_status !== "ANSWERING") {
          setNotice("현재 주문서에 답변할 수 있는 단계가 아닙니다.");
          return;
        }

        if (!Array.isArray(data.questions) || data.questions.length === 0) {
          throw new Error("표시할 질문이 없습니다.");
        }

        setQuestions(data.questions);
        setQuestionIndex(0);
        setAnswers([]);
      } catch (error) {
        if (controller.signal.aborted) return;

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
  }, [roomId, roundId, retryCount]);

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
      setQuestionIndex((previous) => previous + 1);
    }
  };

  const handleBack = () => {
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
    >
      {isLastQuestion && selectedOptionId !== undefined && (
        <Text style={styles.skipText}>
          제출 기능 준비 중
        </Text>
      )}
    </OrderSheetQuestions>
  );
}   