import { Image, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { Colors, Fonts } from "@/constants/theme";

export default function StartupLoadingScreen() {
    const { width, height } = useWindowDimensions();
    const scale = Math.min(width/393, height / 852, 1.2);

    return (
        <View style={[
            styles.container,
            { paddingBottom: height * (112/852) }            
        ]}
        >
            <Image source={require("@/assets/images/whatbob_icon.png")}
            style={{width: 150.51 * scale,
                height: 152.59 * scale,
            }}
            resizeMode="contain"
            accessible={false}
            />

            <Text style={[styles.title, {
                marginTop: 10 * scale,
                fontSize: 51.86 * scale,
                lineHeight: 62 * scale,
            },
            ]}
            >왓밥</Text>

            <Text style={[styles.description, {
                marginTop: 10 * scale,
                fontSize: 29.23 * scale,
                lineHeight: 35.26 * scale,
            }
            ]}
            >{"오늘 뭐 먹지?\n왓밥이 대신 골라줄게"}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: Fonts.startupTitle,
    color: Colors.textBrown,
    textAlign: "center",
    includeFontPadding: false,
  },
  description: {
    fontFamily: Fonts.bodyDesc,
    color: Colors.textSecondary,
    textAlign: "center",
    includeFontPadding: false,
  },
});