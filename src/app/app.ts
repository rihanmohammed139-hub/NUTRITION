import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { calculateWellnessProfile } from './calculator';
import { translations } from './translations';
import {
  ActivityLevel,
  CalculationResults,
  FoodPreference,
  Gender,
  HeightUnit,
  Language,
  MealCount,
  ProfileInput,
  WeightUnit,
  WellnessPriority,
} from './types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  // Current active language (saved in JS signal, does not use localStorage)
  readonly currentLang = signal<Language>('en');

  // Print in both languages checkbox
  readonly printBothLanguages = signal<boolean>(false);

  // Today's date formatted
  readonly todayDate = signal<string>(new Date().toISOString().split('T')[0]);

  // Advisor info signals (editable on screen, reflected on print)
  readonly advisorName = signal<string>('Wellness Advisor');
  readonly advisorContact = signal<string>('+91 98765 43210');

  // Units state
  readonly heightUnit = signal<HeightUnit>('ft_in');
  readonly weightUnit = signal<WeightUnit>('kg');

  // Selected ranked priorities (up to 4)
  readonly selectedPriorities = signal<WellnessPriority[]>([
    'lose_weight',
    'improve_fitness',
  ]);

  // Results state
  readonly results = signal<CalculationResults | null>(null);

  // Validation error flags
  readonly showValidationErrors = signal<boolean>(false);

  // Form Group
  readonly form = new FormGroup({
    name: new FormControl<string>(''),
    age: new FormControl<number | null>(32, [
      Validators.required,
      Validators.min(10),
      Validators.max(120),
    ]),
    gender: new FormControl<Gender>('male', [Validators.required]),
    heightCm: new FormControl<number | null>(172),
    heightFt: new FormControl<number | null>(5),
    heightIn: new FormControl<number | null>(8),
    currentWeight: new FormControl<number | null>(78, [
      Validators.required,
      Validators.min(20),
      Validators.max(300),
    ]),
    targetWeight: new FormControl<number | null>(70, [
      Validators.required,
      Validators.min(20),
      Validators.max(300),
    ]),
    mealsPerDay: new FormControl<MealCount>(4, [Validators.required]),
    waterGlasses: new FormControl<number>(8, [
      Validators.required,
      Validators.min(1),
    ]),
    activityLevel: new FormControl<ActivityLevel>('moderately_active', [
      Validators.required,
    ]),
    foodPreference: new FormControl<FoodPreference>('vegetarian', [
      Validators.required,
    ]),
  });

  // Translation lookup helper
  readonly t = computed(() => translations[this.currentLang()]);
  readonly tEn = translations.en;
  readonly tTe = translations.te;

  // Water glasses options (4 to 16)
  readonly waterOptions = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

  // Meal count options
  readonly mealCountOptions: MealCount[] = [2, 3, 4, 5];

  // Priority definitions
  readonly allPriorities: { id: WellnessPriority; key: string }[] = [
    { id: 'lose_weight', key: 'lose_weight' },
    { id: 'gain_weight', key: 'gain_weight' },
    { id: 'build_muscle', key: 'build_muscle' },
    { id: 'improve_fitness', key: 'improve_fitness' },
    { id: 'improve_nutrition', key: 'improve_nutrition' },
    { id: 'maintain_weight', key: 'maintain_weight' },
  ];

  constructor() {
    // Initial computation with default values so advisor sees immediate ready state
    this.calculateResults();
  }

  // Switch language instantly
  setLanguage(lang: Language): void {
    this.currentLang.set(lang);
    // If results are already shown, re-render them instantly
    if (this.results()) {
      this.calculateResults();
    }
  }

  // Unit toggling with smooth conversion
  toggleHeightUnit(unit: HeightUnit): void {
    if (unit === this.heightUnit()) return;
    this.heightUnit.set(unit);

    if (unit === 'cm') {
      const ft = this.form.controls.heightFt.value || 5;
      const inch = this.form.controls.heightIn.value || 0;
      const totalInches = ft * 12 + inch;
      const cmVal = Math.round(totalInches * 2.54);
      this.form.controls.heightCm.setValue(cmVal);
    } else {
      const cmVal = this.form.controls.heightCm.value || 170;
      const totalInches = cmVal / 2.54;
      const ft = Math.floor(totalInches / 12);
      const inch = Math.round(totalInches % 12);
      this.form.controls.heightFt.setValue(ft);
      this.form.controls.heightIn.setValue(inch);
    }

    if (this.results()) {
      this.calculateResults();
    }
  }

  toggleWeightUnit(unit: WeightUnit): void {
    if (unit === this.weightUnit()) return;
    this.weightUnit.set(unit);

    const curr = this.form.controls.currentWeight.value;
    const tgt = this.form.controls.targetWeight.value;

    if (unit === 'lbs') {
      if (curr) {
        this.form.controls.currentWeight.setValue(Math.round(curr * 2.20462 * 10) / 10);
      }
      if (tgt) {
        this.form.controls.targetWeight.setValue(Math.round(tgt * 2.20462 * 10) / 10);
      }
    } else {
      if (curr) {
        this.form.controls.currentWeight.setValue(Math.round((curr / 2.20462) * 10) / 10);
      }
      if (tgt) {
        this.form.controls.targetWeight.setValue(Math.round((tgt / 2.20462) * 10) / 10);
      }
    }

    if (this.results()) {
      this.calculateResults();
    }
  }

  // Toggle priority selection and maintain ranking up to 4
  togglePriority(priority: WellnessPriority): void {
    const list = [...this.selectedPriorities()];
    const index = list.indexOf(priority);

    if (index >= 0) {
      // Remove it
      list.splice(index, 1);
    } else {
      // Add if fewer than 4
      if (list.length < 4) {
        list.push(priority);
      }
    }
    this.selectedPriorities.set(list);

    if (this.results()) {
      this.calculateResults();
    }
  }

  getPriorityRank(priority: WellnessPriority): number | null {
    const idx = this.selectedPriorities().indexOf(priority);
    return idx >= 0 ? idx + 1 : null;
  }

  // Validate and calculate
  onSubmit(): void {
    this.showValidationErrors.set(true);

    if (this.form.invalid || this.selectedPriorities().length === 0) {
      // Scroll to top of form or first error
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    this.calculateResults();

    // Scroll cleanly down to results
    setTimeout(() => {
      const resultsEl = document.getElementById('results-section');
      if (resultsEl) {
        resultsEl.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }

  calculateResults(): void {
    const val = this.form.getRawValue();

    const input: ProfileInput = {
      name: val.name?.trim() || '',
      age: val.age,
      gender: val.gender || 'male',
      heightUnit: this.heightUnit(),
      heightCm: val.heightCm,
      heightFt: val.heightFt,
      heightIn: val.heightIn,
      weightUnit: this.weightUnit(),
      currentWeight: val.currentWeight,
      targetWeight: val.targetWeight,
      mealsPerDay: val.mealsPerDay || 3,
      waterGlasses: Number(val.waterGlasses) || 8,
      activityLevel: val.activityLevel || 'sedentary',
      priorities: this.selectedPriorities(),
      foodPreference: val.foodPreference || 'vegetarian',
      advisorName: this.advisorName(),
      advisorContact: this.advisorContact(),
    };

    const res = calculateWellnessProfile(input);
    this.results.set(res);
  }

  onReset(): void {
    this.form.reset({
      name: '',
      age: null,
      gender: 'male',
      heightCm: null,
      heightFt: null,
      heightIn: null,
      currentWeight: null,
      targetWeight: null,
      mealsPerDay: 3,
      waterGlasses: 8,
      activityLevel: 'sedentary',
      foodPreference: 'vegetarian',
    });
    this.selectedPriorities.set(['maintain_weight']);
    this.showValidationErrors.set(false);
    this.results.set(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  loadSampleData(): void {
    this.heightUnit.set('ft_in');
    this.weightUnit.set('kg');
    this.form.setValue({
      name: 'Ramesh Varma',
      age: 34,
      gender: 'male',
      heightCm: 173,
      heightFt: 5,
      heightIn: 8,
      currentWeight: 82,
      targetWeight: 72,
      mealsPerDay: 4,
      waterGlasses: 6,
      activityLevel: 'lightly_active',
      foodPreference: 'vegetarian',
    });
    this.selectedPriorities.set(['lose_weight', 'improve_fitness', 'build_muscle']);
    this.showValidationErrors.set(false);
    this.calculateResults();
  }

  printReport(): void {
    window.print();
  }

  downloadStandaloneHtml(): void {
    fetch('/wellness-profile.html')
      .then((res) => res.text())
      .then((html) => {
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'wellness-profile.html';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      })
      .catch((err) => {
        console.error('Download error:', err);
        // Fallback direct link
        window.open('/wellness-profile.html', '_blank');
      });
  }

  updateAdvisorName(name: string): void {
    this.advisorName.set(name);
  }

  updateAdvisorContact(contact: string): void {
    this.advisorContact.set(contact);
  }

  updateDate(date: string): void {
    this.todayDate.set(date);
  }

  togglePrintBothLanguages(checked: boolean): void {
    this.printBothLanguages.set(checked);
  }

  // Translation key helper for priority label
  getPriorityLabel(id: WellnessPriority, lang: Language = this.currentLang()): string {
    const dict = translations[lang];
    switch (id) {
      case 'lose_weight':
        return dict.lose_weight;
      case 'gain_weight':
        return dict.gain_weight;
      case 'build_muscle':
        return dict.build_muscle;
      case 'improve_fitness':
        return dict.improve_fitness;
      case 'improve_nutrition':
        return dict.improve_nutrition;
      case 'maintain_weight':
        return dict.maintain_weight;
    }
  }

  getActivityLabel(level: ActivityLevel, lang: Language = this.currentLang()): string {
    const dict = translations[lang];
    switch (level) {
      case 'sedentary':
        return dict.sedentary;
      case 'lightly_active':
        return dict.lightlyActive;
      case 'moderately_active':
        return dict.moderatelyActive;
      case 'very_active':
        return dict.veryActive;
    }
  }

  getFoodPrefLabel(pref: FoodPreference, lang: Language = this.currentLang()): string {
    const dict = translations[lang];
    switch (pref) {
      case 'vegetarian':
        return dict.vegetarian;
      case 'eggetarian':
        return dict.eggetarian;
      case 'non_vegetarian':
        return dict.nonVegetarian;
    }
  }

  getBmiCategoryLabel(catKey: 'underweight' | 'normal' | 'overweight' | 'obese', lang: Language = this.currentLang()): string {
    const dict = translations[lang];
    switch (catKey) {
      case 'underweight':
        return dict.bmiUnderweight;
      case 'normal':
        return dict.bmiNormal;
      case 'overweight':
        return dict.bmiOverweight;
      case 'obese':
        return dict.bmiObese;
    }
  }

  getMealName(mealKey: string, lang: Language = this.currentLang()): string {
    const dict = translations[lang];
    switch (mealKey) {
      case 'breakfast':
        return dict.breakfast;
      case 'midMorningSnack':
        return dict.midMorningSnack;
      case 'lunch':
        return dict.lunch;
      case 'eveningSnack':
        return dict.eveningSnack;
      case 'dinner':
        return dict.dinner;
      default:
        return mealKey;
    }
  }
}
