import type {
    OrderSheetQuestionsData,
    OrderSheetQuestionsResponse,
    OrderSheetRecommendData,
    OrderSheetRecommendRequest,
    OrderSheetRecommendResponse,
    RecommendationFeedbackRequest,
    RecommendationFeedbackData,
    RecommendationFeedbackResponse,
} from '@/types/order_sheet';

export async function getOrderSheetQuestions():
    Promise<OrderSheetQuestionsData> {
    const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

    if (!apiBaseUrl) {
        throw new Error('API 주소가 설정되지 않았습니다.');
    }

    const endpoint = `${apiBaseUrl.replace(/\/$/, '')}` + '/api/recommendations/order-sheet/questions';

    const headers: Record<string, string> = {
        Accept: 'application/json',
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(endpoint, {
            headers,
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(
                `질문을 불러오지 못했습니다. (HTTP ${response.status})`,
            );
        }

        const result: OrderSheetQuestionsResponse =
            await response.json();

        if (!result?.success || !result.data) {
            throw new Error(
                result?.message || '질문 응답이 올바르지 않습니다.',
            );
        }

        if (
            !Array.isArray(result.data.questions) ||
            result.data.questions.length === 0
        ) {
            throw new Error('표시할 질문이 없습니다.');
        }

        return result.data;
    } catch (error) {
        if (controller.signal.aborted) {
            throw new Error('요청 시간이 초과되었습니다. 다시 시도해 주세요.');
        }

        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

export async function submitOrderSheet(
    request: OrderSheetRecommendRequest,
): Promise<OrderSheetRecommendData> {
    const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

    if (!apiBaseUrl) {
        throw new Error("API 주소가 설정되지 않았습니다.");
    }

    if (request.answers.length === 0) {
        throw new Error("제출할 답변이 없습니다.");
    }

    const endpoint = `${apiBaseUrl.replace(/\/$/, "")}` + "/api/recommendations/order-sheet";

    const headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json",
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers,
            body: JSON.stringify(request),
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(
                `추천을 받지 못했습니다. (HTTP ${response.status})`,
            );
        }

        const result: OrderSheetRecommendResponse =
            await response.json();

        if (!result?.success || !result.data) {
            throw new Error(
                result?.message || "추천 응답이 올바르지 않습니다.",
            );
        }

        if (
            !Array.isArray(result.data.recommended_menus) ||
            result.data.recommended_menus.length === 0
        ) {
            throw new Error("추천된 메뉴가 없습니다.");
        }

        return result.data;
    } catch (error) {
        if (controller.signal.aborted) {
            throw new Error(
                "추천 요청 시간이 초과되었습니다. 처리 결과를 확인한 뒤 다시 시도해 주세요.",
            );
        }

        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

export async function submitRecommendationFeedback(
    recommendationId: number,
    request: RecommendationFeedbackRequest,
): Promise<RecommendationFeedbackData> {
    const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

    if (!apiBaseUrl) {
        throw new Error("API 주소가 설정되지 않았습니다.");
    }

    const endpoint =
        `${apiBaseUrl.replace(/\/$/, "")}` +
        `/api/recommendations/${recommendationId}/feedback`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request),
            signal: controller.signal,
        });

        const result: RecommendationFeedbackResponse | null = await response.json().catch(() => null);

        const serverMessage = typeof result?.message === "string" ? result.message.trim() : "";

        if (!response.ok) {
            throw new Error(
                serverMessage ||
                `피드백을 저장하지 못했습니다. (HTTP ${response.status})`,
            );
        }
        if (result?.success !== true || !result.data) {
            throw new Error(
                serverMessage || "피드백 응답이 옳지 않습니다.",
            );
        }
        return result.data;
    } catch (error) {
        if (controller.signal.aborted) {
            throw new Error(
                "피드백 요청 시간이 초과되었습니다. 저장 여부를 확인하지 못하였습니다."
            );
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}
