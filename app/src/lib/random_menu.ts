import { ApiError, apiFetch, resolveImageUrl } from "./api";

export type RandomMenu = {
  menu_id: number;
  food_code: string;
  name: string;
  base_name: string;
  image_url: string;
};

type RandomMenuResponse = {
  success: boolean;
  data: { selected_menu: RandomMenu } | null;
  message: string | null;
};

async function fetchRandomMenu(query: string, signal?: AbortSignal) {
  const result = await apiFetch<RandomMenuResponse>(
    `/api/recommendations/random${query ? `?${query}` : ""}`,
    { signal },
  );
  if (result?.success !== true || !result.data?.selected_menu) {
    throw new ApiError(
      result?.message || "랜덤 메뉴 응답이 올바르지 않습니다.",
      0,
    );
  }
  const menu = result.data.selected_menu;
  return { ...menu, image_url: resolveImageUrl(menu.image_url) };
}

const MAX_RETRY = 3;

export async function getRandomMenu(
  exclusions: string[] = [],
  seenFoodList: string[] = [],
  signal?: AbortSignal,
): Promise<RandomMenu> {
  const query = exclusions
    .map((keyword) => `exclusions=${encodeURIComponent(keyword)}`)
    .join("&");

  let menu = await fetchRandomMenu(query, signal);
  for (let i = 0; i < MAX_RETRY && seenFoodList.includes(menu.name); i++) {
    menu = await fetchRandomMenu(query, signal);
  }

  return menu;
}
