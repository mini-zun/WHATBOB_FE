import { StyleSheet } from "react-native"
import { Colors, Fonts} from "@/constants/theme"

export const orderSheetStyles = StyleSheet.create({
    selectedOption: {
        opacity: 0.65,
    },
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scroll: {
        flex: 1,
    },
    page: {
        flexGrow: 1,
        paddingBottom: 32,
        width: "100%",
        maxWidth: 430,
        alignSelf: "center",
    },
    statusPage: {
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
        gap: 20,
    },
    completionButton: {
        width: "100%",
    },
    resultPage: {
        paddingHorizontal: 23,
        paddingTop: 32,
    },
    resultTitle: {
        fontFamily: Fonts.nonpreferencefood,
        fontSize: 28.5,
        lineHeight: 36,
        color: Colors.textBrown,
        textAlign: "center",
    },
    resultMenuName: {
        fontFamily: Fonts.nonpreferencefood,
        fontSize: 30.13,
        lineHeight: 46,
        color: Colors.textBrown,
        textAlign: "center",
        marginTop: 38,
    },
    submitErrorSection: {
        gap: 12,
        marginBottom: 20,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 30,
        paddingLeft: 30,
        paddingRight: 21
    },
    backButton: {
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: Colors.backGrey,
        alignItems: "center",
        justifyContent: "center",
    },
    progressTrack: {
        flex: 1,
        height: 10,
        marginLeft: 10,
        marginRight: 13,
        justifyContent: "center",
    },
    progressBackground: {
        position: "absolute",
        left: 0,
        right: 0,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.backGrey
    },
    progressFill: {
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.textBrown,
    },
    progressText: {
        width: 33,
        height: 26,
        lineHeight: 26,
        textAlign: "center",
        fontFamily: Fonts.bodyDesc,
        fontSize: 21.32,
        color: Colors.maintext,
    },
    questionSection: {
        alignItems: "center",
        paddingHorizontal: 20,
    },
    imageCircle: {
        width: 216,
        maxWidth: "100%",
        aspectRatio: 1,
        borderRadius: 108,
        backgroundColor: Colors.backGrey,
        alignItems: "center",
        justifyContent: "center",
    },
    questionTextBox: {
        marginTop: 50,
        width: "100%",
        maxWidth: 352,
        minHeight: 43,
        justifyContent: "center",
    },
    questionText: {
        fontFamily: Fonts.nonpreferencefood,
        fontSize: 28.5,
        lineHeight: 36,
        color: Colors.textBrown,
        textAlign: "center",
    },

    answerSection: {
        alignSelf: "center",
        width: "100%",
        paddingHorizontal: 23,
        marginTop: 45,
    },
    answerButtons: {
        gap: 16,
    },
    answerButton: {
        minHeight: 64,
        paddingVertical: 20,
        paddingHorizontal: 13,
        borderRadius: 999,
        backgroundColor: Colors.textBrown,
        alignItems: "center",
        justifyContent: "center",
        gap: 8.99,
    },
    answerButtonText: {
        fontFamily: Fonts.bodyBlack,
        fontSize: 20,
        lineHeight: 24,
        color: Colors.white,
        textAlign: "center",
    },
    skipButton: {
        alignSelf: "center",
        marginTop: 49,
        maxWidth: "100%",
        minHeight: 23,
        alignItems: "center",
        justifyContent: "center",
    },
    skipText: {
        fontFamily: Fonts.bodyDesc,
        fontSize: 18.81,
        lineHeight: 23,
        color: Colors.textSecondary,
        textAlign: "center",
    },
    characterImage: {
        width: 107,
        height: 108,
        transform: [
            { translateX: 4.5 },
            { translateY: -6 },
        ],
    },

    recommendationTitle: {
        fontFamily: Fonts.nonpreferencefood,
        fontSize: 25.17,
        lineHeight: 38,
        color: Colors.textSecondary,
        textAlign: "center",
    },

    resultImageCircle: {
        alignSelf: "center",
        width: 216,
        maxWidth: "100%",
        aspectRatio: 1,
        borderRadius: 108,
        backgroundColor: Colors.cardYellow,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
    },

    resultActions: {
        marginTop: 54,
    },
})