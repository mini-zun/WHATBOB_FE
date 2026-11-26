import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Colors, Fonts } from "@/constants/theme";

type Props = {
    text: string;
};

const BASE_FONT_SIZE = 34.7;
const MIN_FONT_SIZE = 22;

export default function NearbyPlacesTitle({ text }: Props) {
    const [width, setWidth] = useState(0);
    const [fontSize, setFontSize] = useState(BASE_FONT_SIZE);

    useEffect(() => {
        if (width <= 0) return;

        let cancelled = false;

        const measure = () => {
            if (cancelled) return;

            const context = document.createElement("canvas").getContext("2d");
            if (!context) return;

            context.font = `${BASE_FONT_SIZE}px "${Fonts.nonpreferencefood}"`;
            const textWidth = context.measureText(text).width;

            setFontSize(textWidth > width
                ? Math.max(MIN_FONT_SIZE, BASE_FONT_SIZE * (width - 1) / textWidth)
                : BASE_FONT_SIZE);
        };

        void document.fonts.ready.then(measure);

        return () => {
            cancelled = true;
        };
    }, [text, width]);

    return (
        <View
            style={styles.container}
            onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        >
            <Text
                accessibilityRole="header"
                accessibilityLabel={text}
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[styles.title, { fontSize }]}
            >
                {text}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 56,
        marginTop: 7,
        marginHorizontal: 12,
    },
    title: {
        height: 56,
        lineHeight: 56,
        fontFamily: Fonts.nonpreferencefood,
        color: Colors.maintext,
    },
});
