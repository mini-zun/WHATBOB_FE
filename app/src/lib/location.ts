import * as Location from "expo-location";

export type CurrentLocation = {
    latitude: number;
    longitude: number;
};

export async function getCurrentLocation(): Promise<CurrentLocation> {
    const permission = await Location.requestForegroundPermissionsAsync();

    if(!permission.granted) {
        throw new Error(permission.canAskAgain ? "주변 음식점을 찾으려면 위치 권한을 허용해 주세요." : "앱 또는 브라우저 설정에서 위치 권한을 허용해 주세요.",);
    }
    const servicesEnabled = await Location.hasServicesEnabledAsync();

    if(!servicesEnabled) {
        throw new Error("기기의 위치 서비스를 켜주세요.");
    }
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
        const position = await Promise.race([
            Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            }),
            new Promise<never>((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(
                        new Error("현재 위치를 확인하지 못했어요. 다시 시도해 주세요."),
                    );
                }, 15000);
            }),
        ]);

        return {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
        };
    } finally {
        if(timeoutId !== undefined) {
            clearTimeout(timeoutId);
        }
    }
}