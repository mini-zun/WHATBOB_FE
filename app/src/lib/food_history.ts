import { ApiError, apiFetch, resolveAssetUrl } from "./api";

export type FoodHistory = {
  id: number;
  menu_id: number | null;
  menu_name: string;
  eaten_at: string;
  created_at: string;
  image_url: string;
};

export type FoodHistoryData = {
  items: FoodHistory[];
  total_count: number;
};

type FoodHistoryResponse = {
  success: boolean;
  data: FoodHistoryData | null;
  message: string | null;
};

export async function getFoodHistory(
  limit = 50,
  offset = 0,
  signal?: AbortSignal,
): Promise<FoodHistoryData> {
  const result = await apiFetch<FoodHistoryResponse>(
    `/api/users/me/meals?limit=${limit}&offset=${offset}`,
    { signal },
  );
  if (
    result?.success !== true ||
    !result.data ||
    !Array.isArray(result.data.items)
  ) {
    throw new ApiError(
      result?.message || "먹은 음식 기록 응답이 올바르지 않습니다.",
      0,
    );
  }
  return {
    ...result.data,
    items: result.data.items.map((item) => ({
      ...item,
      image_url: resolveAssetUrl(item.image_url),
    })),
  };
}

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

export function formatDaysAgo(dateString: string, now = new Date()) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY);
  if (days <= 0) return "오늘";
  return `${days}일 전`;
}
