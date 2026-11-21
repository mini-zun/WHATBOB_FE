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

import { apiFetch } from './api';

export async function getOrderSheetQuestions():
    Promise<OrderSheetQuestionsData> {
    const result = await apiFetch<OrderSheetQuestionsResponse>(
        '/api/recommendations/order-sheet/questions',
    );

    if (result?.success !== true || !result.data) {
        throw new Error( result?.message || '질문 응답이 올바르지 않습니다.');
    }

    if (!Array.isArray(result.data.questions) ||
        result.data.questions.length === 0
    ) {
        throw new Error('표시할 질문이 없습니다.');
    }

    return result.data;
}

export async function submitOrderSheet(
    request: OrderSheetRecommendRequest,
): Promise<OrderSheetRecommendData> {
    if (request.answers.length === 0) {
        throw new Error("제출할 답변이 없습니다.");
    }

    const result = await apiFetch<OrderSheetRecommendResponse>(
        "/api/recommendations/order-sheet",
        {
            method: "POST",
            body: request,
        },
    );

    if (result?.success !== true || !result.data) {
        throw new Error(
            result?.message || "추천 응답이 올바르지 않습니다.",
        );
    }

    if (!Array.isArray(result.data.recommended_menus) || result.data.recommended_menus.length === 0) {
        throw new Error("추천된 메뉴가 없습니다.");
    }
    return result.data;
}

export async function submitRecommendationFeedback(
    recommendationId: number,
    request: RecommendationFeedbackRequest,
): Promise<RecommendationFeedbackData> {
    const result = await apiFetch<RecommendationFeedbackResponse>(
        `/api/recommendations/${recommendationId}/feedback`,
        {
            method: "POST",
            body: request,
        },
    );

    if (result?.success !== true || !result.data) {
        throw new Error(result?.message || "피드백 응답이 올ㄹ바르지 않습니다.",);
    }

    return result.data;
}
