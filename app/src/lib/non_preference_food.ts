import type {
    AllergenListData,
    AllergenListResponse,
    DislikeFoodData,
    DislikeFoodResponse,
    DislikeFoodUpdateRequest,
} from "@/types/non_preference_food";

import { apiFetch } from "./api";

export async function getAllergens(): Promise<AllergenListData> {
    const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

    if (!apiBaseUrl) {
        throw new Error("API 주소가 설정되지 않았습니다.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(
            `${apiBaseUrl.replace(/\/$/, "")}/api/recommendations/allergens`,
            {
                headers: {
                    Accept: "application/json",
                },
                signal: controller.signal,
            },
        );

        const result: AllergenListResponse | null = await response.json().catch(() => null);

        const serverMessage = typeof result?.message === "string" ? result.message.trim() : "";

        if (!response.ok) {
            throw new Error(serverMessage || "알레르기 목록을 불러오지 못했습니다.");
        }

        if (
            result?.success !== true ||
            !result.data ||
            !Array.isArray(result.data.allergens) ||
            !result.data.allergens.every((item) =>
                item !== null &&
                typeof item === "object" &&
                typeof item.id === "string" &&
                typeof item.name === "string" &&
                typeof item.legal_name === "string" &&
                typeof item.description === "string"
            )
        ) {
            throw new Error(serverMessage || "알레르기 목록 응답이 올바르지 않습니다.");
        }

        return result.data;
    } catch (error) {
        if (controller.signal.aborted) {
            throw new Error("요청 시간이 초과되었습니다. 다시 시도해 주세요.");
        }

        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

export async function getMyDislikeFoods(
    signal?: AbortSignal,
): Promise<DislikeFoodData> {
    const result = await apiFetch<DislikeFoodResponse>(
        "/api/users/me/dislikes",
        { signal},
    );

    if (
        result?.success !== true || !result.data || !Array.isArray(result.data.items)
    ) {
        throw new Error(result?.message || "비선호 목록 응답이 올바르지 않습니다.",);
    }
    return result.data;
}

export async function saveMyDislikeFoods(
    request: DislikeFoodUpdateRequest,
): Promise<DislikeFoodData> {
    const result = await apiFetch<DislikeFoodResponse>(
        "/api/users/me/dislikes",
        {
            method: "PUT",
            body: request,
        },
    );
    if(
        result?.success !== true || !result.data || !Array.isArray(result.data.items)
    ) {
        throw new Error(result?.message || "비선호 저장 응답이 올바르지 않습니다.",);
    }
    return result.data;
}