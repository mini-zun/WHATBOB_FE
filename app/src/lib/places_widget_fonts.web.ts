import { Asset } from "expo-asset";

export function getPlacesWidgetFonts(): Record<string, string> {
  return {
    BusanDandiMyeongjoM: Asset.fromModule(require("@/assets/fonts/BusanDandiMyeongjoM.otf")).uri,
    Cafe24Simplehae: Asset.fromModule(require("@/assets/fonts/Cafe24Simplehae-v2.0.otf")).uri,
  };
}
