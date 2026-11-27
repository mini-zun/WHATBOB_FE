import { Asset } from "expo-asset";
import { Platform } from "react-native";

export function getPlacesWidgetFonts(): Record<string, string> {
  const assets = [
    ["BusanDandiMyeongjoM", Asset.fromModule(require("@/assets/fonts/BusanDandiMyeongjoM.otf"))],
    ["Cafe24Simplehae", Asset.fromModule(require("@/assets/fonts/Cafe24Simplehae-v2.0.otf"))],
  ] as const;
  const fonts: Record<string, string> = {};
  for (const [family, asset] of assets) {
    if (Platform.OS === "web") fonts[family] = asset.uri;
    else if (asset.hash) fonts[family] = `/assets/assets/fonts/${asset.name}.${asset.hash}.${asset.type}`;
  }
  return fonts;
}
