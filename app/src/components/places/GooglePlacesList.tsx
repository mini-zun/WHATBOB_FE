import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Linking, useWindowDimensions, View } from "react-native";
import { WebView } from "react-native-webview";
import { createPlacesWidgetPayload, getNativePlacesWidgetUrl, parsePlacesWidgetMessage, type PlacesListProps } from "@/lib/places_widget";
import PlacesListFallback from "./PlacesListFallback";

export default function GooglePlacesList(props: PlacesListProps) {
  const frame = useRef<WebView>(null);
  const container = useRef<View>(null);
  const { height: windowHeight } = useWindowDimensions();
  const viewport = useRef({ top: 0, bottom: 0 });
  const measurement = useRef(0);
  const [height, setHeight] = useState(150);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const url = getNativePlacesWidgetUrl();
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  const payload = JSON.stringify(createPlacesWidgetPayload(props));
  const sendPayload = useCallback(() => {
    const data = JSON.stringify({ ...JSON.parse(payload), viewport: viewport.current });
    frame.current?.injectJavaScript(`window.WhatbobPlaces?.update(${data});true;`);
  }, [payload]);

  const measureViewport = useCallback(() => {
    const currentMeasurement = ++measurement.current;
    container.current?.measureInWindow((_x, y, _width, viewHeight) => {
      if (currentMeasurement !== measurement.current) return;
      const top = Math.max(0, -y);
      const bottom = Math.max(0, Math.min(viewHeight, windowHeight - y));
      if (viewport.current.top === top && viewport.current.bottom === bottom) return;
      viewport.current = { top, bottom };
      frame.current?.injectJavaScript(`window.WhatbobPlaces?.setViewport?.(${JSON.stringify(viewport.current)});true;`);
    });
  }, [windowHeight]);

  useImperativeHandle(props.viewportRef, () => ({ updateViewport: measureViewport }), [measureViewport]);

  useEffect(() => { measureViewport(); }, [measureViewport, height]);

  useEffect(() => {
    if (ready) sendPayload();
  }, [ready, sendPayload]);

  useEffect(() => {
    if (ready || !url || !apiKey) return;
    const timer = setTimeout(() => setFailed(true), 15000);
    return () => clearTimeout(timer);
  }, [ready, url, apiKey]);

  const openExternal = (target: string) => {
    if (/^https:\/\//i.test(target)) void Linking.openURL(target).catch(() => {});
  };

  if (!url || !apiKey || failed) {
    return <PlacesListFallback {...props} message={failed ? "평점을 불러오지 못했어요." : undefined} />;
  }

  return (
    <View ref={container} collapsable={false} onLayout={measureViewport} style={{ height }}>
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
        onLoadEnd={sendPayload}
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
    </View>
  );
}
