"use dom";

import type { DOMProps } from "expo/dom";
import { useEffect, useRef, useState } from "react";
import { loadKakaoMaps } from "@/lib/kakao_maps";
import type { NearbyPlace } from "@/types/places";

type Props = {
    latitude: number;
    longitude: number;
    dom?: DOMProps;
    places: NearbyPlace[];
};

export default function NearbyPlacesMap({
    latitude,
    longitude,
    places,
}: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let cancelled = false;
        const overlays: kakao.maps.CustomOverlay[] = [];
        setError(null);

        const initializeMap = async () => {
            try {
                await loadKakaoMaps();

                if (cancelled) return;

                const center = new kakao.maps.LatLng(
                    latitude,
                    longitude,
                );

                const map = new kakao.maps.Map(container, {
                    center,
                    level: 4,
                });

                const currentDot = document.createElement("div");

                currentDot.setAttribute("aria-label", "현재 위치");

                Object.assign(currentDot.style, {
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    backgroundColor: "#4285F4",
                    border: "3px solid white",
                    boxShadow: "0 0 0 6px rgba(66, 133, 244, 0.2)",
                    boxSizing: "border-box",
                });

                overlays.push(
                    new kakao.maps.CustomOverlay({
                        map,
                        position: center,
                        content: currentDot,
                        xAnchor: 0.5,
                        yAnchor: 0.5,
                        zIndex: 2,
                    }),
                );

                const bounds = new kakao.maps.LatLngBounds();
                bounds.extend(center);

                places.forEach((place, index) => {
                    const position = new kakao.maps.LatLng(
                        place.latitude,
                        place.longitude,
                    );

                    const marker = document.createElement("div");
                    marker.textContent = String(index + 1);
                    marker.setAttribute(
                        "aria-label",
                        `${index + 1}번 음식점 ${place.name}`,
                    );

                    Object.assign(marker.style, {
                        width: "30px",
                        height: "30px",
                        borderRadius: "50%",
                        backgroundColor: "#79552E",
                        color: "white",
                        border: "2px solid white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                        fontWeight: "700",
                        boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
                        boxSizing: "border-box",
                        cursor: "pointer",
                    });

                    marker.onclick = (event) => {
                        event.stopPropagation();

                        map.setLevel(Math.max(1, map.getLevel() - 1), {
                            anchor: position,
                        });
                    };

                    overlays.push(
                        new kakao.maps.CustomOverlay({
                            map,
                            position,
                            content: marker,
                            clickable: true,
                            xAnchor: 0.5,
                            yAnchor: 0.5,
                            zIndex: 1,
                        }),
                    );
                    bounds.extend(position);
                });

                if(places.length > 0) {
                    map.setBounds(bounds, 40,40,40,40);
                }
            } catch (error) {
                if (cancelled) return;

                setError(
                    error instanceof Error
                        ? error.message
                        : "지도를 불러오지 못했어요.",
                );
            }
        };

        void initializeMap();

        return () => {
            cancelled = true;

            overlays.forEach((overlays) => {
                overlays.setMap(null);
            });
            container.replaceChildren();
        };
    }, [latitude, longitude, places]);

    return (
        <div style={{ width: "100%", height: 236 }}>
            {error && <p role="alert">{error}</p>}
            <div
                ref={containerRef}
                aria-label="주변 음식점 지도"
                style={{
                    width: "100%",
                    height: error ? 0 : "100%",
                }}
            />
        </div>
    );
}
