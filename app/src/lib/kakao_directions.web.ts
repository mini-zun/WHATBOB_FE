import type { CurrentLocation } from "./location";
import type { NearbyPlace } from "@/types/places";
import { createKakaoDirectionsUrls } from "./kakao_directions_urls";

export async function openKakaoDirections(place: NearbyPlace, origin: CurrentLocation): Promise<void> {
  const { webUrl } = createKakaoDirectionsUrls(place, origin);
  const tab = window.open("about:blank", "_blank");
  if (!tab) throw new Error("새 탭이 차단됐어요. 팝업을 허용한 뒤 다시 눌러 주세요.");

  try {
    tab.opener = null;
    tab.location.replace(webUrl);
  } catch {
    tab.close();
    throw new Error("카카오맵 길찾기를 열지 못했어요. 다시 시도해 주세요.");
  }
}
