import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RoomStatus } from "@/components/order-sheet/RoomStatus";
import { TieBreakPopup } from "@/components/room/TieBreakPopup";
import { Colors, Fonts } from "@/constants/theme";
import { useRoomSession } from "@/contexts/RoomSessionContext";
import {
  getCandidateImageUrl,
  getCandidateName,
  getRoundResult,
  getSelectedCandidate,
  getTieBreak,
} from "@/lib/room-vote";
import type { RoomCandidate } from "@/lib/rooms";

export default function RoomResultScreen() {
  const { room, requestExit } = useRoomSession();
  const round = room?.current_round;
  const [closedTieBreakRound, setClosedTieBreakRound] = useState<number | null>(null);

  if (!round || round.status !== "RESULT") {
    return <RoomStatus message="결과를 불러오는 중이에요." onExit={requestExit} />;
  }

  const winnerIds = getRoundResult(round).winners.map((winner) => winner.candidate_id);
  const voterCount = Math.max(1, round.voted_member_count || round.active_member_count);
  const showVotes = !round.is_uncontested;
  const tieBreak = closedTieBreakRound === round.round_id ? null : getTieBreak(round);
  const selected = getSelectedCandidate(round);
  const handleGoToMap = () => {
    setClosedTieBreakRound(round.round_id);
    if (!selected) return;
    router.push({
      pathname: "/nearby_places",
      params: {
        menuId: String(selected.menu_id),
        menuName: getCandidateName(selected),
      },
    });
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={requestExit}>
            <Feather name="arrow-left" size={22} />
          </Pressable>
          <View style={styles.headerTextSec}>
            <Text style={styles.headerTitle}>오늘의 메뉴는?</Text>
            <Text style={styles.headerSubtitle}>
              마음에 드는 메뉴를 모두 골라주세요.
            </Text>
          </View>
        </View>
        <ScrollView
          contentContainerStyle={styles.page}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.emptyScroll} />
            <View style={styles.votingSheetBg}>
              <Text style={styles.votingSheetTitle}>투표결과 보기</Text>
              <Image
                source={require("@/assets/images/voting_title.svg")}
                contentFit="contain"
                style={styles.votingTitleImage}
              />
              <View style={styles.votingSec}>
                {round.candidates.map((candidate) => (
                  <ResultItem
                    key={candidate.candidate_id}
                    candidate={candidate}
                    winner={winnerIds.includes(candidate.candidate_id)}
                    showVotes={showVotes}
                    voterCount={voterCount}
                  />
                ))}
              </View>
              <Image
                source={require("@/assets/images/whatbob_icon.svg")}
                contentFit="contain"
                style={styles.votingSheetTopImage}
              />
            </View>
          </View>
        </ScrollView>
        <View style={styles.bottomLayout}>
          <Pressable
            style={[styles.mapButton, !selected && styles.mapButtonDisabled]}
            onPress={handleGoToMap}
            disabled={!selected}
            accessibilityRole="button"
            accessibilityState={{ disabled: !selected }}
          >
            <Text style={styles.mapButtonText}>지도 보러 가기</Text>
          </Pressable>
          <Text style={styles.hintText}>투표는 마감 전까지 바꿀 수 있어요.</Text>
        </View>
      </SafeAreaView>
      {tieBreak && (
        <TieBreakPopup
          candidates={tieBreak.candidates}
          pickedId={tieBreak.pickedId}
          onGoToMap={handleGoToMap}
        />
      )}
    </View>
  );
}

type ResultItemProps = {
  candidate: RoomCandidate;
  winner: boolean;
  showVotes: boolean;
  voterCount: number;
};

function ResultItem({ candidate, winner, showVotes, voterCount }: ResultItemProps) {
  const imageUrl = getCandidateImageUrl(candidate);
  const votes = candidate.final_vote_count ?? 0;
  const ratio = Math.min(1, votes / voterCount);

  return (
    <View style={[styles.resultItemBox, winner && styles.resultItemBoxWinner]}>
      <View style={styles.menuImgSec}>
        {imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            contentFit="contain"
            style={styles.menuImage}
          />
        )}
      </View>
      <View style={styles.resultInfoSec}>
        <Text style={styles.resultMenuText} numberOfLines={1}>
          {getCandidateName(candidate)}
        </Text>
        {showVotes && (
          <View style={styles.votesRow}>
            <View style={styles.votesBarBack}>
              <View style={[styles.votesBarFilled, { width: `${ratio * 100}%` }]} />
            </View>
            <Text style={styles.votesText}>{votes}표</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    paddingHorizontal: 23,
    paddingTop: 27,
    paddingBottom: 26,
    alignItems: "center",
    gap: 19,
    width: "100%",
    maxWidth: 352 + 23 * 2,
    alignSelf: "center",
  },
  headerTitle: {
    fontFamily: Fonts.nonpreferencefood,
    fontSize: 27,
  },
  headerTextSec: {
    flex: 1,
  },
  headerSubtitle: {
    fontFamily: Fonts.nonpreferencefood,
    fontSize: 15,
    color: Colors.textSecondary,
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 2,
  },
  backButton: {
    height: 58,
    width: 55,
    borderRadius: 100,
    backgroundColor: Colors.backGrey,
    justifyContent: "center",
    alignItems: "center",
  },
  page: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  content: {
    width: "100%",
    maxWidth: 352 + 23 * 2,
    paddingHorizontal: 23,
    alignSelf: "center",
  },
  emptyScroll: {
    paddingVertical: 28,
  },
  votingSheetBg: {
    alignSelf: "stretch",
    backgroundColor: Colors.white,
    borderRadius: 33,
    borderColor: Colors.textBrown,
    borderWidth: 2.5,
    marginHorizontal: 10,
    paddingTop: 19,
  },
  votingSheetTitle: {
    fontFamily: Fonts.nonpreferencefood,
    fontSize: 24,
    marginBottom: 20,
    marginLeft: 31,
  },
  votingSheetTopImage: {
    position: "absolute",
    top: -55,
    right: -8,
    width: 104,
    height: 105,
    transform: [{ rotate: "5.5deg" }],
  },
  votingTitleImage: {
    width: 205,
    height: 35,
    marginBottom: 10,
    marginLeft: 29,
  },
  votingSec: {
    alignSelf: "stretch",
    gap: 18,
    marginHorizontal: 17,
    paddingVertical: 18,
  },
  resultItemBox: {
    flexDirection: "row",
    alignSelf: "stretch",
    height: 84,
    borderRadius: 20,
    borderColor: Colors.textBrown,
    borderWidth: 2,
    backgroundColor: Colors.background,
    paddingLeft: 12,
    paddingRight: 25,
    alignItems: "center",
    gap: 9,
  },
  resultItemBoxWinner: {
    backgroundColor: Colors.selectedRed,
  },
  menuImgSec: {
    width: 48,
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.textSecondary,
    backgroundColor: Colors.white,
    overflow: "hidden",
    paddingHorizontal: 6,
  },
  menuImage: {
    width: "100%",
    height: "100%",
  },
  resultInfoSec: {
    flex: 1,
    gap: 6,
  },
  resultMenuText: {
    fontFamily: Fonts.nonpreferencefood,
    fontSize: 23,
  },
  votesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  votesBarBack: {
    flex: 1,
    height: 8,
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
    fontSize: 17,
  },
  mapButton: {
    width: "100%",
    height: 64,
    borderRadius: 999,
    backgroundColor: Colors.textBrown,
    alignItems: "center",
    justifyContent: "center",
  },
  mapButtonDisabled: {
    opacity: 0.5,
  },
  mapButtonText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
    color: Colors.white,
  },
  hintText: {
    fontFamily: Fonts.nonpreferencefood,
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  bottomLayout: {
    width: "100%",
    maxWidth: 352 + 23 * 2,
    marginTop: 10,
    paddingHorizontal: 23,
    gap: 10,
    alignSelf: "center",
    marginBottom: 28,
    alignItems: "center",
  },
});
