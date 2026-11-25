import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import NearbyPlacesMap from "@/components/places/NearbyPlacesMap";
import { Colors, Fonts } from "@/constants/theme";
import { getCurrentLocation, type CurrentLocation } from "@/lib/location";
import { getNearbyPlaces } from "@/lib/places";
import type { NearbyPlacesData, SearchRadius } from "@/types/places";

export default function NearbyPlacesScreen() {
    const { menuId, menuName } = useLocalSearchParams<{
        menuId?: string;
        menuName?: string;
    }>();

    const [data, setData] = useState<NearbyPlacesData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [radius, setRadius] = useState<SearchRadius>(1000);
    const [currentLocation, setCurrentLocation] = useState<CurrentLocation | null>(null);

    const parsedMenuId = Number(menuId);
    const isValidMenu = typeof menuId === "string" &&
        Number.isSafeInteger(parsedMenuId) &&
        parsedMenuId > 0;

    useEffect(() => {
        if (!isValidMenu) return;

        const controller = new AbortController();

        const loadPlaces = async () => {
            setIsLoading(true);
            setError(null);
            setData(null);
            setCurrentLocation(null);

            try {
                const location = await getCurrentLocation();

                if (controller.signal.aborted) return;

                setCurrentLocation(location);

                const result = await getNearbyPlaces(
                    {
                        menuId: parsedMenuId,
                        latitude: location.latitude,
                        longitude: location.longitude,
                        radius,
                    },
                    controller.signal,
                );

                if (!controller.signal.aborted) {
                    setData(result);
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    setError(
                        error instanceof Error
                            ? error.message
                            : "주변 음식점을 불러오지 못했어요.",
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        void loadPlaces();

        return () => {
            controller.abort();
        };
    }, [isValidMenu, parsedMenuId, retryCount, radius]);

    const name = typeof menuName === "string" &&
        menuName.trim() ? menuName : "선택한 음식";

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/home");
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.page}>
                <Pressable
                    onPress={handleBack}
                    accessibilityRole="button"
                    style={styles.backButton}
                >
                    <Text>뒤로가기</Text>
                </Pressable>

                {isValidMenu ? (
                    <>
                        <Text style={styles.title}>{name} 파는 곳</Text>
                        <View style={styles.radiusButtons}>
                            {([1000, 3000] as const).map((value) => (
                                <Pressable
                                    key={value}
                                    accessibilityRole="button"
                                    accessibilityLabel={`검색 반경 ${value / 1000}km`}
                                    accessibilityState={{
                                        selected: radius === value,
                                        disabled: isLoading || radius === value,
                                    }}
                                    disabled={isLoading || radius === value}
                                    onPress={() => setRadius(value)}
                                    style={[
                                        styles.radiusButton,
                                        radius === value && styles.selectedRadiusButton,
                                    ]}
                                >
                                    <Text style={styles.radiusButtonText}>{value / 1000}km</Text>
                                </Pressable>
                            ))}
                        </View>
                        {currentLocation && (
                            <View style={{ height: 236, flexShrink: 0 }}>
                                <NearbyPlacesMap
                                    latitude={currentLocation.latitude}
                                    longitude={currentLocation.longitude}
                                    dom={{
                                        scrollEnabled: false,
                                        style: { width: "100%", height: 236 },
                                    }}
                                />
                            </View>
                        )}
                        {isLoading ? (
                            <Text accessibilityState={{ busy: true }}>
                                현재 위치와 주변 음식점을 확인하고 있어요.
                            </Text>
                        ) : error ? (
                            <View>
                                <Text accessibilityRole="alert">{error}</Text>
                                <Pressable
                                    accessibilityRole="button"
                                    onPress={() => setRetryCount((count) => count + 1)}
                                    style={styles.retryButton}
                                >
                                    <Text>다시 시도</Text>
                                </Pressable>
                            </View>
                        ) : data ? (
                            <ScrollView
                                style={styles.list}
                                contentContainerStyle={styles.listContent}
                                showsVerticalScrollIndicator={false}
                                bounces={false}
                            >
                                <Text>
                                    가까운 순 {data.places.length}곳, 반경 {data.radius_m / 1000}km
                                </Text>
                                {data.places.length === 0 ? (
                                    <Text>주변에 검색된 음식점이 없어요.</Text>
                                ) : (
                                    data.places.map((place, index) => (
                                        <View key={place.kakao_place_id} style={styles.placeItem}>
                                            <Text>{index + 1}. {place.name}</Text>
                                            <Text>
                                                {place.road_address || place.address || "주소 정보 없음"}
                                            </Text>
                                            <Text>직선거리 {place.distance_m}m</Text>
                                        </View>
                                    ))
                                )}
                            </ScrollView>
                        ) : null}
                    </>
                ) : (
                    <Text accessibilityRole="alert">
                        메뉴 정보가 올바르지 않습니다. 다시 선택해 주세요.
                    </Text>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
    },

    page: {
        flex: 1,
        width: "100%",
        maxWidth: 430,
        alignSelf: "center",
        padding: 24,
        gap: 24,
    },

    backButton: {
        alignSelf: "flex-start",
        paddingVertical: 12,
    },

    retryButton: {
        alignSelf: "flex-start",
        paddingVertical: 12,
    },

    radiusButtons: {
        flexDirection: "row",
        gap: 12,
    },

    radiusButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        backgroundColor: Colors.backGrey,
    },

    selectedRadiusButton: {
        backgroundColor: Colors.cardYellow,
    },

    radiusButtonText: {
        fontFamily: Fonts.bodyMedium,
        color: Colors.textBrown,
    },

    list: {
        flex: 1,
    },

    listContent: {
        paddingBottom: 24,
    },

    placeItem: {
        marginTop: 16,
        gap: 4,
    },

    title: {
        fontFamily: Fonts.nonpreferencefood,
        fontSize: 30,
        color: Colors.maintext,
    },
});
