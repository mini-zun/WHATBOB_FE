export type AllergenItem = {
    id: string;
    name: string;
    legal_name: string;
    description: string;
};

export type AllergenListData = {
    total_count: number;
    allergens: AllergenItem[];
};

export type AllergenListResponse = {
    success: boolean;
    data: AllergenListData | null;
    message: string | null;
};

export type DislikeFood = {
    id: number;
    keyword: string;
};

export type DislikeFoodData = {
    items: DislikeFood[];
    total_count: number;
};

export type DislikeFoodResponse = {
    success: boolean;
    message: string | null;
    data: DislikeFoodData | null;
};

export type DislikeFoodUpdateRequest = {
    keywords: string[];
};