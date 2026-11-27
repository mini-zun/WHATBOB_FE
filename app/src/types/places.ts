export type SearchRadius = 1000 | 3000;

export type NearbyPlace = {
    kakao_place_id: string;
    name: string;
    category_name: string | null;
    phone: string | null;
    address: string | null;
    road_address: string | null;
    latitude: number;
    longitude: number;
    distance_m: number;
    place_url: string | null;
    directions_url: string;
    walking_directions_url: string;
    google_place_id?: string | null;
};

export type NearbyPlacesData = {
    menu_id: number;
    menu_base_name: string;
    search_keyword: string;
    radius_m: number;
    provider: "KAKAO";
    distance_type: "STRAIGHT_LINE";
    total_count: number;
    places: NearbyPlace[];
};

export type NearbyPlacesResponse = {
  success: boolean;
  data: NearbyPlacesData | null;
  message: string | null;
};
