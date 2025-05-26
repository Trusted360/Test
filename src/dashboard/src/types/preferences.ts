export interface PreferenceOption {
  id: string;
  label: string;
  value: string;
  category?: string;
}

export interface PreferenceWeight {
  value: number;
  label: string;
}

export type PreferenceType = 'cuisine' | 'meal_type' | 'diet' | 'custom';

export interface Preference {
  type: PreferenceType;
  value: string;
  weight: number;
}

export interface DietaryRestriction {
  type: 'allergy' | 'diet' | 'medical' | 'dislike';
  value: string;
  severity: 'low' | 'medium' | 'high';
  memberId?: string;
}

export interface MealPlanConstraints {
  preferences: Preference[];
  dietaryRestrictions: DietaryRestriction[];
  availableIngredients?: any[];
  excludedIngredients?: any[];
}

export const PREFERENCE_WEIGHTS: PreferenceWeight[] = [
  { value: 0.2, label: 'Slight preference' },
  { value: 0.4, label: 'Mild preference' },
  { value: 0.6, label: 'Moderate preference' },
  { value: 0.8, label: 'Strong preference' },
  { value: 1.0, label: 'Must have' }
];

export const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low - Prefer to avoid' },
  { value: 'medium', label: 'Medium - Should avoid' },
  { value: 'high', label: 'High - Must avoid' }
];

export const CUISINE_OPTIONS: PreferenceOption[] = [
  { id: 'italian', label: 'Italian', value: 'italian' },
  { id: 'mexican', label: 'Mexican', value: 'mexican' },
  { id: 'chinese', label: 'Chinese', value: 'chinese' },
  { id: 'japanese', label: 'Japanese', value: 'japanese' },
  { id: 'indian', label: 'Indian', value: 'indian' },
  { id: 'thai', label: 'Thai', value: 'thai' },
  { id: 'mediterranean', label: 'Mediterranean', value: 'mediterranean' },
  { id: 'french', label: 'French', value: 'french' },
  { id: 'american', label: 'American', value: 'american' },
  { id: 'korean', label: 'Korean', value: 'korean' }
];

export const MEAL_TYPE_OPTIONS: PreferenceOption[] = [
  { id: 'breakfast', label: 'Breakfast', value: 'breakfast' },
  { id: 'lunch', label: 'Lunch', value: 'lunch' },
  { id: 'dinner', label: 'Dinner', value: 'dinner' },
  { id: 'snack', label: 'Snack', value: 'snack' },
  { id: 'dessert', label: 'Dessert', value: 'dessert' },
  { id: 'high_protein', label: 'High Protein', value: 'high_protein' },
  { id: 'low_carb', label: 'Low Carb', value: 'low_carb' },
  { id: 'high_fiber', label: 'High Fiber', value: 'high_fiber' },
  { id: 'low_calorie', label: 'Low Calorie', value: 'low_calorie' }
];

export const DIET_TYPE_OPTIONS: PreferenceOption[] = [
  { id: 'vegetarian', label: 'Vegetarian', value: 'vegetarian' },
  { id: 'vegan', label: 'Vegan', value: 'vegan' },
  { id: 'pescatarian', label: 'Pescatarian', value: 'pescatarian' },
  { id: 'keto', label: 'Keto', value: 'keto' },
  { id: 'paleo', label: 'Paleo', value: 'paleo' },
  { id: 'gluten_free', label: 'Gluten Free', value: 'gluten_free' },
  { id: 'dairy_free', label: 'Dairy Free', value: 'dairy_free' },
  { id: 'low_sodium', label: 'Low Sodium', value: 'low_sodium' },
  { id: 'low_fat', label: 'Low Fat', value: 'low_fat' }
]; 