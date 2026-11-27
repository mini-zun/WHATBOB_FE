import { getApiBaseUrl } from "./api";
import type { RoomCandidate, RoomRound } from "./rooms";

export function getCandidateName(candidate: RoomCandidate): string {
  return candidate.name ?? candidate.base_name ?? "이름 없는 메뉴";
}

export function getCandidateImageUrl(candidate: RoomCandidate): string | null {
  const value = candidate.image_url?.trim();
  if (!value) return null;
  if (/^https?:\/\//.test(value)) return value;
  try {
    return `${getApiBaseUrl()}${value.startsWith("/") ? "" : "/"}${value}`;
  } catch {
    return null;
  }
}

export type RoomRoundResult = {
  winners: RoomCandidate[];
  ranking: RoomCandidate[];
  isTie: boolean;
  isUncontested: boolean;
  showVoteCounts: boolean;
};

export function getRoundResult(round: RoomRound): RoomRoundResult {
  const winners = round.winners.length > 0
    ? round.winners
    : round.candidates.filter((candidate) => candidate.is_winner);
  const ranking = [...round.candidates].sort(
    (a, b) =>
      (b.final_vote_count ?? 0) - (a.final_vote_count ?? 0) ||
      a.display_order - b.display_order,
  );
  return {
    winners,
    ranking,
    isTie: winners.length > 1,
    isUncontested: round.is_uncontested,
    showVoteCounts: !round.is_uncontested,
  };
}

export function getTiedCandidates(round: RoomRound): RoomCandidate[] | null {
  if (round.is_uncontested) return null;
  const maxVotes = Math.max(
    0,
    ...round.candidates.map((candidate) => candidate.final_vote_count ?? 0),
  );
  if (maxVotes === 0) return null;
  const tied = round.candidates.filter(
    (candidate) => (candidate.final_vote_count ?? 0) === maxVotes,
  );
  return tied.length >= 2 ? tied : null;
}
