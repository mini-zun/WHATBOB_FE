import { ApiError, apiFetch } from "./api";
import type {
    NearbyPlacesData,
    NearbyPlacesResponse,
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