import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { orderSheetStyles as styles } from "./orderSheetStyles";

type Props = {
  message: string;
  onExit: () => void;
  onRetry?: () => void;
};

export function RoomStatus({ message, onExit, onRetry }: Props) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.page, styles.statusPage]}>
        <Text style={styles.skipText} accessibilityRole="alert">{message}</Text>
        {onRetry && (
          <Pressable accessibilityRole="button" style={styles.answerButton} onPress={onRetry}>
            <Text style={styles.answerButtonText}>다시 시도</Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" onPress={onExit}>
          <Text style={styles.skipText}>나가기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
