import type { MealDay } from '@/services/cloud';

/** Starter meal plans trainers can copy and edit. Values are approximate. */
export const MEAL_TEMPLATES: { id: string; name: string; description: string; targetCalories: number; days: MealDay[] }[] = [
  {
    id: 'balanced-veg-1800',
    name: 'Balanced Vegetarian (1800 kcal)',
    description: 'Simple home-cooked vegetarian meals with enough protein for weight loss.',
    targetCalories: 1800,
    days: [
      {
        title: 'Daily plan',
        meals: [
          { name: 'Breakfast', time: '08:00', items: 'Vegetable oats upma (1 bowl), 1 glass milk', calories: 420, protein: 18, carbs: 60, fat: 11 },
          { name: 'Mid-morning', time: '11:00', items: '1 apple, 10 almonds', calories: 170, protein: 4, carbs: 25, fat: 7 },
          { name: 'Lunch', time: '13:30', items: '2 rotis, dal (1 bowl), mixed veg sabzi, salad, curd', calories: 560, protein: 24, carbs: 78, fat: 15 },
          { name: 'Evening snack', time: '17:00', items: 'Roasted chana (40 g), green tea', calories: 160, protein: 9, carbs: 24, fat: 3 },
          { name: 'Dinner', time: '20:00', items: 'Paneer bhurji (100 g paneer), 1 roti, sautéed veggies', calories: 490, protein: 28, carbs: 30, fat: 27 },
        ],
      },
    ],
  },
  {
    id: 'high-protein-2200',
    name: 'High Protein Muscle Gain (2200 kcal)',
    description: 'Higher protein for building muscle. Includes eggs and chicken; swap for paneer/tofu if vegetarian.',
    targetCalories: 2200,
    days: [
      {
        title: 'Training day',
        meals: [
          { name: 'Breakfast', time: '07:30', items: '3 whole eggs omelette, 2 slices whole-wheat bread, 1 banana', calories: 520, protein: 26, carbs: 55, fat: 20 },
          { name: 'Pre-workout', time: '11:00', items: 'Greek yogurt (200 g) with honey and oats', calories: 300, protein: 20, carbs: 42, fat: 5 },
          { name: 'Lunch', time: '14:00', items: 'Chicken breast (150 g), rice (1 cup cooked), dal, salad', calories: 650, protein: 52, carbs: 70, fat: 14 },
          { name: 'Snack', time: '17:30', items: 'Peanut butter toast, 1 glass milk', calories: 330, protein: 15, carbs: 30, fat: 16 },
          { name: 'Dinner', time: '20:30', items: 'Fish or paneer curry, 2 rotis, vegetables', calories: 450, protein: 35, carbs: 38, fat: 16 },
        ],
      },
      {
        title: 'Rest day',
        meals: [
          { name: 'Breakfast', time: '08:00', items: 'Moong dal chilla (2) with mint chutney, 1 glass milk', calories: 420, protein: 24, carbs: 48, fat: 12 },
          { name: 'Lunch', time: '13:30', items: 'Rajma (1 bowl), rice (1 cup), salad, curd', calories: 600, protein: 24, carbs: 92, fat: 12 },
          { name: 'Snack', time: '17:00', items: 'Sprouts chaat (1 bowl)', calories: 200, protein: 12, carbs: 30, fat: 3 },
          { name: 'Dinner', time: '20:00', items: 'Grilled chicken or tofu (150 g), quinoa, vegetables', calories: 520, protein: 42, carbs: 40, fat: 18 },
        ],
      },
    ],
  },
];
