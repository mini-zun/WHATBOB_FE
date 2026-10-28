import { Image } from 'expo-image';
import { useState } from 'react';
import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Fonts } from '@/constants/theme';

const FOODS = [
    '고수',
    '고등어',
    '고구마',
    '고추',
    '오이',
    '토마토',
    '가지',
    '당근',
    '버섯',
    '양파',
    '대파',
    '마늘',
    '우유',
    '달걀',
    '땅콩',
    '새우',
    '게',
    '오징어',
    '돼지고기',
    '소고기',
    '닭고기',
];

function SearchIcon() {
    return (
        <View style={styles.searchIcon} accessible={false}>
            <View style={styles.searchCircle} />
            <View style={styles.searchHandle} />
        </View>
    );
}

export default function FoodPreferencesScreen() {
    const [isSearching, setIsSearching] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedFoods, setSelectedFoods] = useState<string[]>([]);

    const hasSelectedFoods = selectedFoods.length > 0;

    const filteredFoods = FOODS.filter((food) =>
        food.includes(search.trim()),
    );

    const openSearch = () => {
        setSearch('');
        setIsSearching(true);
    };

    const closeSearch = () => {
        Keyboard.dismiss();
        setIsSearching(false);
        setSearch('');
    };

    const toggleFood = (food: string) => {
        setSelectedFoods((previous) =>
            previous.includes(food)
                ? previous.filter((item) => item !== food)
                : [...previous, food],
        );
    };

    const handleSkip = () => {
        router.replace('/home');
    };

    const handleComplete = () => {
        router.replace('/home');
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {isSearching ? (
                    <View style={styles.searchPage}>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="음식 선택 화면으로 돌아가기"
                            hitSlop={8}
                            onPress={closeSearch}
                            style={styles.backButton}
                        >
                            <Text style={styles.backArrow}>←</Text>
                        </Pressable>

                        <View style={styles.searchBar}>
                            <SearchIcon />

                            <TextInput
                                autoFocus
                                style={styles.searchInput}
                                value={search}
                                onChangeText={setSearch}
                                placeholder="검색"
                                placeholderTextColor="#969186"
                                accessibilityLabel="비선호 음식 검색"
                                autoCorrect={false}
                                autoCapitalize="none"
                                returnKeyType="search"
                                onSubmitEditing={() => Keyboard.dismiss()}
                                underlineColorAndroid="transparent"
                            />

                            {search.length > 0 && (
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel="검색어 지우기"
                                    hitSlop={10}
                                    onPress={() => setSearch('')}
                                    style={styles.clearButton}
                                >
                                    <Text style={styles.clearText}>×</Text>
                                </Pressable>
                            )}
                        </View>

                        <ScrollView
                            style={styles.results}
                            contentContainerStyle={styles.resultsContent}
                            keyboardShouldPersistTaps="handled"
                        >
                            {filteredFoods.map((food) => {
                                const checked = selectedFoods.includes(food);

                                return (
                                    <Pressable
                                        key={food}
                                        accessibilityRole="checkbox"
                                        accessibilityLabel={food}
                                        accessibilityState={{ checked }}
                                        onPress={() => toggleFood(food)}
                                        style={({ pressed }) => [
                                            styles.foodRow,
                                            pressed && styles.pressed,
                                        ]}
                                    >
                                        <View
                                            style={[
                                                styles.checkbox,
                                                checked && styles.checkboxSelected,
                                            ]}
                                        >
                                            {checked && (
                                                <Text style={styles.checkmark}>✓</Text>
                                            )}
                                        </View>

                                        <Text style={styles.foodName}>{food}</Text>
                                    </Pressable>
                                );
                            })}

                            {filteredFoods.length === 0 && (
                                <Text style={styles.emptyText}>
                                    검색 결과가 없어요.
                                </Text>
                            )}
                        </ScrollView>
                    </View>
                ) : (
                    <ScrollView
                        contentContainerStyle={styles.mainContent}
                        keyboardShouldPersistTaps="handled"
                        bounces={false}
                    >
                        {hasSelectedFoods ? (
                            <View style={styles.selectedHeader}>
                                <View style={styles.logo}>
                                    <Image
                                        source={require('@/assets/images/login-icon.png')}
                                        contentFit="contain"
                                        style={styles.logoImage}
                                    />
                                    <Text style={styles.logoText}>왓밥</Text>
                                </View>

                                <Text style={styles.selectedTitle}>
                                    못 먹는 음식을 검색해 보세요.
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.introHeader}>
                                <Text style={styles.greeting}>처음이시네요!</Text>

                                <Text style={styles.title}>
                                    못 먹는 음식이 있나요?
                                </Text>

                                <Text style={styles.description}>
                                    알레르기·못 먹는 음식은 빼고 추천해요.
                                    {'\n'}
                                    나중에 마이페이지에서 바꿀 수 있어요.
                                </Text>
                            </View>
                        )}

                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="비선호 음식 검색하기"
                            onPress={openSearch}
                            style={[
                                styles.searchBar,
                                hasSelectedFoods
                                    ? styles.selectedSearchBar
                                    : styles.introSearchBar,
                            ]}
                        >
                            <SearchIcon />
                            <Text style={styles.searchPlaceholder}>검색</Text>
                        </Pressable>

                        <View style={styles.selectionArea}>
                            {hasSelectedFoods && (
                                <>
                                    <Text style={styles.sectionTitle}>
                                        추가된 비선호 음식
                                    </Text>

                                    <View style={styles.tags}>
                                        {selectedFoods.map((food) => (
                                            <Pressable
                                                key={food}
                                                accessibilityRole="button"
                                                accessibilityLabel={`${food} 비선호 음식에서 제거`}
                                                onPress={() => toggleFood(food)}
                                                style={({ pressed }) => [
                                                    styles.tag,
                                                    pressed && styles.pressed,
                                                ]}
                                            >
                                                <Text style={styles.tagText}>{food}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </>
                            )}
                        </View>

                        <View style={styles.footer}>
                            <Pressable
                                accessibilityRole="button"
                                onPress={handleSkip}
                                style={({ pressed }) => [
                                    styles.button,
                                    styles.skipButton,
                                    pressed && styles.pressed,
                                ]}
                            >
                                <Text style={styles.skipText}>건너뛰기</Text>
                            </Pressable>

                            <Pressable
                                accessibilityRole="button"
                                onPress={handleComplete}
                                style={({ pressed }) => [
                                    styles.button,
                                    styles.completeButton,
                                    pressed && styles.pressed,
                                ]}
                            >
                                <Text style={styles.completeText}>설정 완료</Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    container: {
        flex: 1,
        width: '100%',
        maxWidth: 480,
        alignSelf: 'center',
    },
    mainContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
    },

    // 최초 진입 안내
    introHeader: {
        paddingTop: 44,
    },
    greeting: {
        fontFamily: 'BusanDandiMyeongjoM',
        fontSize: 29.69,
        lineHeight: 29.69,
        letterSpacing: 0,
        color: Colors.maintext,
    },
    title: {
        marginTop: 40,
        fontFamily: 'BusanDandiMyeongjoM',
        fontSize: 36.47,
        lineHeight: 36.47,
        letterSpacing: 0,
        color: Colors.maintext,
    },
    description: {
        marginTop: 8,
        fontFamily: 'BusanDandiMyeongjoM',
        fontSize: 18.81,
        lineHeight: 18.81,
        letterSpacing: 0,
        color: Colors.textSecondary,
    },

    selectedHeader: {
        paddingTop: 24,
    },
    logo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    logoImage: {
        width: 44,
        height: 48,
    },
    logoText: {
        fontFamily: Fonts.brand,
        fontSize: 30,
        color: '#68461E',
    },
    selectedTitle: {
        marginTop: 24,
        fontFamily: 'BusanDandiMyeongjoM',
        fontSize: 27,
        lineHeight: 34,
        color: Colors.maintext,
    },

    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 46,
        paddingHorizontal: 18,
        borderRadius: 24,
        backgroundColor: '#F5EFDF',
        gap: 16,
    },
    introSearchBar: {
        marginTop: 44,
        marginRight: 26,
    },
    selectedSearchBar: {
        marginTop: 16,
    },
    searchPlaceholder: {
        fontFamily: 'BusanDandiMyeongjoM',
        fontSize: 18,
        color: '#969186',
    },
    searchInput: {
        flex: 1,
        minWidth: 0,
        height: 46,
        paddingVertical: 0,
        fontFamily: 'BusanDandiMyeongjoM',
        fontSize: 18,
        color: Colors.maintext,
    },
    searchIcon: {
        width: 24,
        height: 24,
    },
    searchCircle: {
        position: 'absolute',
        top: 2,
        left: 1,
        width: 18,
        height: 18,
        borderWidth: 2,
        borderColor: Colors.maintext,
        borderRadius: 9,
    },
    searchHandle: {
        position: 'absolute',
        top: 18,
        left: 16,
        width: 9,
        height: 2,
        borderRadius: 1,
        backgroundColor: Colors.maintext,
        transform: [{ rotate: '45deg' }],
    },

    selectionArea: {
        flexGrow: 1,
        minHeight: 40,
        paddingTop: 22,
    },
    sectionTitle: {
        fontFamily: 'BusanDandiMyeongjoM',
        fontSize: 27,
        lineHeight: 34,
        color: Colors.maintext,
    },
    tags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 20,
        paddingHorizontal: 2,
        paddingBottom: 8,
    },
    tag: {
        minWidth: 52,
        minHeight: 56,
        paddingHorizontal: 14,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 30,
        backgroundColor: '#F1D5CD',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 2,
        elevation: 3,
    },
    tagText: {
        fontFamily: Fonts.bodyBold,
        fontSize: 14,
        color: Colors.maintext,
    },

    footer: {
        flexDirection: 'row',
        gap: 14,
        paddingTop: 24,
        paddingBottom: 44,
        paddingHorizontal: 7,
    },
    button: {
        minHeight: 64,
        paddingHorizontal: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 32,
    },
    skipButton: {
        flex: 1,
        backgroundColor: '#EFEFE5',
    },
    completeButton: {
        flex: 1.6,
        backgroundColor: '#553D26',
    },
    skipText: {
        fontFamily: Fonts.bodyBold,
        fontSize: 20,
        color: Colors.maintext,
    },
    completeText: {
        fontFamily: Fonts.bodyBold,
        fontSize: 20,
        color: '#FFFFFF',
    },

    searchPage: {
        flex: 1,
        paddingHorizontal: 28,
    },
    backButton: {
        alignSelf: 'flex-start',
        minWidth: 44,
        minHeight: 40,
        justifyContent: 'center',
        marginLeft: -18,
    },
    backArrow: {
        fontSize: 28,
        color: Colors.maintext,
    },
    clearButton: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#D8D8D5',
    },
    clearText: {
        fontSize: 20,
        lineHeight: 22,
        color: '#FFFFFF',
    },
    results: {
        flex: 1,
        marginTop: 28,
    },
    resultsContent: {
        paddingBottom: 24,
    },
    foodRow: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 56,
        paddingHorizontal: 6,
        paddingVertical: 10,
        gap: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E4E1DA',
    },
    checkbox: {
        width: 26,
        height: 26,
        borderWidth: 1,
        borderColor: '#C7C7B9',
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxSelected: {
        borderColor: '#553D26',
        backgroundColor: '#553D26',
    },
    checkmark: {
        fontSize: 19,
        lineHeight: 23,
        color: '#FFFFFF',
    },
    foodName: {
        flex: 1,
        fontSize: 18,
        color: Colors.maintext,
    },
    emptyText: {
        paddingVertical: 24,
        textAlign: 'center',
        fontSize: 16,
        color: Colors.textSecondary,
    },
    pressed: {
        opacity: 0.65,
    },
});