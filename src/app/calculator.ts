import {
  CalculationResults,
  MealCount,
  MealItem,
  ProfileInput,
  WorkoutDay,
} from './types';

/**
 * Calculates all metabolic, nutritional, meal distribution, and fitness plans.
 */
export function calculateWellnessProfile(input: ProfileInput): CalculationResults {
  // 1. Normalize Height to cm
  let heightCm = 0;
  if (input.heightUnit === 'cm') {
    heightCm = Number(input.heightCm) || 165;
  } else {
    const feet = Number(input.heightFt) || 5;
    const inches = Number(input.heightIn) || 6;
    heightCm = Math.round((feet * 12 + inches) * 2.54 * 10) / 10;
  }

  // 2. Normalize Weight to kg
  let currentWeightKg = 0;
  let targetWeightKg = 0;
  if (input.weightUnit === 'kg') {
    currentWeightKg = Number(input.currentWeight) || 65;
    targetWeightKg = Number(input.targetWeight) || 60;
  } else {
    currentWeightKg = Math.round(((Number(input.currentWeight) || 143) / 2.20462) * 10) / 10;
    targetWeightKg = Math.round(((Number(input.targetWeight) || 132) / 2.20462) * 10) / 10;
  }

  const age = Number(input.age) || 30;
  const gender = input.gender;

  // Height and weight display strings
  const feetVal = Math.floor(heightCm / 30.48);
  const inchesVal = Math.round((heightCm % 30.48) / 2.54);
  const heightFormattedEn = `${heightCm} cm (${feetVal} ft ${inchesVal} in)`;
  const heightFormattedTe = `${heightCm} సెం.మీ (${feetVal} అడుగులు ${inchesVal} అంగుళాలు)`;

  const currentLbs = Math.round(currentWeightKg * 2.20462 * 10) / 10;
  const targetLbs = Math.round(targetWeightKg * 2.20462 * 10) / 10;
  const currentWeightDisplay = `${currentWeightKg} kg (${currentLbs} lbs)`;
  const targetWeightDisplay = `${targetWeightKg} kg (${targetLbs} lbs)`;

  const weightDifferenceKg = Math.round((targetWeightKg - currentWeightKg) * 10) / 10;
  const absDiffKg = Math.abs(weightDifferenceKg);
  const absDiffLbs = Math.round(absDiffKg * 2.20462 * 10) / 10;
  const weightDifferenceDisplay =
    weightDifferenceKg === 0
      ? '0 kg (Target reached)'
      : `${weightDifferenceKg > 0 ? '+' : ''}${weightDifferenceKg} kg (${absDiffLbs} lbs)`;

  // 3. BMI calculation
  const heightM = heightCm / 100;
  const bmi = Math.round((currentWeightKg / (heightM * heightM)) * 10) / 10;
  let bmiCategoryKey: 'underweight' | 'normal' | 'overweight' | 'obese' = 'normal';
  if (bmi < 18.5) {
    bmiCategoryKey = 'underweight';
  } else if (bmi <= 24.9) {
    bmiCategoryKey = 'normal';
  } else if (bmi <= 29.9) {
    bmiCategoryKey = 'overweight';
  } else {
    bmiCategoryKey = 'obese';
  }

  // 4. BMR using Mifflin-St Jeor formula
  // Men: BMR = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
  // Women: BMR = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
  const bmrBase = 10 * currentWeightKg + 6.25 * heightCm - 5 * age;
  const bmr = Math.round(bmrBase + (gender === 'male' ? 5 : -161));

  // 5. Activity Multiplier & TDEE
  let activityMultiplier = 1.2;
  switch (input.activityLevel) {
    case 'sedentary':
      activityMultiplier = 1.2;
      break;
    case 'lightly_active':
      activityMultiplier = 1.375;
      break;
    case 'moderately_active':
      activityMultiplier = 1.55;
      break;
    case 'very_active':
      activityMultiplier = 1.725;
      break;
  }
  const tdee = Math.round(bmr * activityMultiplier);

  // 6. Goal Adjustment
  // Guided by first priority
  const primaryPriority = input.priorities[0] || 'maintain_weight';
  let goalAdjustmentKcal = 0;
  if (primaryPriority === 'lose_weight') {
    goalAdjustmentKcal = -500;
  } else if (primaryPriority === 'gain_weight' || primaryPriority === 'build_muscle') {
    goalAdjustmentKcal = 300;
  } else {
    goalAdjustmentKcal = 0;
  }

  // Calorie Safety Floor: never below 1200 kcal for women or 1500 kcal for men
  const calorieFloorValue = gender === 'male' ? 1500 : 1200;
  const unadjustedCalories = tdee + goalAdjustmentKcal;
  const isCalorieFloorApplied = unadjustedCalories < calorieFloorValue;
  const dailyCalories = Math.max(calorieFloorValue, unadjustedCalories);

  // 7. Protein Requirement:
  // 1.2 g/kg for maintain / improve nutrition
  // 1.6 g/kg for lose weight or build muscle
  const needsHigherProtein =
    input.priorities.includes('lose_weight') || input.priorities.includes('build_muscle');
  const proteinPerKg = needsHigherProtein ? 1.6 : 1.2;
  const dailyProteinG = Math.round(targetWeightKg * proteinPerKg);

  // 8. Hydration Recommendation
  // Minimum 8 glasses (2 Liters), scaled by body weight (~35 ml/kg)
  const targetWaterGlasses = Math.max(8, Math.min(16, Math.round(currentWeightKg * 0.14)));

  // 9. Timeline calculation: safe change of 0.5 kg/week
  const isAlreadyAtTarget = absDiffKg < 0.2;
  const weeksToTarget = isAlreadyAtTarget ? 0 : Math.round((absDiffKg / 0.5) * 10) / 10;
  const daysToTarget = Math.round(weeksToTarget * 7);

  // 10. Meal Plan Split across chosen meal count
  const mealPlan = generateMealPlan(
    input.mealsPerDay,
    dailyCalories,
    dailyProteinG,
    input.foodPreference
  );

  // 11. 7-Day Exercise Plan
  const exercisePlan = generateExercisePlan(input.activityLevel, primaryPriority);

  // 12. Lifestyle Tips
  const lifestyleTipsEn = [
    'Drink 1 to 2 glasses of room-temperature water immediately upon waking before eating.',
    'Space water evenly across your day; avoid chugging large quantities during or immediately after meals.',
    'Maintain a consistent sleep window every night, targeting 7 to 8 hours of uninterrupted rest.',
    'Eat mindfully: chew each mouthful thoroughly, avoid screens while eating, and stop when 80% full.',
    'Target 8,000 to 10,000 daily steps through brisk 10-minute walking breaks after main meals.',
    'Include a bowl of fresh cucumber, carrots, or seasonal salad before lunch and dinner for fiber.',
  ];

  const lifestyleTipsTe = [
    'ప్రతిరోజూ ఉదయం నిద్రలేవగానే బ్రేక్‌ఫాస్ట్‌కు ముందు 1-2 గ్లాసుల సాధారణ నీరు త్రాగండి.',
    'రోజంతా క్రమం తప్పకుండా నీరు త్రాగండి; భోజనం చేసేటప్పుడు లేదా వెంటనే అధికంగా నీరు త్రాగడం నివారించండి.',
    'రాత్రి వేళల్లో 7 నుండి 8 గంటల పాటు ప్రశాంతమైన నిద్రను క్రమం తప్పకుండా అలవాటు చేసుకోండి.',
    'ఆహారాన్ని నెమ్మదిగా, ఫోన్ లేదా టీవీ చూడకుండా నమిలి తినండి; కడుపు 80% నిండినప్పుడు తినడం ఆపండి.',
    'రోజువారీ ఆహారం తర్వాత 10 నిమిషాల నడకతో రోజుకు 8,000 నుండి 10,000 అడుగులు పూర్తి చేయండి.',
    'జీర్ణక్రియ మెరుగుపడటానికి మరియు పీచు పదార్థం కోసం భోజనానికి ముందు దోసకాయ, క్యారెట్ లేదా తాజా సలాడ్ తీసుకోండి.',
  ];

  return {
    heightCm,
    heightFormattedEn,
    heightFormattedTe,
    currentWeightKg,
    targetWeightKg,
    currentWeightDisplay,
    targetWeightDisplay,
    weightDifferenceKg,
    weightDifferenceDisplay,
    bmi,
    bmiCategoryKey,
    bmr,
    activityMultiplier,
    tdee,
    goalAdjustmentKcal,
    isCalorieFloorApplied,
    calorieFloorValue,
    dailyCalories,
    proteinPerKg,
    dailyProteinG,
    targetWaterGlasses,
    currentWaterGlasses: input.waterGlasses,
    weeksToTarget,
    daysToTarget,
    isAlreadyAtTarget,
    mealPlan,
    exercisePlan,
    lifestyleTipsEn,
    lifestyleTipsTe,
  };
}

/**
 * Builds meal distribution table based on meal count & dietary preference.
 */
function generateMealPlan(
  mealCount: MealCount,
  totalCalories: number,
  totalProtein: number,
  preference: ProfileInput['foodPreference']
): MealItem[] {
  interface SplitRatio {
    id: string;
    nameKey: string;
    calRatio: number;
    protRatio: number;
  }

  let ratios: SplitRatio[] = [];

  switch (mealCount) {
    case 2:
      ratios = [
        { id: 'breakfast', nameKey: 'breakfast', calRatio: 0.45, protRatio: 0.45 },
        { id: 'dinner', nameKey: 'dinner', calRatio: 0.55, protRatio: 0.55 },
      ];
      break;
    case 3:
      ratios = [
        { id: 'breakfast', nameKey: 'breakfast', calRatio: 0.25, protRatio: 0.25 },
        { id: 'lunch', nameKey: 'lunch', calRatio: 0.40, protRatio: 0.45 },
        { id: 'dinner', nameKey: 'dinner', calRatio: 0.35, protRatio: 0.30 },
      ];
      break;
    case 4:
      ratios = [
        { id: 'breakfast', nameKey: 'breakfast', calRatio: 0.25, protRatio: 0.25 },
        { id: 'lunch', nameKey: 'lunch', calRatio: 0.35, protRatio: 0.35 },
        { id: 'eveningSnack', nameKey: 'eveningSnack', calRatio: 0.15, protRatio: 0.15 },
        { id: 'dinner', nameKey: 'dinner', calRatio: 0.25, protRatio: 0.25 },
      ];
      break;
    case 5:
    default:
      ratios = [
        { id: 'breakfast', nameKey: 'breakfast', calRatio: 0.20, protRatio: 0.20 },
        { id: 'midMorningSnack', nameKey: 'midMorningSnack', calRatio: 0.15, protRatio: 0.15 },
        { id: 'lunch', nameKey: 'lunch', calRatio: 0.30, protRatio: 0.35 },
        { id: 'eveningSnack', nameKey: 'eveningSnack', calRatio: 0.15, protRatio: 0.15 },
        { id: 'dinner', nameKey: 'dinner', calRatio: 0.20, protRatio: 0.15 },
      ];
      break;
  }

  // Generate food suggestions strictly in plain Indian foods with NO brand names
  return ratios.map((r) => {
    const mealCalories = Math.round(totalCalories * r.calRatio);
    const mealProtein = Math.round(totalProtein * r.protRatio);
    const ideas = getFoodIdeas(r.id, preference);

    return {
      id: r.id,
      nameKey: r.nameKey,
      calories: mealCalories,
      proteinGrams: mealProtein,
      foodIdeasEn: ideas.en,
      foodIdeasTe: ideas.te,
    };
  });
}

function getFoodIdeas(
  mealId: string,
  preference: ProfileInput['foodPreference']
): { en: string; te: string } {
  if (preference === 'vegetarian') {
    switch (mealId) {
      case 'breakfast':
        return {
          en: 'Idli (2-3) with sambar and mint chutney, or vegetable oats upma, or moong dal chilla / pesarattu with curd.',
          te: 'ఇడ్లీ (2-3) సాంబార్ మరియు పుదీనా చట్నీతో, లేదా వెజిటబుల్ ఓట్స్ ఉప్మా, లేదా పెసరట్టు / మూంగ్ దాల్ చిల్లా పెరుగుతో.',
        };
      case 'midMorningSnack':
        return {
          en: 'A glass of spiced buttermilk (chaas), roasted chana, and a seasonal whole fruit (apple or guava).',
          te: 'మసాలా మజ్జిగ గ్లాస్, వేయించిన శనగలు, మరియు ఒక తాజా పండు (జామకాయ లేదా ఆపిల్).',
        };
      case 'lunch':
        return {
          en: '2 whole wheat rotis or brown rice with thick dal/tadka, paneer bhurji or mixed vegetable curry, curd, and fresh cucumber salad.',
          te: '2 చపాతీలు లేదా బ్రౌన్ రైస్, చిక్కటి పప్పు, పనీర్ భుర్జీ లేదా మిక్స్‌డ్ కూరగాయల కూర, తాజా పెరుగు మరియు దోసకాయ సలాడ్.',
        };
      case 'eveningSnack':
        return {
          en: 'Boiled green moong sprouts chaat with lemon and onion, handful of roasted peanuts, and black tea/coffee without sugar.',
          te: 'ఉడికించిన పచ్చి పెసల మొలకల చాట్ (నిమ్మరసం, ఉల్లిపాయతో), గుప్పెడు వేరుశనగలు, మరియు చక్కెర లేని గ్రీన్ టీ లేదా బ్లాక్ కాఫీ.',
        };
      case 'dinner':
        return {
          en: '2 light phulkas with palak paneer or soya chunk curry, bottle gourd dal, warm clear vegetable soup, and tomato salad.',
          te: '2 పుల్కాలు పాలక్ పనీర్ లేదా సోయా చంక్స్ కూరతో, సొరకాయ పప్పు, వేడి వెజిటబుల్ సూప్ మరియు టమోటా సలాడ్.',
        };
      default:
        return {
          en: 'Wholesome balanced vegetarian meal with dal, vegetables, curd, and whole grains.',
          te: 'పప్పు, కూరగాయలు, పెరుగు మరియు తృణధాన్యాలతో కూడిన సమతుల్య శాకాహార భోజనం.',
        };
    }
  } else if (preference === 'eggetarian') {
    switch (mealId) {
      case 'breakfast':
        return {
          en: '3 boiled egg whites + 1 whole egg omelette with 2 slices of whole wheat toast or roti, with fresh mint chutney.',
          te: '3 ఉడకబెట్టిన గుడ్డు తెల్లసొనలు + 1 పూర్తి గుడ్డు ఆమ్లెట్ 2 చపాతీలు లేదా బ్రౌన్ బ్రెడ్‌తో, మరియు పుదీనా చట్నీ.',
        };
      case 'midMorningSnack':
        return {
          en: '1 whole boiled egg with black pepper, fresh buttermilk, and a seasonal fruit.',
          te: '1 ఉడకబెట్టిన గుడ్డు మిరియాల పొడితో, తాజా మజ్జిగ మరియు ఒక పండు.',
        };
      case 'lunch':
        return {
          en: 'Brown rice or 2 rotis with spicy egg curry (2 eggs), yellow dal, curd, and mixed cabbage-carrot poriyal.',
          te: 'బ్రౌన్ రైస్ లేదా 2 చపాతీలు, గుడ్ల కూర (2 గుడ్లు), పప్పు, గడ్డ పెరుగు మరియు క్యాబేజీ-క్యారెట్ వేపుడు.',
        };
      case 'eveningSnack':
        return {
          en: 'Egg white chaat (cubed boiled egg whites with chat masala, coriander, tomato) and green tea.',
          te: 'గుడ్డు తెల్లసొన చాట్ (ఉడికించిన గుడ్డు తెల్లసొన ముక్కలు, చాట్ మసాలా, కొత్తిమీర, టమోటాతో) మరియు గ్రీన్ టీ.',
        };
      case 'dinner':
        return {
          en: '2 phulkas with egg bhurji (scrambled eggs with onions and bell peppers), dal tadka, and clear vegetable soup.',
          te: '2 పుల్కాలు గుడ్డు భుర్జీ (ఉల్లిపాయలు, క్యాప్సికమ్‌తో వేయించిన గుడ్డు), పప్పు మరియు వెజిటబుల్ క్లియర్ సూప్.',
        };
      default:
        return {
          en: 'High-protein egg and wholesome vegetarian combination with lentils and vegetables.',
          te: 'గుడ్లు, పప్పులు మరియు తాజా కూరగాయలతో కూడిన పోషక భోజనం.',
        };
    }
  } else {
    // Non-vegetarian
    switch (mealId) {
      case 'breakfast':
        return {
          en: 'Egg bhurji (2 eggs) with 2 rotis or vegetable idli with sambar, and 2 boiled egg whites.',
          te: 'గుడ్డు భుర్జీ (2 గుడ్లు) 2 చపాతీలతో లేదా ఇడ్లీ సాంబార్‌తో పాటు 2 ఉడకబెట్టిన గుడ్డు తెల్లసొనలు.',
        };
      case 'midMorningSnack':
        return {
          en: 'Spiced buttermilk, boiled egg whites or roasted chana, and a seasonal fruit.',
          te: 'మజ్జిగ, ఉడకబెట్టిన గుడ్డు తెల్లసొనలు లేదా వేయించిన శనగలు, మరియు ఒక పండు.',
        };
      case 'lunch':
        return {
          en: 'Brown rice or 2 rotis with homestyle chicken curry (120-150g) or fish curry, yellow dal, curd, and green salad.',
          te: 'బ్రౌన్ రైస్ లేదా 2 చపాతీలు, ఇంటి చికెన్ కూర (120-150 గ్రాములు) లేదా చేపల పులుసు, పప్పు, పెరుగు మరియు గ్రీన్ సలాడ్.',
        };
      case 'eveningSnack':
        return {
          en: 'Boiled sprouts chaat with shredded boiled chicken or boiled egg whites, green tea, and roasted makhana.',
          te: 'ఉడికించిన మొలకలు మరియు చికెన్ ముక్కల చాట్ లేదా గుడ్లు, గ్రీన్ టీ మరియు తామర గింజలు (మఖానా).',
        };
      case 'dinner':
        return {
          en: 'Grilled or pan-tossed chicken breast / fish with steamed vegetables, 1-2 phulkas, and a light chicken/veg clear soup.',
          te: 'గ్రిల్డ్ లేదా బాండీలో వేయించిన చికెన్ / చేప ముక్కలు ఉడికించిన కూరగాయలతో, 1-2 పుల్కాలు మరియు క్లియర్ సూప్.',
        };
      default:
        return {
          en: 'Balanced lean protein (chicken/fish/eggs) with fiber-rich whole grains and lentils.',
          te: 'చికెన్/చేపలు/గుడ్లు వంటి స్వచ్ఛమైన ప్రోటీన్ మరియు తృణధాన్యాలతో కూడిన సమతుల్య ఆహారం.',
        };
    }
  }
}

/**
 * Generates structured 7-Day exercise routine tailored to user's activity and priorities.
 */
function generateExercisePlan(
  _activityLevel: ProfileInput['activityLevel'],
  primaryPriority: ProfileInput['priorities'][0]
): WorkoutDay[] {
  if (primaryPriority === 'build_muscle' || primaryPriority === 'gain_weight') {
    return [
      {
        dayNumber: 1,
        dayLabelKey: 'day1',
        workoutEn: 'Upper Body Strength (Chest pushups, dumbell/bodyweight shoulder press, rows)',
        workoutTe: 'పై శరీర బలం (పుషప్స్, భుజాల వ్యాయామాలు, వీపు కండరాల వ్యాయామం)',
        durationEn: '40 - 45 mins',
        durationTe: '40 - 45 నిమిషాలు',
      },
      {
        dayNumber: 2,
        dayLabelKey: 'day2',
        workoutEn: 'Lower Body Strength (Squats, lunges, calf raises, glute bridges)',
        workoutTe: 'కింది శరీర బలం (స్క్వాట్స్, లంజెస్, పిక్కల వ్యాయామం, కాళ్ల కండరాలు)',
        durationEn: '40 - 45 mins',
        durationTe: '40 - 45 నిమిషాలు',
      },
      {
        dayNumber: 3,
        dayLabelKey: 'day3',
        workoutEn: 'Active Recovery & Core (Light 25-minute brisk walk, planks, mobility stretches)',
        workoutTe: 'యాక్టివ్ రికవరీ మరియు కోర్ (25 నిమిషాల తేలికపాటి నడక, ప్లాంక్స్, స్ట్రెచింగ్)',
        durationEn: '30 mins',
        durationTe: '30 నిమిషాలు',
      },
      {
        dayNumber: 4,
        dayLabelKey: 'day4',
        workoutEn: 'Push & Pull Compound Muscle Focus (Bodyweight pull/push drills & resistance)',
        workoutTe: 'పుష్ & పుల్ వ్యాయామాలు (శరీర బరువుతో చేసే కండరాల కదలికలు)',
        durationEn: '45 mins',
        durationTe: '45 నిమిషాలు',
      },
      {
        dayNumber: 5,
        dayLabelKey: 'day5',
        workoutEn: 'Legs & Core Power (Romanian deadlifts, walking lunges, side planks)',
        workoutTe: 'కాళ్లు మరియు పొట్ట బలం (వాకింగ్ లంజెస్, సైడ్ ప్లాంక్స్, లెగ్ ఎక్సర్‌సైజులు)',
        durationEn: '40 mins',
        durationTe: '40 నిమిషాలు',
      },
      {
        dayNumber: 6,
        dayLabelKey: 'day6',
        workoutEn: 'Functional Full-Body Conditioning (Bodyweight circuits & posture training)',
        workoutTe: 'ఫంక్షనల్ ఫుల్ బాడీ వ్యాయామం (శరీర దృఢత్వం మరియు భంగిమ మెరుగుదల)',
        durationEn: '35 - 40 mins',
        durationTe: '35 - 40 నిమిషాలు',
      },
      {
        dayNumber: 7,
        dayLabelKey: 'day7',
        workoutEn: 'Full Rest & Muscle Repair (Hydration, gentle yoga, sound sleep)',
        workoutTe: 'పూర్తి విశ్రాంతి మరియు కండరాల రికవరీ (మంచి నిద్ర, నీరు, విశ్రాంతి)',
        durationEn: 'Rest Day',
        durationTe: 'విశ్రాంతి దినం',
      },
    ];
  }

  // Weight loss, fitness, nutrition, maintain
  return [
    {
      dayNumber: 1,
      dayLabelKey: 'day1',
      workoutEn: 'Full Body Circuit & Brisk Walk (Bodyweight squats, jumping jacks, wall pushups)',
      workoutTe: 'మొత్తం శరీర వ్యాయామం & చురుకైన నడక (స్క్వాట్స్, జంపింగ్ జాక్స్, వాల్ పుషప్స్)',
      durationEn: '35 - 40 mins',
      durationTe: '35 - 40 నిమిషాలు',
    },
    {
      dayNumber: 2,
      dayLabelKey: 'day2',
      workoutEn: 'Aerobic Fat Burn (Continuous brisk outdoor walking or cycling at steady pace)',
      workoutTe: 'ఏరోబిక్ కొవ్వు కరిగించే నడక (నిరంతర చురుకైన నడక లేదా సైక్లింగ్)',
      durationEn: '40 mins',
      durationTe: '40 నిమిషాలు',
    },
    {
      dayNumber: 3,
      dayLabelKey: 'day3',
      workoutEn: 'Core & Lower Body Toning (Planks, bird-dogs, glute bridges, step-ups)',
      workoutTe: 'కోర్ & కాళ్ల వ్యాయామం (ప్లాంక్స్, గ్లూట్ బ్రిడ్జెస్, స్టెప్-అప్స్)',
      durationEn: '30 - 35 mins',
      durationTe: '30 - 35 నిమిషాలు',
    },
    {
      dayNumber: 4,
      dayLabelKey: 'day4',
      workoutEn: 'Active Recovery & Flexibility (Gentle morning walk, Surya Namaskar, full-body stretches)',
      workoutTe: 'యాక్టివ్ రికవరీ మరియు ఫ్లెక్సిబిలిటీ (సూర్య నమస్కారాలు, యోగా మరియు స్ట్రెచింగ్)',
      durationEn: '25 - 30 mins',
      durationTe: '25 - 30 నిమిషాలు',
    },
    {
      dayNumber: 5,
      dayLabelKey: 'day5',
      workoutEn: 'Upper Body & Posture Strengthening (Incline pushups, arm circles, back extensions)',
      workoutTe: 'పై శరీరం మరియు వీపు బలం (ఇన్‌క్లైన్ పుషప్స్, చేతుల వ్యాయామాలు, వీపు కండరాలు)',
      durationEn: '35 mins',
      durationTe: '35 నిమిషాలు',
    },
    {
      dayNumber: 6,
      dayLabelKey: 'day6',
      workoutEn: 'Cardio Interval Training (Brisk walk alternated with fast walking pace intervals)',
      workoutTe: 'కార్డియో విరామ నడక (సాధారణ మరియు వేగవంతమైన నడక విరామాలు)',
      durationEn: '40 - 45 mins',
      durationTe: '40 - 45 నిమిషాలు',
    },
    {
      dayNumber: 7,
      dayLabelKey: 'day7',
      workoutEn: 'Complete Rest & Rejuvenation (Recharge mental and physical energy)',
      workoutTe: 'పూర్తి విశ్రాంతి (శరీరానికి మరియు మనస్సుకు విశ్రాంతి)',
      durationEn: 'Rest Day',
      durationTe: 'విశ్రాంతి దినం',
    },
  ];
}
