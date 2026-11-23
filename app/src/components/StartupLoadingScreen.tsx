import { Image, StyleSheet, useWindowDimensions, View } from "react-native";

import { Colors } from "@/constants/theme";

export default function StartupLoadingScreen() {
    const { width, height } = useWindowDimensions();
    const scale = Math.min(width / 393, height / 852, 1.2);

    return (
        <View style={[
            styles.container,
            { paddingBottom: height * (106.67 / 852) }
        ]}
        >
            <Image source={require("@/assets/images/startscreen.png")}
                style={{
                    width: 240 * scale,
                    aspectRatio: 720 / 916,
                }}
                resizeMode="contain"
                accessible
                accessibilityLabel="왓밥. 오늘 뭐 먹지? 왓밥이 대신 골라줄게"
            />
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
});