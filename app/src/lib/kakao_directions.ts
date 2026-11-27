import * as Linking from "expo-linking";
import type { CurrentLocation } from "./location";
import type { NearbyPlace } from "@/types/places";
import { createKakaoDirectionsUrls } from "./kakao_directions_urls";

export async function openKakaoDirections(place: NearbyPlace, origin: CurrentLocation): Promise<void> {
  const { appUrl, webUrl } = createKakaoDirectionsUrls(place, origin);
  try {
    await Linking.openURL(appUrl);
    return;
  } catch {}

  try {
    await Linking.openURL(webUrl);
  } catch {
    throw new Error("카카오맵 길찾기를 열지 못했어요. 다시 시도해 주세요.");
  }
}
