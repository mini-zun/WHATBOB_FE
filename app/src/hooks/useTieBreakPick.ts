export type TieBreakPick = {
  supported: boolean;
  pickedId: number | null;
};

export function useTieBreakPick(): TieBreakPick {
  return { supported: false, pickedId: null };
}
