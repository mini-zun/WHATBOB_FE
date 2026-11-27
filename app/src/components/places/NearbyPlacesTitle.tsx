import { StyleSheet, Text } from "react-native";

import { Colors, Fonts } from "@/constants/theme";

type Props = {
    text: string;
};

export default function NearbyPlacesTitle({ text }: Props) {
    return (
        <Text
            accessibilityRole="header"
            accessibilityLabel={text}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={22 / 34.7}
            ellipsizeMode="tail"
            style={styles.title}
        >
            {text}
        </Text>
    );
}

const styles = StyleSheet.create({
    title: {
        height: 56,
        marginTop: 7,
        marginHorizontal: 12,
        fontFamily: Fonts.nonpreferencefood,
        fontSize: 34.7,
        lineHeight: 56,
        color: Colors.maintext,
    },
});
