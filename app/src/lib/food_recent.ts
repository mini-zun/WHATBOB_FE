import { ApiError, apiFetch, resolveImageUrl } from "./api";

export type RecentFood = {
  food_kind_id: number;
  menu_name: string;
  eaten_at: string;
  image_url: string;
};

export type RecentFoodData = {
  items: RecentFood[];
};

type RecentFoodResponse = {
  success: boolean;
  data: RecentFoodData | null;
  message: string | null;
};

export async function getRecentFood(
  signal?: AbortSignal,
): Promise<RecentFoodData> {
  const result = await apiFetch<RecentFoodResponse>(
    "/api/users/me/home-card-recently-eaten-food-max-6",
    { signal },
  );
  if (
    result?.success !== true ||
    !result.data ||
    !Array.isArray(result.data.items)
  ) {
    throw new ApiError(
      result?.message || "최근에 먹은 메뉴 응답이 올바르지 않습니다.",
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
