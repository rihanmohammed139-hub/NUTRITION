export type Language = 'en' | 'te';

export type Gender = 'male' | 'female';
export type HeightUnit = 'ft_in' | 'cm';
export type WeightUnit = 'kg' | 'lbs';
export type MealCount = 2 | 3 | 4 | 5;
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';
export type FoodPreference = 'vegetarian' | 'non_vegetarian' | 'eggetarian';

export type WellnessPriority =
  | 'lose_weight'
  | 'gain_weight'
  | 'build_muscle'
  | 'improve_fitness'
  | 'improve_nutrition'
  | 'maintain_weight';

export interface ProfileInput {
  name: string;
  age: number | null;
  gender: Gender;
  heightUnit: HeightUnit;
  heightCm: number | null;
  heightFt: number | null;
  heightIn: number | null;
  weightUnit: WeightUnit;
  currentWeight: number | null;
  targetWeight: number | null;
  mealsPerDay: MealCount;
  waterGlasses: number;
  activityLevel: ActivityLevel;
  priorities: WellnessPriority[];
  foodPreference: FoodPreference;
  advisorName: string;
  advisorContact: string;
}

export interface MealItem {
  id: string;
  nameKey: string;
  proteinGrams: number;
  calories: number;
  foodIdeasEn: string;
  foodIdeasTe: string;
}

export interface WorkoutDay {
  dayNumber: number;
  dayLabelKey: string;
  workoutEn: string;
  workoutTe: string;
  durationEn: string;
  durationTe: string;
}

export interface CalculationResults {
  // Converted baseline metrics
  heightCm: number;
  heightFormattedEn: string;
  heightFormattedTe: string;
  currentWeightKg: number;
  targetWeightKg: number;
  currentWeightDisplay: string;
  targetWeightDisplay: string;
  weightDifferenceKg: number;
  weightDifferenceDisplay: string;

  // BMI
  bmi: number;
  bmiCategoryKey: 'underweight' | 'normal' | 'overweight' | 'obese';

  // Energy & Metabolism
  bmr: number;
  activityMultiplier: number;
  tdee: number;
  goalAdjustmentKcal: number;
  isCalorieFloorApplied: boolean;
  calorieFloorValue: number;
  dailyCalories: number;

  // Protein & Water
  proteinPerKg: number;
  dailyProteinG: number;
  targetWaterGlasses: number;
  currentWaterGlasses: number;

  // Timeline
  weeksToTarget: number;
  daysToTarget: number;
  isAlreadyAtTarget: boolean;

  // Tables
  mealPlan: MealItem[];
  exercisePlan: WorkoutDay[];
  lifestyleTipsEn: string[];
  lifestyleTipsTe: string[];
}
