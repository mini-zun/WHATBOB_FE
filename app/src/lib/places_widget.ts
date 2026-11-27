import type { NearbyPlace } from "@/types/places";
import type { Ref } from "react";
import { getPlacesWidgetFonts } from "./places_widget_fonts";

export const PLACES_WIDGET_CHANNEL = "whatbob-places-v1";

export type PlacesViewportHandle = { updateViewport: () => void };

export type PlacesListProps = {
  places: NearbyPlace[];
  selectedPlaceId: string | null;
  disabled: boolean;
  viewportRef?: Ref<PlacesViewportHandle>;
  onSelectPlace: (placeId: string) => Promise<void>;
};

export function createPlacesWidgetPayload(props: PlacesListProps) {
  return {
    channel: PLACES_WIDGET_CHANNEL,
    type: "update",
    apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "",
    selectedPlaceId: props.selectedPlaceId,
    disabled: props.disabled,
    fonts: getPlacesWidgetFonts(),
    places: props.places.map((place) => ({
      id: place.kakao_place_id,
      name: place.name,
      distance: `${(place.distance_m / 1000).toFixed(1)}km`,
      googlePlaceId: place.google_place_id?.trim() || null,
    })),
  };
}

export type PlacesWidgetMessage =
  | { channel: string; type: "ready" }
  | { channel: string; type: "height"; height: number }
  | { channel: string; type: "select"; placeId: string };

export function parsePlacesWidgetMessage(value: unknown): PlacesWidgetMessage | null {
  try {
    const data = typeof value === "string" ? JSON.parse(value) : value;
    if (!data || typeof data !== "object" || data.channel !== PLACES_WIDGET_CHANNEL) return null;
    if (data.type === "ready") return data;
    if (data.type === "height" && Number.isFinite(data.height) && data.height > 0 && data.height <= 20000) return data;
    if (data.type === "select" && typeof data.placeId === "string") return data;
  } catch {
    return null;
  }
  return null;
}

export function getNativePlacesWidgetUrl(): string | null {
  try {
    const value = process.env.EXPO_PUBLIC_GOOGLE_PLACES_WIDGET_URL?.trim();
    if (!value) return null;
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
