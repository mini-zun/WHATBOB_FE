import { ApiError, apiFetch, resolveImageUrl } from "./api";

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

type FoodHistoryCreateResponse = {
  success: boolean;
  data: FoodHistory | null;
  message: string | null;
};

export function createMealKey(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
}

export function getFoodHistoryOperationKey(
  menuId: number,
  recommendationId?: string,
  mealKey?: string,
): string | null {
  if (!Number.isSafeInteger(menuId) || menuId <= 0) return null;

  const parsedRecommendationId = Number(recommendationId);
  if (
    typeof recommendationId === "string" &&
    Number.isSafeInteger(parsedRecommendationId) &&
    parsedRecommendationId > 0
  ) {
    return `meal:recommendation:${parsedRecommendationId}:${menuId}`;
  }

  if (typeof mealKey === "string" && /^[a-z0-9]{8,24}$/.test(mealKey)) {
    return `meal:visit:${mealKey}:${menuId}`;
  }

  return null;
}

export function getRoomFoodHistoryOperationKey(
  roomId: string,
  roundId: number,
  menuId: number,
): string | null {
  const room = roomId.replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(room)) return null;
  if (!Number.isSafeInteger(roundId) || roundId <= 0) return null;
  if (!Number.isSafeInteger(menuId) || menuId <= 0) return null;

  const key = `meal:room:${room}:${roundId}:${menuId}`;
  return key.length <= 64 ? key : null;
}

export async function recordFoodHistory(
  menuId: number,
  idempotencyKey: string,
): Promise<FoodHistory> {
  const result = await apiFetch<FoodHistoryCreateResponse>(
    "/api/users/me/meals",
    {
      method: "POST",
      body: { menu_id: menuId },
      headers: { "Idempotency-Key": idempotencyKey },
    },
  );
  if (
    result?.success !== true ||
    !result.data ||
    !Number.isSafeInteger(result.data.id) ||
    result.data.id <= 0 ||
    result.data.menu_id !== menuId
  ) {
    throw new ApiError(
      result?.message || "먹은 음식 기록을 저장하지 못했어요.",
      0,
    );
  }
  return result.data;
}

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
      image_url: resolveImageUrl(item.image_url),
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
