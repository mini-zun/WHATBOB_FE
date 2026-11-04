import { Feather } from "@expo/vector-icons";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, Fonts } from "@/constants/theme";
import { parseRoomId } from "@/lib/rooms";

const handleBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/pick_with_friend");
};

export default function ScanRoomScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [invalidQr, setInvalidQr] = useState(false);
  const scannedRef = useRef(false);

  const handleScanned = ({ data }: BarcodeScanningResult) => {
    if (scannedRef.current) return;
    const roomId = parseRoomId(data);
    if (!roomId) {
      setInvalidQr(true);
      return;
    }
    scannedRef.current = true;
    router.replace(`/room/${roomId}`);
  };

  const renderBody = () => {
    if (!permission) return null;

    if (!permission.granted) {
      if (Platform.OS === "web" && permission.status === "denied") {
        return (
          <Text style={styles.permissionText}>
            {`브라우저 주소창의 카메라 아이콘에서\n카메라 권한을 허용해 주세요`}
          </Text>
        );
      }
      const canAsk = Platform.OS === "web" || permission.canAskAgain;
      return (
        <View style={styles.permission}>
          <Text style={styles.permissionText}>
            {`QR 코드를 스캔하려면\n카메라 권한이 필요해요`}
          </Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => (canAsk ? requestPermission() : Linking.openSettings())}
          >
            <Text style={styles.primaryBtnText}>
              {canAsk ? "카메라 권한 허용" : "설정에서 허용하기"}
            </Text>
          </Pressable>
        </View>
      );
    }

    return (
      <>
        <View style={styles.cameraBox}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={handleScanned}
          />
        </View>
        <Text style={[styles.guide, invalidQr && styles.guideError]}>
          {invalidQr
            ? "WHATBOB 방 QR 코드가 아니에요."
            : "친구 화면의 QR 코드를 네모 안에 맞춰 주세요."}
        </Text>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Feather name="arrow-left" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>QR로 참여하기</Text>
      </View>
      <View style={styles.page}>
        <View style={styles.content}>{renderBody()}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    paddingHorizontal: 23,
    paddingTop: 27,
    paddingBottom: 27,
    alignItems: "center",
    gap: 28,
    width: "100%",
    maxWidth: 352 + 23 * 2,
    alignSelf: "center",
  },
  headerTitle: {
    fontFamily: Fonts.nonpreferencefood,
    fontSize: 27,
  },
  backButton: {
    height: 58,
    width: 55,
    borderRadius: 100,
    backgroundColor: Colors.backGrey,
    justifyContent: "center",
    alignItems: "center",
  },
  page: {
    flex: 1,
    paddingHorizontal: 23,
    paddingVertical: 16,
    alignItems: "center",
  },
  content: {
    width: "100%",
    maxWidth: 352,
    gap: 20,
  },
  cameraBox: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: Colors.textBrown,
    backgroundColor: Colors.maintext,
  },
  guide: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  guideError: {
    color: Colors.red,
  },
  permission: {
    alignItems: "center",
    gap: 20,
    marginTop: 40,
  },
  permissionText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 20,
    textAlign: "center",
  },
  primaryBtn: {
    backgroundColor: Colors.textBrown,
    borderRadius: 100,
    width: "100%",
    maxWidth: 348,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
    color: Colors.white,
  },
});
