export type ApiResponse<T> = {
    success: boolean;
    data: T | null;
    message: string | null;
};

export type FilterRule = {
    field: string;
    op: string;
    value: unknown;
};

export type QuestionOption = {
    option_id: string;
    label: string;
    rules: FilterRule[];
};

export type OrderSheetQuestion = {
    id: number;
    question_code: string;
    cluster_key: string;
    question_text: string;
    options: QuestionOption[];
    info_gain_score: number;
    ml_weight: number;
    shown_count: number;
    positive_count: number;
    is_exploration: boolean;
};

export type OrderSheetQuestionsData = {
    questions: OrderSheetQuestion[];
    total_count: number;
    exploitation_count: number;
    exploration_count: number;
};

export type OrderSheetQuestionsResponse = ApiResponse<OrderSheetQuestionsData>

export type OrderSheetAnswer = {
  question_id: number;
  option_id: string;
};

export type OrderSheetRecommendRequest = {
  user_id?: number | null;
  exclusions?: string[];
  answers: OrderSheetAnswer[];
  top_k?: number;
};

export type RecommendedMenu = {
  menu_id: number;
  food_code: string;
  name: string;
  base_name: string;
  category_large: string;
  category_medium: string | null;
  meal_type: string;
  has_soup: boolean;
  cooking_style: string;
  main_ingredient: string;
  flavor_intensity: string;
  temperature: string;
  heaviness: string;
  kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carb_g: number | null;
  sodium_mg: number | null;
  match_score: number;
  matched_question_codes: string[];
};

export type OrderSheetRecommendData = {
  recommendation_id: number;
  recommended_menus: RecommendedMenu[];
  excluded_count: number;
  candidate_count: number;
};

export type OrderSheetRecommendResponse =
  ApiResponse<OrderSheetRecommendData>;

export type RecommendationFeedbackRequest = {
  user_id?: number | null;
  selected_menu_id?: number | null;
  is_satisfied: boolean;
};

export type RecommendationFeedbackData = {
  feedback_id: number;
  recommendation_id: number;
  is_satisfied: boolean;
  updated_weights: Record<string, number>;
};

export type RecommendationFeedbackResponse =
  ApiResponse<RecommendationFeedbackData>