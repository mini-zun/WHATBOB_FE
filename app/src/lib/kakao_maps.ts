let loadingPromise: Promise<void> | null = null;

export function loadKakaoMaps(): Promise<void> {
    if (typeof window === "undefined" || typeof document === "undefined") {
        return Promise.reject(
            new Error("카카오 지도는 웹 화면에서 불러와야 합니다."),
        );
    }
    if (
        typeof kakao !== "undefined" &&
        typeof kakao.maps?.Map === "function"
    ) {
        return Promise.resolve();
    }

    if (loadingPromise) {
        return loadingPromise;
    }

    const key = process.env.EXPO_PUBLIC_KAKAO_MAP_JS_KEY;

    if (!key?.trim()) {
        return Promise.reject(
            new Error("카카오 지도 JavaScript 키가 설정되지 않았습니다."),
        );
    }

    const promise = new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");

        const fail = (message: string) => {
            clearTimeout(timeoutId);
            script.remove();
            reject(new Error(message));
        };

        const timeoutId = setTimeout(() => {
            fail("지도 로딩 시간이 초과됐어요. 다시 시도해 주세요.");
        }, 15000);

        script.async = true;
        script.src = `https://dapi.kakao.com/v2/maps/sdk.js` +
            `?appkey=${encodeURIComponent(key.trim())}&autoload=false`;

        script.onload = () => {
            if (
                typeof kakao === "undefined" ||
                typeof kakao.maps?.load !== "function"
            ) {
                fail("카카오 지도 SDK를 불러오지 못했어요.");
                return;
            }
            kakao.maps.load(() => {
                clearTimeout(timeoutId);
                resolve();
            });
        };
        script.onerror = () => {
            fail("지도를 불러오지 못했어요. 네트워크와 키 설정을 확인해 주세요.");
        };
        document.head.appendChild(script);
    });

    loadingPromise = promise.catch((error) => {
        loadingPromise = null;
        throw error;
    });

    return loadingPromise;
}
