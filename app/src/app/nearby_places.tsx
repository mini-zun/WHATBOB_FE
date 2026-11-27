import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import NearbyPlacesMap from "@/components/places/NearbyPlacesMap";
import GooglePlacesList from "@/components/places/GooglePlacesList";
import NearbyPlacesTitle from "@/components/places/NearbyPlacesTitle";
import { Colors, Fonts } from "@/constants/theme";
import { getCurrentLocation, type CurrentLocation } from "@/lib/location";
import { getNearbyPlaces, getRoomNearbyPlaces } from "@/lib/places";
import { parseRoomId } from "@/lib/rooms";
import { openKakaoDirections } from "@/lib/kakao_directions";
import { getFoodHistoryOperationKey, recordFoodHistory } from "@/lib/food_history";
import type { NearbyPlacesData, SearchRadius } from "@/types/places";
import type { PlacesViewportHandle } from "@/lib/places_widget";

export default function NearbyPlacesScreen() {
    const { menuId, menuName, recommendationId, mealKey, roomId, roundId } = useLocalSearchParams<{
        menuId?: string;
        menuName?: string;
        recommendationId?: string;
        mealKey?: string;
        roomId?: string;
        roundId?: string;
    }>();

    const [data, setData] = useState<NearbyPlacesData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [radius, setRadius] = useState<SearchRadius>(1000);
    const [radiusMenuOpen, setRadiusMenuOpen] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<CurrentLocation | null>(null);
    const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
    const [openingDirections, setOpeningDirections] = useState(false);
    const openingDirectionsRef = useRef(false);
    const [directionsError, setDirectionsError] = useState<{ placeId: string; message: string } | null>(null);
    const placesViewportRef = useRef<PlacesViewportHandle | null>(null);
    const saveInFlight = useRef(false);
    const savedKeys = useRef(new Set<string>());
    const [mealSave, setMealSave] = useState<{
        key: string;
        status: "saving" | "saved" | "error";
        error?: string;
    } | null>(null);

    const parsedMenuId = Number(menuId);
    const isValidMenu = typeof menuId === "string" &&
        Number.isSafeInteger(parsedMenuId) &&
        parsedMenuId > 0;

    const parsedRoundId = Number(roundId);
    const room = typeof roomId === "string" &&
        Number.isSafeInteger(parsedRoundId) && parsedRoundId > 0
        ? parseRoomId(roomId)
        : null;
    const originLabel = room ? "방장 위치" : "현재 위치";

    const operationKey = isValidMenu
        ? getFoodHistoryOperationKey(parsedMenuId, recommendationId, mealKey)
        : null;
    const mealStatus = mealSave?.key === operationKey ? mealSave : null;
    const selectedPlace = data?.places.find((place) => place.kakao_place_id === selectedPlaceId);

    const selectPlace = useCallback((placeId: string) => {
        setDirectionsError(null);
        setSelectedPlaceId(placeId);
    }, []);

    const handleOpenDirections = async () => {
        if (!selectedPlace || !currentLocation || isLoading ||
            saveInFlight.current || openingDirectionsRef.current) return;

        openingDirectionsRef.current = true;
        setOpeningDirections(true);
        setDirectionsError(null);
        try {
            await openKakaoDirections(selectedPlace, currentLocation);
        } catch (error) {
            setDirectionsError({
                placeId: selectedPlace.kakao_place_id,
                message: error instanceof Error ? error.message : "카카오맵 길찾기를 열지 못했어요.",
            });
        } finally {
            openingDirectionsRef.current = false;
            setOpeningDirections(false);
        }
    };

    useEffect(() => {
        if (!isValidMenu || operationKey) return;
        router.setParams({
            mealKey: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`,
        });
    }, [isValidMenu, operationKey]);

    const handleChoosePlace = useCallback(async (placeId: string) => {
        if (!operationKey || saveInFlight.current) return;

        selectPlace(placeId);
        if (savedKeys.current.has(operationKey)) {
            setMealSave({ key: operationKey, status: "saved" });
            return;
        }

        saveInFlight.current = true;
        setMealSave({ key: operationKey, status: "saving" });

        try {
            await recordFoodHistory(parsedMenuId, operationKey);
            savedKeys.current.add(operationKey);
            setMealSave({ key: operationKey, status: "saved" });
        } catch (error) {
            setMealSave({
                key: operationKey,
                status: "error",
                error: error instanceof Error
                    ? error.message
                    : "먹은 음식 기록을 저장하지 못했어요. 음식점을 다시 눌러 주세요.",
            });
        } finally {
            saveInFlight.current = false;
        }
    }, [operationKey, parsedMenuId, selectPlace]);

    useEffect(() => {
        if (!isValidMenu) return;

        const controller = new AbortController();

        const loadPlaces = async () => {
            setIsLoading(true);
            setError(null);
            setData(null);
            setSelectedPlaceId(null);
            setDirectionsError(null);
            setCurrentLocation(null);

            try {
                if (room) {
                    const result = await getRoomNearbyPlaces(
                        room,
                        parsedRoundId,
                        radius,
                        controller.signal,
                    );
                    if (!controller.signal.aborted) {
                        setCurrentLocation(result.search_origin);
                        setData(result);
                    }
                    return;
                }

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
    }, [isValidMenu, parsedMenuId, retryCount, radius, room, parsedRoundId]);

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
                scrollEventThrottle={100}
                onScroll={() => placesViewportRef.current?.updateViewport()}
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
                                    : `${room ? "방장 위치에서 " : ""}가까운 순${data ? ` · ${data.places.length}곳` : ""}`}
                            </Text>
                            {currentLocation && (
                                <View style={styles.mapFrame}>
                                    <NearbyPlacesMap
                                        latitude={currentLocation.latitude}
                                        longitude={currentLocation.longitude}
                                        height={230}
                                        places={data?.places ?? []}
                                        originLabel={originLabel}
                                        selectedPlaceId={selectedPlaceId}
                                        onSelectPlace={async (placeId) => {
                                            selectPlace(placeId);
                                        }}
                                        dom={{
                                            scrollEnabled: false,
                                            style: { width: "100%", height: 230 },
                                        }}
                                    />
                                    {!isLoading && selectedPlace && (
                                        <Pressable
                                            accessibilityRole="button"
                                            accessibilityLabel={`${selectedPlace.name}까지 카카오맵 도보 길찾기`}
                                            hitSlop={6}
                                            accessibilityState={{
                                                disabled: openingDirections || mealStatus?.status === "saving",
                                                busy: openingDirections,
                                            }}
                                            disabled={openingDirections || mealStatus?.status === "saving"}
                                            onPress={(event) => {
                                                event.stopPropagation();
                                                void handleOpenDirections();
                                            }}
                                            style={({ pressed }) => [
                                                styles.directionsButton,
                                                pressed && styles.directionsPressed,
                                                (openingDirections || mealStatus?.status === "saving") && styles.directionsDisabled,
                                            ]}
                                        >
                                            <Text style={styles.directionsButtonText}>
                                                {openingDirections ? "여는 중…" : "카카오맵 길찾기"}
                                            </Text>
                                        </Pressable>
                                    )}
                                </View>
                            )}
                            {!isLoading && selectedPlace && directionsError?.placeId === selectedPlace.kakao_place_id && (
                                <Text accessibilityRole="alert" style={styles.directionsError}>
                                    {directionsError.message}
                                </Text>
                            )}
                            {isLoading ? (
                                <Text accessibilityState={{ busy: true }}>
                                    {room
                                        ? "방장 위치 주변 음식점을 확인하고 있어요."
                                        : "현재 위치와 주변 음식점을 확인하고 있어요."}
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
                                    {mealStatus && (
                                        <Text
                                            accessibilityRole={mealStatus.status === "error" ? "alert" : undefined}
                                            accessibilityLiveRegion="polite"
                                            style={mealStatus.status === "error" ? styles.saveError : styles.saveMessage}
                                        >
                                            {mealStatus.status === "saving"
                                                ? "먹은 음식 기록을 저장하고 있어요."
                                                : mealStatus.status === "saved"
                                                    ? "먹은 음식 기록에 저장했어요."
                                                    : `${mealStatus.error} 음식점을 다시 누르면 재시도해요.`}
                                        </Text>
                                    )}
                                    {data.places.length === 0 ? (
                                        <Text>주변에 검색된 음식점이 없어요.</Text>
                                    ) : (
                                        <GooglePlacesList
                                            places={data.places}
                                            selectedPlaceId={selectedPlaceId}
                                            disabled={!operationKey || mealStatus?.status === "saving"}
                                            onSelectPlace={handleChoosePlace}
                                            viewportRef={placesViewportRef}
                                        />
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
        position: "relative",
        height: 236,
        flexShrink: 0,
        marginHorizontal: 1,
        borderWidth: 3,
        borderColor: Colors.backOrange,
        backgroundColor: Colors.backOrange,
        boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)",
    },

    directionsButton: {
        position: "absolute",
        top: 8,
        right: 8,
        zIndex: 10,
        elevation: 3,
        minHeight: 32,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 7,
        borderWidth: 1,
        borderColor: Colors.borderBrown,
        backgroundColor: Colors.backOrange,
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0px 2px 4px rgba(106, 57, 7, 0.12)",
    },

    directionsPressed: {
        backgroundColor: Colors.lightBrown,
        transform: [{ scale: 0.98 }],
    },

    directionsDisabled: { opacity: 0.6 },

    directionsButtonText: {
        fontFamily: Fonts.bodyMedium,
        fontSize: 13,
        lineHeight: 18,
        color: Colors.textBrown,
    },

    directionsError: {
        marginTop: 8,
        marginHorizontal: 12,
        fontFamily: Fonts.bodyRegular,
        fontSize: 14,
        color: Colors.errorText,
    },

    list: {
        marginTop: 37,
        gap: 13,
    },

    saveMessage: {
        fontFamily: Fonts.bodyRegular,
        color: Colors.textBrown,
    },

    saveError: {
        fontFamily: Fonts.bodyRegular,
        color: Colors.errorText,
    },

});
