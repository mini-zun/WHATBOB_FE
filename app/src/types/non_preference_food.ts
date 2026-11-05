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

