import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Colors, Fonts } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { MenuCarousel } from "@/components/home/MenuCarousel";

import { useEffect, useState } from "react";
import { SideMenuDrawer } from "@/components/home/SideMenuDrawer";
import { getPopularFood, type PopularFood } from "@/lib/food_popular";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [popularMenus, setPopularMenus] = useState<PopularFood[]>([]);
  const [popularLoading, setPopularLoading] = useState(true);
  const [popularError, setPopularError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    getPopularFood(controller.signal)
      .then((data) => {
        setPopularMenus(data.items);
        setPopularError(null);
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setPopularError(
          e instanceof Error ? e.message : "인기 메뉴를 불러오지 못했어요.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setPopularLoading(false);
      });

    return () => controller.abort();
  }, []);

  const handleToPickWithFriend = () => {
    router.push("/pick_with_friend");
  };

  const handleToFoodHistory = () => {
    router.push("/food_history");
  };

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Image
            source={require("@/assets/images/logo_with_text.png")}
            contentFit="contain"
            style={styles.topLogo}
          />
          <View style={styles.headerRight}>
            <Pressable onPress={() => console.log("알람 페이지로 이동")}>
              <Image
                source={require("@/assets/images/alarm_button.png")}
                contentFit="contain"
                style={styles.alarmButton}
              />
            </Pressable>
            <Pressable onPress={() => setMenuOpen(true)} hitSlop={8}>
              <Image
                source={require("@/assets/images/menu_button.png")}
                contentFit="contain"
                style={styles.menuButton}
              />
            </Pressable>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.page} bounces={false}>
          <View style={styles.hero}>
            <Image
              source={require("@/assets/images/main_title.png")}
              contentFit="contain"
              style={styles.mainTitle}
            />

            <MenuCarousel
              onStart={(item) => {
                if (item.key === "form") {
                  router.push("/ordersheet");
                } else if (item.key === "random") {
                  router.push("/random_pick");
                }
              }}
            />

            <View style={styles.content}>
              <View style={styles.smallButtonRow}>
                <Pressable
                  style={styles.smallButton}
                  onPress={handleToPickWithFriend}
                >
                  <Image
                    source={require("@/assets/images/pick_with_friend_button.png")}
                    contentFit="contain"
                    style={styles.smallButtonImage}
                  />
                </Pressable>
                <Pressable
                  style={styles.smallButton}
                  onPress={handleToFoodHistory}
                >
                  <Image
                    source={require("@/assets/images/eat_history_button.png")}
                    contentFit="contain"
                    style={styles.smallButtonImage}
                  />
                </Pressable>
              </View>

              <View style={styles.menusTitleView}>
                <Text style={styles.smallMenuText}>최근에 먹은 메뉴</Text>
              </View>
              <ScrollView
                horizontal
                style={styles.menuList}
                contentContainerStyle={styles.menuContent}
                showsHorizontalScrollIndicator={false}
              >
                <MenuBox menu={"비빔밥"} />
                <MenuBox menu={"쌀국수"} />
                <MenuBox menu={"뚝배기"} />
                <MenuBox menu={"김치볶음밥"} />
              </ScrollView>
              <View style={styles.menusTitleView}>
                <Text style={styles.smallMenuText}>요즘 인기 메뉴</Text>
              </View>
              {popularLoading ? (
                <Text style={styles.menuStatusText}>불러오는 중...</Text>
              ) : popularError ? (
                <Text style={styles.menuStatusText}>{popularError}</Text>
              ) : popularMenus.length === 0 ? (
                <Text style={styles.menuStatusText}>
                  아직 인기 메뉴가 없어요.
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  style={styles.menuList}
                  contentContainerStyle={styles.menuContent}
                  showsHorizontalScrollIndicator={false}
                >
                  {popularMenus.map((item) => (
                    <MenuBox
                      key={item.food_kind_id}
                      menu={item.name}
                      image={item.image_url}
                    />
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
      <SideMenuDrawer visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}

type MenuBoxProps = {
  menu: string;
  image?: string;
};

function MenuBox({ menu, image }: MenuBoxProps) {
  const [aspectRatio, setAspectRatio] = useState(1);

  return (
    <>
      <View style={styles.menuBg}>
        {image ? (
          <Image
            source={{ uri: image }}
            contentFit="contain"
            style={[styles.menuImage, { aspectRatio }]}
            onLoad={(e) => {
              const { width, height: imgHeight } = e.source;
              if (width && imgHeight) {
                setAspectRatio(width / imgHeight);
              }
            }}
          />
        ) : null}
        <Text style={styles.menuText} numberOfLines={1}>
          {menu}
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  page: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  hero: {
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    marginTop: 11,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  alarmButton: {
    width: 16,
    height: 20,
  },
  menuButton: {
    width: 20,
    height: 18,
  },
  topLogo: {
    width: 103,
    height: 62,
  },
  mainTitle: {
    width: 312,
    height: 102,
    marginBottom: 34,
  },
  content: {
    width: "100%",
    maxWidth: 352,
  },
  topButton: {
    width: 193,
    height: 248,
    backgroundColor: Colors.cardYellow,
    borderRadius: 20,
    alignItems: "center",
    boxShadow: "0 6px 4px -4px rgba(0, 0, 0, 0.25)",
    marginBottom: 20,
  },
  buttonImage: {
    height: 122.4,
    width: 107.7,
  },
  buttonTitle: {
    fontFamily: Fonts.brand,
    fontSize: 16.5,
    color: Colors.textBrown,
    marginBottom: 7,
  },
  buttonDesc: {
    fontFamily: Fonts.bodyDesc,
    fontSize: 14.24,
    color: Colors.textBrown,
  },
  buttonStart: {
    marginTop: 13,
    width: 138,
    height: 32,
    backgroundColor: Colors.buttonBrown,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonStartText: {
    fontFamily: Fonts.brand,
    fontSize: 11.71,
    color: Colors.white,
  },
  smallButton: {
    flex: 1,
  },
  smallButtonImage: {
    width: "100%",
    aspectRatio: 531 / 222,
  },
  smallButtonRow: {
    flexDirection: "row",
    alignSelf: "stretch",
    gap: 12,
    justifyContent: "center",
    marginTop: 21,
    marginBottom: 20,
  },
  smallMenuText: {
    fontFamily: Fonts.brand,
    fontSize: 13.22,
    alignSelf: "flex-start",
  },
  menuList: {
    alignSelf: "stretch",
  },
  menuContent: {
    gap: 16,
  },
  menuBg: {
    width: 77,
    height: 77,
    borderRadius: 20,
    backgroundColor: Colors.backOrange,
    marginBottom: 14,
    paddingBottom: 2,
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 4,
  },
  menuText: {
    fontFamily: Fonts.bodyDesc,
    fontSize: 10,
  },
  menuImage: {
    height: 45,
  },
  menuStatusText: {
    fontFamily: Fonts.bodyDesc,
    fontSize: 12,
    color: Colors.textBrown,
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  menusTitleView: {
    flexDirection: "row",
    alignSelf: "stretch",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  plusButton: {
    width: 11,
    height: 11,
  },
});
