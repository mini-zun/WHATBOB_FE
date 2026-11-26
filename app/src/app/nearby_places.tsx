import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import NearbyPlacesMap from "@/components/places/NearbyPlacesMap";
import NearbyPlacesTitle from "@/components/places/NearbyPlacesTitle";
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
    const [radiusMenuOpen, setRadiusMenuOpen] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<CurrentLocation | null>(null);
    const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

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
            setSelectedPlaceId(null);
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
        menuName.trim() ? menuName.trim() : "선택한 음식";

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/home");
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                <View style={styles.page}>
                    <View style={styles.header}>
                        <Pressable
                            onPress={handleBack}
                            accessibilityRole="button"
                            accessibilityLabel="뒤로가기"
                            style={styles.backButton}
                        >
                            <Image
                                source={require("@/assets/images/backbutton.png")}
                                contentFit="contain"
                                style={styles.backImage}
                                accessible={false}
                            />
                        </Pressable>

                        {isValidMenu && (
                            <View style={styles.radiusSelector}>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel="검색 반경 선택"
                                    accessibilityState={{
                                        expanded: radiusMenuOpen,
                                        disabled: isLoading,
                                    }}
                                    disabled={isLoading}
                                    onPress={() => setRadiusMenuOpen((open) => !open)}
                                    style={styles.radiusTrigger}
                                >
                                    <Text style={styles.radiusTriggerText}>
                                        내 주변 {radius / 1000}km
                                    </Text>
                                    <Image
                                        source={require("@/assets/images/map_dropdown.png")}
                                        contentFit="contain"
                                        style={styles.dropdownImage}
                                        accessible={false}
                                    />
                                </Pressable>

                                {radiusMenuOpen && (
                                    <View style={styles.radiusMenu}>
                                        {([1000, 3000] as const).map((value) => (
                                            <Pressable
                                                key={value}
                                                accessibilityRole="button"
                                                accessibilityState={{ selected: radius === value }}
                                                onPress={() => {
                                                    setRadiusMenuOpen(false);
                                                    setRadius(value);
                                                }}
                                                style={styles.radiusOption}
                                            >
                                                <Text style={styles.radiusTriggerText}>
                                                    {value / 1000}km
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {isValidMenu ? (
                        <>
                            <NearbyPlacesTitle text={`${name} 파는 곳`} />
                            <Text style={styles.resultSummary}>
                                {isLoading
                                    ? "검색 중…"
                                    : data
                                      ? `가까운 순 · ${data.places.length}곳`
                                      : "가까운 순"}
                            </Text>
                            {currentLocation && (
                                <View style={styles.mapFrame}>
                                    <NearbyPlacesMap
                                        latitude={currentLocation.latitude}
                                        longitude={currentLocation.longitude}
                                        height={230}
                                        places={data?.places ?? []}
                                        selectedPlaceId={selectedPlaceId}
                                        onSelectPlace={async (placeId) => {
                                            setSelectedPlaceId(placeId);
                                        }}
                                        dom={{
                                            scrollEnabled: false,
                                            style: { width: "100%", height: 230 },
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
                                <View style={styles.list}>
                                    {data.places.length === 0 ? (
                                        <Text>주변에 검색된 음식점이 없어요.</Text>
                                    ) : (
                                        data.places.map((place, index) => (
                                            <Pressable
                                                key={place.kakao_place_id}
                                                accessibilityRole="button"
                                                accessibilityState={{
                                                    selected: selectedPlaceId === place.kakao_place_id,
                                                }}
                                                onPress={() => setSelectedPlaceId(place.kakao_place_id)}
                                                style={styles.placeItem}
                                            >
                                                <Text style={styles.placeName} numberOfLines={1}>
                                                    {index + 1} · {place.name}
                                                </Text>
                                                <View style={styles.placeBottomRow}>
                                                    <Text style={styles.placeDistance}>
                                                        직선 {(place.distance_m / 1000).toFixed(1)}km
                                                    </Text>
                                                </View>
                                            </Pressable>
                                        ))
                                    )}
                                </View>
                            ) : null}
                        </>
                    ) : (
                        <Text accessibilityRole="alert">
                            메뉴 정보가 올바르지 않습니다. 다시 선택해 주세요.
                        </Text>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
    },

    scroll: {
        flex: 1,
    },

    scrollContent: {
        flexGrow: 1,
        paddingBottom: 24,
    },

    page: {
        width: "100%",
        maxWidth: 393,
        alignSelf: "center",
        paddingLeft: 11,
        paddingRight: 10,
        paddingTop: 30,
    },

    backButton: {
        width: 62,
        height: 62,
        marginLeft: 19,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 31,
    },

    backImage: {
        width: 62,
        height: 62,
    },

    dropdownImage: {
        width: 8.3,
        height: 6,
    },

    retryButton: {
        alignSelf: "flex-start",
        paddingVertical: 12,
    },

    header: {
        height: 62,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingRight: 12,
        zIndex: 10,
    },

    radiusSelector: {
        position: "relative",
    },

    radiusTrigger: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        paddingVertical: 12,
        paddingHorizontal: 4,
    },

    radiusTriggerText: {
        fontFamily: Fonts.bodyMedium,
        fontSize: 18.3,
        color: Colors.maintext,
    },

    radiusMenu: {
        position: "absolute",
        top: "100%",
        right: 0,
        minWidth: 100,
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.backGrey,
        borderRadius: 12,
        elevation: 4,
        boxShadow: "0px 3px 8px rgba(0, 0, 0, 0.12)",
    },

    radiusOption: {
        paddingVertical: 12,
        paddingHorizontal: 20,
    },

    resultSummary: {
        height: 28,
        lineHeight: 28,
        marginTop: 6,
        marginHorizontal: 12,
        marginBottom: 28,
        fontFamily: Fonts.bodyRegular,
        fontSize: 23.2,
        color: Colors.textSecondary,
    },

    mapFrame: {
        height: 236,
        flexShrink: 0,
        marginHorizontal: 1,
        borderWidth: 3,
        borderColor: Colors.backOrange,
        backgroundColor: Colors.backOrange,
        boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)",
    },

    list: {
        marginTop: 37,
        gap: 13,
    },

    placeItem: {
        minHeight: 66,
        paddingHorizontal: 24,
        paddingVertical: 6,
        borderRadius: 14,
        borderWidth: 1.9,
        borderColor: "rgba(119, 119, 119, 0.2)",
        backgroundColor: "rgba(249, 239, 221, 0.2)",
        gap: 2,
    },

    placeName: {
        fontFamily: Fonts.nonpreferencefood,
        fontSize: 22.4,
        lineHeight: 28,
        color: Colors.maintext,
    },

    placeBottomRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
    },

    placeDistance: {
        fontFamily: Fonts.bodyDesc,
        fontSize: 16,
        lineHeight: 20,
        color: Colors.textSecondary,
    },

});
