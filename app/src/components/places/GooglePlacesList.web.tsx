import { useEffect, useRef, useState } from "react";
import { createPlacesWidgetPayload, parsePlacesWidgetMessage, type PlacesListProps } from "@/lib/places_widget";
import PlacesListFallback from "./PlacesListFallback";

export default function GooglePlacesList(props: PlacesListProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(150);
  const [failed, setFailed] = useState(false);
  const acknowledged = useRef(false);
  const latest = useRef(props);
  const payload = JSON.stringify(createPlacesWidgetPayload(props));
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => { latest.current = props; }, [props]);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== frame.current?.contentWindow) return;
      const message = parsePlacesWidgetMessage(event.data);
      if (!message) return;
      acknowledged.current = true;
      if (message.type === "height") setHeight(message.height);
      if (message.type === "select" && !latest.current.disabled &&
          latest.current.places.some((place) => place.kakao_place_id === message.placeId)) {
        void latest.current.onSelectPlace(message.placeId);
      }
    };
    window.addEventListener("message", receive);
    const timer = setTimeout(() => { if (!acknowledged.current) setFailed(true); }, 15000);
    return () => { window.removeEventListener("message", receive); clearTimeout(timer); };
  }, [origin]);

  useEffect(() => {
    frame.current?.contentWindow?.postMessage(JSON.parse(payload), origin);
  }, [payload, origin]);

  if (!process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || failed) {
    return <PlacesListFallback {...props} message={failed ? "평점 화면을 불러오지 못했어요." : "Google 평점 키가 설정되지 않았어요."} />;
  }

  return (
    <iframe
      ref={frame}
      src="/google-place-ratings.html"
      title="주변 음식점과 Google 평점"
      onLoad={() => frame.current?.contentWindow?.postMessage(JSON.parse(payload), origin)}
      onError={() => setFailed(true)}
      sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      style={{ width: "100%", height, border: 0, display: "block", background: "transparent" }}
    />
  );
}
