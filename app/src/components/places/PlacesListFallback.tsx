import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors, Fonts } from "@/constants/theme";
import type { PlacesListProps } from "@/lib/places_widget";

export default function PlacesListFallback({
  places, selectedPlaceId, disabled, onSelectPlace, message,
}: PlacesListProps & { message?: string }) {
  return (
    <View style={styles.list}>
      {message && <Text style={styles.notice} accessibilityLiveRegion="polite">{message}</Text>}
      {places.map((place, index) => (
        <Pressable
          key={place.kakao_place_id}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedPlaceId === place.kakao_place_id, disabled }}
          disabled={disabled}
          onPress={() => { void onSelectPlace(place.kakao_place_id); }}
          style={styles.card}
        >
          <Text style={styles.name} numberOfLines={1}>{index + 1} · {place.name}</Text>
          <Text style={styles.distance}>{(place.distance_m / 1000).toFixed(1)}km</Text>
          <Text style={styles.notice}>평점 정보 없음</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 13 },
  card: { minHeight: 66, paddingHorizontal: 24, paddingVertical: 6, borderRadius: 14, borderWidth: 1.9, borderColor: "rgba(119, 119, 119, 0.2)", backgroundColor: "rgba(249, 239, 221, 0.2)", gap: 2 },
  name: { fontFamily: Fonts.nonpreferencefood, fontSize: 22.4, lineHeight: 28, color: Colors.maintext },
  distance: { fontFamily: Fonts.bodyDesc, fontSize: 16, lineHeight: 20, color: Colors.textSecondary, textAlign: "right" },
  notice: { fontFamily: Fonts.bodyRegular, color: Colors.textSecondary, fontSize: 14 },
});
