import type { CurrentLocation } from "./location";
import type { NearbyPlace } from "@/types/places";

function isValidLocation(location: CurrentLocation): boolean {
  return Number.isFinite(location.latitude) && Math.abs(location.latitude) <= 90 &&
    Number.isFinite(location.longitude) && Math.abs(location.longitude) <= 180;
}

export function createKakaoDirectionsUrls(place: NearbyPlace, origin: CurrentLocation) {
  if (!isValidLocation(origin) || !isValidLocation(place)) {
    throw new Error("길찾기에 필요한 위치 정보가 올바르지 않아요.");
  }

  const appUrl = `kakaomap://route?sp=${origin.latitude},${origin.longitude}&ep=${place.latitude},${place.longitude}&by=foot`;
  let webUrl: string | null = null;
  try {
    const provided = new URL(place.walking_directions_url);
    if (provided.protocol === "https:" && provided.hostname === "map.kakao.com" &&
        !provided.port && !provided.username && !provided.password &&
        !provided.search && !provided.hash && provided.pathname.startsWith("/link/by/walk/")) {
      webUrl = provided.href;
    }
  } catch {}

  if (!webUrl) {
    const name = place.name.replace(/[,/]/g, " ").trim().replace(/\s+/g, " ") || "도착지";
    const start = `${encodeURIComponent("내 위치")},${origin.latitude},${origin.longitude}`;
    const end = `${encodeURIComponent(name)},${place.latitude},${place.longitude}`;
    webUrl = `https://map.kakao.com/link/by/walk/${start}/${end}`;
  }

  return { appUrl, webUrl };
}
