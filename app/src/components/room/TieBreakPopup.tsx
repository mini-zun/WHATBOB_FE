import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors, Fonts } from "@/constants/theme";
import { getCandidateImageUrl, getCandidateName } from "@/lib/room-vote";
import type { RoomCandidate } from "@/lib/rooms";

const LOOPS = 3;
const START_DELAY = 400;
const FASTEST_STEP = 70;
const SLOWEST_STEP = 480;
const RESULT_DELAY = 600;

function getStepDelay(step: number, totalSteps: number) {
  const progress = step / totalSteps;
  return FASTEST_STEP + progress * progress * (SLOWEST_STEP - FASTEST_STEP);
}

type Props = {
  candidates: RoomCandidate[];
  pickedId: number | null;
  onGoToMap: () => void;
};

export function TieBreakPopup({ candidates, pickedId, onGoToMap }: Props) {
  const count = candidates.length;
  const foundIndex = candidates.findIndex(
    (candidate) => candidate.candidate_id === pickedId,
  );
  const pickedIndex = foundIndex >= 0 ? foundIndex : null;
  const [activeIndex, setActiveIndex] = useState(0);
  const [done, setDone] = useState(false);
  const stepRef = useRef(0);

  useEffect(() => {
    if (count === 0) return;
    let timer: ReturnType<typeof setTimeout>;
    const firstDelay = stepRef.current === 0 ? START_DELAY : FASTEST_STEP;

    if (pickedIndex === null) {
      const spin = () => {
        stepRef.current += 1;
        setActiveIndex(stepRef.current % count);
        timer = setTimeout(spin, FASTEST_STEP);
      };
      timer = setTimeout(spin, firstDelay);
      return () => clearTimeout(timer);
    }

    const start = stepRef.current;
    const offset = (((pickedIndex - (start % count)) % count) + count) % count;
    const totalSteps = count * LOOPS + offset;
    const end = start + totalSteps;

    const tick = () => {
      stepRef.current += 1;
      setActiveIndex(stepRef.current % count);
      if (stepRef.current >= end) {
        timer = setTimeout(() => setDone(true), RESULT_DELAY);
        return;
      }
      timer = setTimeout(tick, getStepDelay(stepRef.current - start, totalSteps));
    };

    timer = setTimeout(tick, firstDelay);
    return () => clearTimeout(timer);
  }, [count, pickedIndex]);

  const picked = pickedIndex === null ? null : candidates[pickedIndex];

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Text style={styles.title}>공동 1위가 나왔어요!</Text>
        <Text style={styles.subtitle} accessibilityLiveRegion="polite">
          {done && picked
            ? `오늘의 메뉴는 ${getCandidateName(picked)}!`
            : "랜덤으로 오늘의 메뉴를 고르는 중이에요"}
        </Text>
        <View style={styles.list}>
          {candidates.map((candidate, index) => (
            <TieBreakItem
              key={candidate.candidate_id}
              candidate={candidate}
              active={index === activeIndex}
              picked={done && pickedIndex !== null && index === pickedIndex}
            />
          ))}
        </View>
        <Pressable
          style={[styles.button, !done && styles.buttonDisabled]}
          onPress={onGoToMap}
          disabled={!done}
          accessibilityRole="button"
          accessibilityState={{ disabled: !done, busy: !done }}
        >
          <Text style={styles.buttonText}>{done ? "지도 보러 가기" : "고르는 중…"}</Text>
        </Pressable>
        <Image
          source={require("@/assets/images/whatbob_icon.svg")}
          contentFit="contain"
          style={styles.bowlImage}
        />
      </View>
    </View>
  );
}

type TieBreakItemProps = {
  candidate: RoomCandidate;
  active: boolean;
  picked: boolean;
};

function TieBreakItem({ candidate, active, picked }: TieBreakItemProps) {
  const imageUrl = getCandidateImageUrl(candidate);
  return (
    <View
      style={[
        styles.item,
        active && styles.itemActive,
        picked && styles.itemPicked,
      ]}
    >
      <View style={styles.menuImgSec}>
        {imageUrl && (
          <Image source={{ uri: imageUrl }} contentFit="contain" style={styles.menuImage} />
        )}
      </View>
      <Text style={styles.menuText} numberOfLines={1}>
        {getCandidateName(candidate)}
      </Text>
      {candidate.final_vote_count !== null && (
        <Text style={styles.votesText}>{candidate.final_vote_count}표</Text>
      )}
      {picked && (
        <View style={styles.check}>
          <Feather name="check" size={16} color={Colors.background} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: Colors.white,
    borderRadius: 30,
    borderColor: Colors.textBrown,
    borderWidth: 2.5,
    paddingTop: 26,
    paddingBottom: 20,
    paddingHorizontal: 18,
  },
  bowlImage: {
    position: "absolute",
    top: -55,
    right: -8,
    width: 104,
    height: 105,
    transform: [{ rotate: "5.5deg" }],
  },
  title: {
    fontFamily: Fonts.nonpreferencefood,
    fontSize: 23,
    marginLeft: 6,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: Fonts.nonpreferencefood,
    fontSize: 15,
    color: Colors.textSecondary,
    marginLeft: 6,
    marginBottom: 16,
  },
  list: {
    gap: 10,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 70,
    borderRadius: 18,
    borderColor: Colors.textBrown,
    borderWidth: 2,
    backgroundColor: Colors.background,
    paddingLeft: 10,
    paddingRight: 14,
  },
  itemActive: {
    backgroundColor: Colors.selectedRed,
  },
  itemPicked: {
    borderWidth: 3,
  },
  menuImgSec: {
    width: 44,
    height: 44,
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
  menuText: {
    flex: 1,
    fontFamily: Fonts.nonpreferencefood,
    fontSize: 20,
  },
  votesText: {
    fontFamily: Fonts.nonpreferencefood,
    fontSize: 17,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: Colors.textBrown,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    height: 58,
    borderRadius: 999,
    backgroundColor: Colors.textBrown,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.white,
  },
});
