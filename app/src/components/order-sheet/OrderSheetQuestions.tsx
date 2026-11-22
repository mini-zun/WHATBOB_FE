import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useRef, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import type { OrderSheetQuestion } from "@/types/order_sheet";

import { orderSheetStyles as styles } from "./orderSheetStyles";

type Props = {
  question: OrderSheetQuestion;
  questionIndex: number;
  totalCount: number;
  selectedOptionId: string | undefined;
  questionTopSpacing: number;
  onBack: () => void;
  onAnswer: (optionId: string) => void;
  children?: ReactNode;
};

export function OrderSheetQuestions({
  question,
  questionIndex,
  totalCount,
  selectedOptionId,
  questionTopSpacing,
  onBack,
  onAnswer,
  children,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      y: 0,
      animated: false,
    });
  }, [questionIndex]);

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
                        onPress={onBack}
                        style={styles.backButton}
                        accessibilityRole="button"
                        accessibilityLabel="뒤로가기"
                    >
                        <Feather name="arrow-left" size={26} color={Colors.maintext} />
                    </Pressable>
                    <View style={styles.progressTrack}>
                        <View style={styles.progressBackground} />
                        <View style={[styles.progressFill, { width: `${((questionIndex + 1) / totalCount) * 100}%` },
                        ]}
                        />
                    </View>

                    <Text style={styles.progressText}>{questionIndex + 1}/{totalCount}</Text>
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
                    {children}
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
                                onPress={() => onAnswer(option.option_id)}
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
                            onPress={() => onAnswer(option.option_id)}
                        >
                            <Text style={styles.skipText}>{option.label} · 건너뛰기</Text>
                        </Pressable>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}