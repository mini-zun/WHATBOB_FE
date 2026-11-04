import type {
    OrderSheetQuestionsData,
    OrderSheetQuestionsResponse,
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

    if (new URL(apiBaseUrl).hostname.endsWith('.ngrok-free.dev')) {
        headers['ngrok-skip-browser-warning'] = 'true';
    }

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