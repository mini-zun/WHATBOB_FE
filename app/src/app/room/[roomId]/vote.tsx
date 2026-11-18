import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import { Feather } from "@expo/vector-icons";

import { Colors, Fonts } from "@/constants/theme";

const handleBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/home");
};

const MOCK_MENUS = [
  { id: 1, name: "김치찌개", votes: 2 },
  { id: 2, name: "돈까스", votes: 1 },
  { id: 3, name: "마라탕", votes: 0 },
]; // 더미데이터 제거 필요

export default function RoomVoteScreen() {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const maxVotes = Math.max(1, ...MOCK_MENUS.map((m) => m.votes)); // 수정 필요

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Feather name="arrow-left" size={22} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.page} bounces={false}>
        <View style={styles.content}>
          <View style={styles.titleSec}>
            <Text style={styles.contentTitle}>오늘의 메뉴는?</Text>
            <Text style={styles.contentSubtitle}>
              마음에 드는 메뉴를 모두 골라주세요.
            </Text>
          </View>
          <View style={{ gap: 12 }}>
            {MOCK_MENUS.map((m) => (
              <VotingItem
                key={m.id}
                menu={m.name}
                votes={m.votes}
                ratio={m.votes / maxVotes}
                selected={selectedIds.has(m.id)}
                onPress={() => toggleSelect(m.id)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
      <View style={styles.bottomLayout}>
        <Pressable style={styles.voteButton}>
          <Text style={styles.voteButtonText}>투표하기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

type VotingItemProps = {
  menu: string;
  votes: number;
  ratio: number;
  selected: boolean;
  onPress: () => void;
};

function VotingItem({
  menu,
  votes,
  ratio,
  selected,
  onPress,
}: VotingItemProps) {
  return (
    <Pressable
      style={[styles.votingItemBox, selected && styles.votingItemBoxSelected]}
      onPress={onPress}
    >
      <View style={styles.votingItemBoxTitleSec}>
        {selected ? (
          <View style={[styles.emptySelect, styles.filledSelect]}>
            <Feather name="check" size={18} color={Colors.background} />
          </View>
        ) : (
          <View style={styles.emptySelect} />
        )}
        <View style={styles.menuAndVoteSec}>
          <Text style={styles.votingItemMenuText}>{menu}</Text>
          <View style={styles.votesBarBack}>
            <View
              style={[styles.votesBarFilled, { width: `${ratio * 100}%` }]}
            />
          </View>
        </View>
      </View>
      <Text style={styles.votesText}>{votes}표</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    paddingHorizontal: 23,
    paddingTop: 27,
    paddingBottom: 10,
    alignItems: "center",
    gap: 28,
    width: "100%",
    maxWidth: 352 + 23 * 2,
    alignSelf: "center",
  },
  backButton: {
    height: 58,
    width: 55,
    borderRadius: 100,
    backgroundColor: "#F0EFE3",
    justifyContent: "center",
    alignItems: "center",
  },
  page: {
    flexGrow: 1,
    paddingHorizontal: 23,
    alignItems: "center",
  },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 352,
    // alignItems: "center",
  },
  titleSec: {
    marginBottom: 41,
  },
  contentTitle: {
    fontFamily: Fonts.nonpreferencefood,
    fontSize: 27,
  },
  contentSubtitle: {
    fontFamily: Fonts.nonpreferencefood,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  votingItemBox: {
    flexDirection: "row",
    width: "100%",
    height: 93,
    borderRadius: 20,
    borderColor: Colors.textBrown,
    borderWidth: 2,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "space-between",
  },
  votingItemBoxSelected: {
    flexDirection: "row",
    width: "100%",
    height: 93,
    borderRadius: 20,
    borderColor: Colors.textBrown,
    borderWidth: 2,
    backgroundColor: Colors.selectedRed,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "space-between",
  },
  emptySelect: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: Colors.textSecondary,
  },
  filledSelect: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: Colors.textSecondary,
    backgroundColor: Colors.textBrown,
    alignItems: "center",
    justifyContent: "center",
  },
  votingItemBoxTitleSec: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  menuAndVoteSec: {
    gap: 12,
    marginBottom: 16,
  },
  votingItemMenuText: {
    fontFamily: Fonts.nonpreferencefood,
    fontSize: 15,
  },
  votesBarBack: {
    width: 200,
    height: 10,
    borderRadius: 999,
    backgroundColor: Colors.backGrey,
    overflow: "hidden",
  },
  votesBarFilled: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: Colors.textBrown,
  },
  votesText: {
    fontFamily: Fonts.nonpreferencefood,
    fontSize: 21,
  },
  voteButton: {
    width: "100%",
    height: 64,
    borderRadius: 999,
    backgroundColor: Colors.textBrown,
    alignItems: "center",
    justifyContent: "center",
  },
  voteButtonText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
    color: Colors.white,
  },
  bottomLayout: {
    width: "100%",
    maxWidth: 352 + 23 * 2, // header·content와 동일한 폭
    paddingHorizontal: 23,
    gap: 10,
    alignSelf: "center",
    marginBottom: 28,
    alignItems: "center",
  },
});
