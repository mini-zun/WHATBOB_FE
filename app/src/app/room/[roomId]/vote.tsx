import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RoomStatus } from "@/components/order-sheet/RoomStatus";
import { Colors, Fonts } from "@/constants/theme";
import { useRoomSession } from "@/contexts/RoomSessionContext";
import { useRoomVote } from "@/hooks/useRoomVote";
import { getCandidateImageUrl, getCandidateName } from "@/lib/room-vote";

export default function RoomVoteScreen() {
  const { room, refresh, requestExit } = useRoomSession();
  const vote = useRoomVote(room, refresh);

  if (!vote.round) {
    return (
      <RoomStatus message="투표 정보를 불러오는 중이에요." onExit={requestExit} />
    );
  }

  const getButtonLabel = () => {
    if (vote.submitting) return vote.hasVoted ? "수정하는 중…" : "투표하는 중…";
    if (vote.isPaused) return "방장의 결정을 기다리는 중";
    if (vote.isChanged) return "투표 수정하기";
    if (vote.hasVoted) return `투표 완료 (${vote.votedCount}/${vote.activeCount})`;
    return "투표하기";
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={requestExit}>
          <Feather name="arrow-left" size={22} />
        </Pressable>
        <View style={styles.headerTextSec}>
          <Text style={styles.headerTitle}>오늘의 메뉴는?</Text>
          <Text style={styles.headerSubtitle}>
            마음에 드는 메뉴를 모두 골라주세요
          </Text>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.page}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* <View style={styles.titleSec}>
              <Text style={styles.contentTitle}>오늘의 메뉴는?</Text>
              <Text style={styles.contentSubtitle}>
                마음에 드는 메뉴를 모두 골라주세요.
              </Text>
            </View> */}
          <View style={styles.emptyScroll} />
          <View style={styles.votingSheetBg}>
            <Text style={styles.votingSheetTitle}>투표 용지</Text>
            <Image
              source={require("@/assets/images/voting_title.svg")}
              contentFit="contain"
              style={styles.votingTitleImage}
            />
            <View style={styles.votingSec}>
              {vote.candidates.map((candidate) => (
                <VotingItem
                  key={candidate.candidate_id}
                  menu={getCandidateName(candidate)}
                  imageUrl={getCandidateImageUrl(candidate)}
                  selected={vote.selectedIds.includes(candidate.candidate_id)}
                  disabled={!vote.canSelect}
                  onPress={() => vote.toggle(candidate.candidate_id)}
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
        {vote.error ? (
          <Text style={styles.statusText} accessibilityRole="alert">
            {vote.error}
          </Text>
        ) : (
          <></>
        )}
        <Pressable
          style={[styles.voteButton, !vote.canSubmit && styles.voteButtonDisabled]}
          onPress={() => void vote.submit()}
          disabled={!vote.canSubmit}
          accessibilityRole="button"
          accessibilityState={{ disabled: !vote.canSubmit, busy: vote.submitting }}
        >
          <Text style={styles.voteButtonText}>{getButtonLabel()}</Text>
        </Pressable>
        <Text style={styles.hintText}>투표는 마감 전까지 바꿀 수 있어요.</Text>
      </View>
    </SafeAreaView>
  );
}

type VotingItemProps = {
  menu: string;
  imageUrl: string | null;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
};

function VotingItem({
  menu,
  imageUrl,
  selected,
  disabled,
  onPress,
}: VotingItemProps) {
  return (
    <Pressable
      style={styles.votingItemBox}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
    >
      <View style={styles.votingItemBoxTitleSec}>
        <View style={styles.menuImgSec}>
          {imageUrl && (
            <Image
              source={{ uri: imageUrl }}
              contentFit="contain"
              style={styles.menuImage}
            />
          )}
        </View>
        <Text style={styles.votingItemMenuText}>{menu}</Text>
      </View>
      {selected ? (
        <View style={[styles.emptySelect, styles.filledSelect]}>
          <Feather name="check" size={18} color={Colors.background} />
        </View>
      ) : (
        <View style={styles.emptySelect} />
      )}
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
    backgroundColor: "#F0EFE3",
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
  votingItemBox: {
    flexDirection: "row",
    alignSelf: "stretch",
    height: 84,
    borderRadius: 20,
    borderColor: Colors.textBrown,
    borderWidth: 2,
    backgroundColor: Colors.background,
    paddingLeft: 12,
    paddingRight: 15,
    alignItems: "center",
    justifyContent: "space-between",
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
  emptySelect: {
    width: 33,
    height: 33,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: Colors.textSecondary,
  },
  filledSelect: {
    width: 33,
    height: 33,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: Colors.textSecondary,
    backgroundColor: Colors.textBrown,
    alignItems: "center",
    justifyContent: "center",
  },
  votingSec: {
    alignSelf: "stretch",
    gap: 18,
    marginHorizontal: 17,
    paddingVertical: 18,
  },
  votingItemBoxTitleSec: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  votingItemMenuText: {
    fontFamily: Fonts.nonpreferencefood,
    fontSize: 23,
  },
  voteButton: {
    width: "100%",
    height: 64,
    borderRadius: 999,
    backgroundColor: Colors.textBrown,
    alignItems: "center",
    justifyContent: "center",
  },
  voteButtonDisabled: {
    opacity: 0.5,
  },
  voteButtonText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
    color: Colors.white,
  },
  statusText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: Colors.errorText,
    textAlign: "center",
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
