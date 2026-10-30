import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Colors, Fonts } from "@/constants/theme";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { MenuCarousel } from "@/components/home/MenuCarousel";

import { useState } from "react";
import { SideMenuDrawer } from "@/components/home/SideMenuDrawer";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.page} bounces={false}>
          <View style={styles.header}>
            <Image
              source={require("@/assets/images/logo_with_text.png")}
              contentFit="contain"
              style={styles.topLogo}
            />
            <Pressable onPress={() => setMenuOpen(true)} hitSlop={8}>
              <Feather name="menu" size={35} />
            </Pressable>
          </View>
          <View style={styles.hero}>
            <Image
              source={require("@/assets/images/main_title.png")}
              contentFit="contain"
              style={styles.mainTitle}
            />

            <MenuCarousel />

            <View style={styles.content}>
              <View style={styles.smallButtonRow}>
                <Pressable style={styles.smallPinkButton}>
                  <View style={styles.horizontalView}>
                    <Image
                      source={require("@/assets/images/with_friend_icon.png")}
                      contentFit="contain"
                      style={styles.smallButtonIcon}
                    />
                    <Text style={styles.smallButtonText}>
                      {`친구와\n같이 고르기`}
                    </Text>
                    <MaterialIcons
                      name="keyboard-arrow-right"
                      size={26}
                      color={Colors.darkBrown}
                    />
                  </View>
                </Pressable>
                <Pressable style={styles.smallGreyButton}>
                  <View style={styles.horizontalView}>
                    <Image
                      source={require("@/assets/images/recent_icon.png")}
                      contentFit="contain"
                      style={styles.smallButtonIcon}
                    />
                    <Text style={styles.smallButtonText}>
                      {`내가 먹은 음식\n모아보기`}
                    </Text>
                    <MaterialIcons
                      name="keyboard-arrow-right"
                      size={26}
                      color={Colors.darkBrown}
                    />
                  </View>
                </Pressable>
              </View>

              <Text style={styles.smallMenuText}>최근에 먹은 메뉴</Text>
              <ScrollView
                horizontal
                style={styles.menuList}
                contentContainerStyle={styles.menuContent}
                showsHorizontalScrollIndicator={false}
              >
                <View style={styles.menuBg}></View>
                <View style={styles.menuBg}></View>
                <View style={styles.menuBg}></View>
                <View style={styles.menuBg}></View>
              </ScrollView>
              <View style={styles.menusTitleView}>
                <Text style={styles.smallMenuText}>요즘 인기 메뉴</Text>
                <Text style={styles.smallMenuText}>+</Text>
              </View>
              <ScrollView
                horizontal
                style={styles.menuList}
                contentContainerStyle={styles.menuContent}
                showsHorizontalScrollIndicator={false}
              >
                <View style={styles.menuBg}></View>
                <View style={styles.menuBg}></View>
                <View style={styles.menuBg}></View>
                <View style={styles.menuBg}></View>
              </ScrollView>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
      <SideMenuDrawer visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
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
  },
  hero: {
    // flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    marginTop: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 40,
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
  horizontalView: {
    flexDirection: "row",
    alignItems: "center",
  },
  indicatorSelected: {
    marginHorizontal: 7.22,
    backgroundColor: Colors.darkBrown,
    width: 13,
    height: 13,
    borderRadius: 40,
  },
  indicatorUnselected: {
    marginHorizontal: 7.22,
    backgroundColor: Colors.lightBrown,
    width: 13,
    height: 13,
    borderRadius: 40,
  },
  smallPinkButton: {
    marginTop: 21,
    flex: 1,
    maxWidth: 170,
    height: 66,
    backgroundColor: Colors.buttonPink,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 6px 4px -4px rgba(0, 0, 0, 0.25)",
    marginBottom: 26,
  },
  smallGreyButton: {
    marginTop: 21,
    maxWidth: 170,
    flex: 1,
    height: 66,
    backgroundColor: Colors.buttonGrey,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 6px 4px -4px rgba(0, 0, 0, 0.25)",
    marginBottom: 26,
  },
  smallButtonIcon: {
    width: 38,
    height: 45,
  },
  smallButtonText: {
    fontFamily: Fonts.brand,
    fontSize: 11.64,
    marginLeft: 15,
  },
  smallButtonRow: {
    flexDirection: "row",
    alignSelf: "stretch",
    gap: 12,
    justifyContent: "center",
  },
  smallMenuText: {
    fontFamily: Fonts.brand,
    fontSize: 13.22,
    marginBottom: 10,
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
  },
  menusTitleView: {
    flexDirection: "row",
    alignSelf: "stretch",
    justifyContent: "space-between",
  },
});
