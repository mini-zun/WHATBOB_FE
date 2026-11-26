"use dom";

import type { DOMProps } from "expo/dom";
import { useEffect, useRef, useState } from "react";
import { loadKakaoMaps } from "@/lib/kakao_maps";
import type { NearbyPlace } from "@/types/places";
import { Asset } from "expo-asset";

type Props = {
    latitude: number;
    longitude: number;
    dom?: DOMProps;
    places: NearbyPlace[];
    selectedPlaceId: string | null;
    onSelectPlace: (placeId: string) => Promise<void>;
};

export default function NearbyPlacesMap({
    latitude,
    longitude,
    places,
    selectedPlaceId,
    onSelectPlace,
}: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [mapInstance, setMapInstance] = useState<kakao.maps.Map | null>(null);
    const onSelectPlaceRef = useRef(onSelectPlace);

    useEffect(() => {
        onSelectPlaceRef.current = onSelectPlace;
    }, [onSelectPlace]);

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

                const markerImageUrl = Asset.fromModule(require("@/assets/images/mapmaker.png"),).uri;

                places.forEach((place) => {
                    const position = new kakao.maps.LatLng(
                        place.latitude,
                        place.longitude,
                    );

                    const marker = document.createElement("div");
                    marker.setAttribute(
                        "aria-label",
                        `음식점 ${place.name}`,
                    );

                    Object.assign(marker.style, {
                        width: "32px",
                        height: "43px",
                        backgroundImage: `url("${markerImageUrl}")`,
                        backgroundSize: "contain",
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "center",
                        cursor: "pointer",
                    });

                    marker.onclick = (event) => {
                        event.stopPropagation();

                        map.setLevel(Math.max(1, map.getLevel() - 1), {
                            anchor: position,
                        });

                        void onSelectPlaceRef.current(place.kakao_place_id).catch(
                            (error) => {
                                console.error("음식점 선택 전달 실패", error);
                            },
                        );
                    };

                    overlays.push(
                        new kakao.maps.CustomOverlay({
                            map,
                            position,
                            content: marker,
                            clickable: true,
                            xAnchor: 0.5,
                            yAnchor: 1,
                            zIndex: 1,
                        }),
                    );
                    bounds.extend(position);
                });

                if (places.length > 0) {
                    map.setBounds(bounds, 40, 40, 40, 40);
                }

                setMapInstance(map);
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
            setMapInstance(null);

            overlays.forEach((overlays) => {
                overlays.setMap(null);
            });
            container.replaceChildren();
        };
    }, [latitude, longitude, places]);

    useEffect(() => {
        if (!mapInstance || !selectedPlaceId) return;

        const selectedPlace = places.find(
            (place) => place.kakao_place_id === selectedPlaceId,
        );

        if (!selectedPlace) return;

        mapInstance.panTo(
            new kakao.maps.LatLng(
                selectedPlace.latitude,
                selectedPlace.longitude,
            ),
        );
    }, [mapInstance, selectedPlaceId, places]);

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
