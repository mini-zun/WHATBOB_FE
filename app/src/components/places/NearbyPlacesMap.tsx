"use dom";

import type { DOMProps } from "expo/dom";
import { useEffect, useRef, useState } from "react";
import { loadKakaoMaps } from "@/lib/kakao_maps";

type Props = {
    latitude: number;
    longitude: number;
    dom?: DOMProps;
};

export default function NearbyPlacesMap({
    latitude,
    longitude,
}: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let cancelled = false;
        setError(null);

        const initializeMap = async () => {
            try {
                await loadKakaoMaps();

                if (cancelled) return;

                const center = new kakao.maps.LatLng(
                    latitude,
                    longitude,
                );

                new kakao.maps.Map(container, {
                    center,
                    level: 4,
                });
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
            container.replaceChildren();
        };
    }, [latitude, longitude]);

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
