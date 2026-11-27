import { useRef, useState } from "react";

import { ApiError } from "@/lib/api";
import { ROOM_ERROR_CODE, submitRoomVotes, type RoomDetail } from "@/lib/rooms";

const CLEAR_SELECTION_CODES: (string | undefined)[] = [
  ROOM_ERROR_CODE.staleVoteRound,
  ROOM_ERROR_CODE.candidateInactive,
];

type Selection = { key: string; ids: number[] };

function isSameSelection(a: number[], b: number[]) {
  return a.length === b.length && a.every((id) => b.includes(id));
}

export function useRoomVote(room: RoomDetail | null, refresh: () => void) {
  const round = room?.current_round ?? null;
  const viewer = room?.viewer_state ?? null;
  const candidates = round?.candidates ?? [];
  const roundKey = round ? `${round.round_id}:${round.vote_round_no ?? 0}` : "";

  const [selection, setSelection] = useState<Selection>({ key: "", ids: [] });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const isVoting = round?.status === "VOTING";
  const isPaused = round?.status === "VOTING_PAUSED";
  const hasVoted = Boolean(
    round && viewer?.has_voted && viewer.round_id === round.round_id,
  );
  const activeIds = new Set(candidates.map((candidate) => candidate.candidate_id));
  const votedIds = hasVoted
    ? (viewer?.voted_candidate_ids ?? []).filter((id) => activeIds.has(id))
    : [];
  const selectedIds = selection.key === roundKey
    ? selection.ids.filter((id) => activeIds.has(id))
    : votedIds;
  const isChanged = hasVoted && !isSameSelection(selectedIds, votedIds);
  const canSelect = isVoting && !submitting;
  const canSubmit = canSelect && selectedIds.length > 0 && (!hasVoted || isChanged);

  const toggle = (candidateId: number) => {
    if (!canSelect || !activeIds.has(candidateId)) return;
    setError(null);
    setSelection((previous) => {
      const ids = previous.key === roundKey ? previous.ids : votedIds;
      return {
        key: roundKey,
        ids: ids.includes(candidateId)
          ? ids.filter((id) => id !== candidateId)
          : [...ids, candidateId],
      };
    });
  };

  const submit = async () => {
    if (!room || !round || !canSubmit || inFlight.current) return false;
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await submitRoomVotes(room.room_id, round, selectedIds);
      refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "투표하지 못했습니다.");
      if (e instanceof ApiError && CLEAR_SELECTION_CODES.includes(e.code)) {
        setSelection({ key: roundKey, ids: [] });
      } else if (
        e instanceof ApiError &&
        e.code === ROOM_ERROR_CODE.voteAlreadySubmitted
      ) {
        setSelection({ key: "", ids: [] });
      }
      if (!(e instanceof ApiError) || e.status !== 0) refresh();
      return false;
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  return {
    round,
    candidates,
    selectedIds,
    toggle,
    submit,
    canSelect,
    canSubmit,
    submitting,
    hasVoted,
    isChanged,
    isVoting,
    isPaused,
    votedCount: round?.voted_member_count ?? 0,
    activeCount: round?.active_member_count ?? 0,
    error,
  };
}
