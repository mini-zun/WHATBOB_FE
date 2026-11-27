import { useEffect, useRef, useState } from "react";
import { Linking } from "react-native";
import { WebView } from "react-native-webview";
import { createPlacesWidgetPayload, getNativePlacesWidgetUrl, parsePlacesWidgetMessage, type PlacesListProps } from "@/lib/places_widget";
import PlacesListFallback from "./PlacesListFallback";

export default function GooglePlacesList(props: PlacesListProps) {
  const frame = useRef<WebView>(null);
  const [height, setHeight] = useState(150);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const url = getNativePlacesWidgetUrl();
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  const payload = JSON.stringify(createPlacesWidgetPayload(props));
  const script = `window.WhatbobPlaces?.update(${payload});true;`;

  useEffect(() => {
    if (ready) frame.current?.injectJavaScript(script);
  }, [ready, script]);

  useEffect(() => {
    if (ready || !url || !apiKey) return;
    const timer = setTimeout(() => setFailed(true), 15000);
    return () => clearTimeout(timer);
  }, [ready, url, apiKey]);

  const openExternal = (target: string) => {
    if (/^https:\/\//i.test(target)) void Linking.openURL(target).catch(() => {});
  };

  if (!url || !apiKey || failed) {
    return <PlacesListFallback {...props} message={failed ? "평점 화면을 불러오지 못했어요." : "Google 평점 연결 설정이 필요해요."} />;
  }

  return (
    <WebView
      ref={frame}
      source={{ uri: url }}
      style={{ height, flex: 0, backgroundColor: "transparent" }}
      containerStyle={{ height, flex: 0 }}
      scrollEnabled={false}
      javaScriptEnabled
      originWhitelist={[new URL(url).origin]}
      onError={() => setFailed(true)}
      onHttpError={(event) => {
        const failedUrl = event.nativeEvent.url;
        if (failedUrl === url || failedUrl === url.replace(/\.html(?=$|\?)/, "")) setFailed(true);
      }}
      onLoadEnd={() => frame.current?.injectJavaScript(script)}
      onMessage={(event) => {
        const message = parsePlacesWidgetMessage(event.nativeEvent.data);
        if (!message) return;
        setReady(true);
        if (message.type === "height") setHeight(message.height);
        if (message.type === "select" && !props.disabled &&
            props.places.some((place) => place.kakao_place_id === message.placeId)) {
          void props.onSelectPlace(message.placeId);
        }
      }}
      onShouldStartLoadWithRequest={(request) => {
        if (request.isTopFrame === false || request.url === url || request.url === url.replace(/\.html(?=$|\?)/, "") || request.url === "about:blank") return true;
        openExternal(request.url);
        return false;
      }}
      onOpenWindow={(event) => openExternal(event.nativeEvent.targetUrl)}
    />
  );
}
