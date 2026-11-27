import { ApiError, apiFetch } from "./api";
import type {
    NearbyPlacesData,
    NearbyPlacesResponse,
    RoomNearbyPlacesData,
    RoomNearbyPlacesResponse,
    SearchRadius,
} from "@/types/places";

type NearbyPlacesParams = {
    menuId: number;
    latitude: number;
    longitude: number;
    radius?: SearchRadius;
};

export async function getNearbyPlaces(
    {
        menuId,
        latitude,
        longitude,
        radius = 1000,
    }: NearbyPlacesParams,
    signal?: AbortSignal,
): Promise<NearbyPlacesData> {
    const params = new URLSearchParams({
        menu_id: String(menuId),
        latitude: String(latitude),
        longitude: String(longitude),
        radius: String(radius),
    });

    const result = await
    apiFetch<NearbyPlacesResponse>(
        `/api/places/nearby?${params.toString()}`,
        { signal},
    );

    if(
        result?.success !== true ||
        !result.data ||
        !Array.isArray(result.data.places)
    ) {
        throw new ApiError( result?.message || "주변 음식점 응답이 올바르지 않습니다.", 0,);
    }
    return result.data;
}

function isValidOrigin(origin: unknown): origin is { latitude: number; longitude: number } {
    if (!origin || typeof origin !== "object") return false;
    const { latitude, longitude } = origin as Record<string, unknown>;
    return typeof latitude === "number" && Number.isFinite(latitude) && Math.abs(latitude) <= 90 &&
        typeof longitude === "number" && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
}

export async function getRoomNearbyPlaces(
    roomId: string,
    roundId: number,
    radius: SearchRadius = 1000,
    signal?: AbortSignal,
): Promise<RoomNearbyPlacesData> {
    const result = await apiFetch<RoomNearbyPlacesResponse>(
        `/api/rooms/${encodeURIComponent(roomId)}/rounds/${roundId}/nearby?radius=${radius}`,
        { signal },
    );

    if (
        result?.success !== true ||
        !result.data ||
        !Array.isArray(result.data.places) ||
        !isValidOrigin(result.data.search_origin)
    ) {
        throw new ApiError(result?.message || "주변 음식점 응답이 올바르지 않습니다.", 0);
    }
    return result.data;
}
