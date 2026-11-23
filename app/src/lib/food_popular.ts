import { ApiError, apiFetch, getApiBaseUrl } from "./api";

export type PopularFood = {
  food_kind_id: number;
  name: string;
  image_url: string;
};

export type PopularFoodData = {
  source: "initial" | "aggregated";
  as_of: string | null;
  items: PopularFood[];
};

type PopularFoodResponse = {
  success: boolean;
  data: PopularFoodData | null;
  message: string | null;
};

export async function getPopularFood(
  signal?: AbortSignal,
): Promise<PopularFoodData> {
  const result = await apiFetch<PopularFoodResponse>("/api/menus/popular", {
    auth: false,
    signal,
  });
  if (result?.success !== true || !result.data || !Array.isArray(result.data.items)) {
    throw new ApiError(
      result?.message || "인기 메뉴 응답이 올바르지 않습니다.",
      0,
    );
  }
  const apiBaseUrl = getApiBaseUrl();
  return {
    ...result.data,
    items: result.data.items.map((item) => ({
      ...item,
      image_url: /^https?:\/\//.test(item.image_url)
        ? item.image_url
        : `${apiBaseUrl}${item.image_url.startsWith("/") ? "" : "/"}${item.image_url}`,
    })),
  };
}
