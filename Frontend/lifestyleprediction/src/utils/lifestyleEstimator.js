/**
 * Centralized Lifestyle-Based Parameter Estimation Utility
 * 
 * Deterministically estimates numerical parameters (Daily Steps, Sleep Duration,
 * Daily Caloric Intake, and Hydration) from self-reported lifestyle characteristics.
 * Uses scientific Basal Metabolic Rate (BMR Mifflin-St Jeor) and TDEE physical activity multipliers.
 */

export const PROFESSIONS = [
  { id: 'Student', label: 'Student', desc: 'Studies, attending classes, sitting with periodic campus walking' },
  { id: 'Desk / IT Professional', label: 'Desk / IT Professional', desc: 'Desk-bound work, high screen time, mostly seated' },
  { id: 'Teacher / Academic', label: 'Teacher / Academic', desc: 'Classroom teaching, standing, moderate campus walking' },
  { id: 'Healthcare Worker', label: 'Healthcare Worker', desc: 'Hospital / clinic rounds, standing, frequent floor movement' },
  { id: 'Retail / Shop Worker', label: 'Retail / Shop Worker', desc: 'Store floor, customer service, on feet most of the shift' },
  { id: 'Driver', label: 'Driver', desc: 'Seated vehicular transit, limited daytime mobility' },
  { id: 'Homemaker', label: 'Homemaker', desc: 'Daily domestic chores, household management, variable movement' },
  { id: 'Construction / Manual Worker', label: 'Construction / Manual Worker', desc: 'Physically demanding labor, heavy lifting, constant activity' },
  { id: 'Outdoor / Field Worker', label: 'Outdoor / Field Worker', desc: 'Field inspections, agricultural or site duties, outdoor transit' },
  { id: 'Other', label: 'Other', desc: 'General professional routine' }
];

export const ACTIVITY_LEVELS = [
  {
    id: 'Mostly Sedentary',
    label: 'Mostly Sedentary',
    desc: 'Mostly sitting, studying, working, or using a computer.'
  },
  {
    id: 'Lightly Active',
    label: 'Lightly Active',
    desc: 'Some walking and occasional physical activity.'
  },
  {
    id: 'Moderately Active',
    label: 'Moderately Active',
    desc: 'Regular walking, exercise, or physically active routines.'
  },
  {
    id: 'Very Active',
    label: 'Very Active',
    desc: 'Frequent exercise or physically demanding daily activities.'
  }
];

export const DIET_PATTERNS = [
  { id: 'Mostly Home-Cooked & Balanced', label: 'Mostly Home-Cooked & Balanced', desc: 'Fresh home meals with vegetables, grains & protein' },
  { id: 'Home-Cooked but Often Oily/Fried', label: 'Home-Cooked but Often Oily/Fried', desc: 'Home meals with generous oil, ghee, or fried sides' },
  { id: 'Mixed Home-Cooked & Outside Food', label: 'Mixed Home-Cooked & Outside Food', desc: 'Regular rotation of cafeteria, takeout, or restaurant dining' },
  { id: 'Frequently Street/Fast Food', label: 'Frequently Street/Fast Food', desc: 'High frequency of burgers, pizza, street snacks, or takeout' },
  { id: 'Mostly High-Calorie / Processed Food', label: 'Mostly High-Calorie / Processed Food', desc: 'Convenience meals, packaged snacks, sugary beverages' },
  { id: 'Health-Conscious / Balanced Diet', label: 'Health-Conscious / Balanced Diet', desc: 'Portion controlled, nutrient-dense, minimal refined foods' }
];

export const OUTSIDE_FOOD_FREQ = [
  { id: 'Rarely', label: 'Rarely', desc: '< 1 time a week' },
  { id: '1–2 times/week', label: '1–2 times/week', desc: 'Occasional weekends' },
  { id: '3–4 times/week', label: '3–4 times/week', desc: 'Alternate days' },
  { id: '5+ times/week', label: '5+ times/week', desc: 'Most days or daily' }
];

export const FRIED_FOOD_FREQ = [
  { id: 'Rarely', label: 'Rarely', desc: 'Special occasions' },
  { id: '1–2 times/week', label: '1–2 times/week', desc: 'Weekly treat' },
  { id: '3–4 times/week', label: '3–4 times/week', desc: 'Frequent snacks' },
  { id: 'Almost Daily', label: 'Almost Daily', desc: 'Daily deep-fried foods' }
];

export const SLEEP_PATTERNS = [
  { id: 'Less than 5 hours', label: 'Less than 5 hours', hours: 4.5, desc: 'Severe sleep debt' },
  { id: '5–6 hours', label: '5–6 hours', hours: 5.5, desc: 'Restricted circadian rest' },
  { id: '6–7 hours', label: '6–7 hours', hours: 6.5, desc: 'Moderate rest' },
  { id: '7–8 hours', label: '7–8 hours', hours: 7.5, desc: 'Optimal restorative sleep' },
  { id: 'More than 8 hours', label: 'More than 8 hours', hours: 8.5, desc: 'Extended rest' }
];

/**
 * Calculates deterministic lifestyle parameter estimates
 * 
 * @param {Object} profile - Lifestyle profile selections
 * @param {Object} demographics - Age, Gender, Height, Weight
 * @returns {Object} Estimated parameters + human-readable provenance strings
 */
export function estimateLifestyleParameters(profile = {}, demographics = {}) {
  // ── 1. Daily Steps ──────────────────────────────────────────────────────────
  // Base step count by activity intensity
  const activityBaseSteps = {
    'Mostly Sedentary': 3200,
    'Lightly Active': 5200,
    'Moderately Active': 7800,
    'Very Active': 11500
  }[profile.activityIntensity || 'Mostly Sedentary'] || 4500;

  // Modest baseline adjustment by profession
  const professionStepDelta = {
    'Desk / IT Professional': -600,
    'Driver': -800,
    'Student': -300,
    'Teacher / Academic': +400,
    'Homemaker': +600,
    'Healthcare Worker': +1200,
    'Retail / Shop Worker': +1400,
    'Outdoor / Field Worker': +2000,
    'Construction / Manual Worker': +2500,
    'Other': 0
  }[profile.profession || 'Desk / IT Professional'] || 0;

  const rawSteps = activityBaseSteps + professionStepDelta;
  const estimatedSteps = Math.max(1500, Math.min(22000, Math.round(rawSteps / 50) * 50));

  // ── 2. Sleep Duration ───────────────────────────────────────────────────────
  const sleepObj = SLEEP_PATTERNS.find(s => s.id === profile.sleepPattern);
  const estimatedSleep = sleepObj ? sleepObj.hours : 6.5;

  // ── 3. Daily Calorie Intake ─────────────────────────────────────────────────
  // Scientific Mifflin-St Jeor formula for Basal Metabolic Rate (BMR)
  const age = parseFloat(demographics.age) || 38;
  const isMale = (demographics.gender || 'Male').toLowerCase() === 'male';
  const height = parseFloat(demographics.height) || 175;
  const weight = parseFloat(demographics.weight) || 77.8;

  const bmr = isMale
    ? (10 * weight) + (6.25 * height) - (5 * age) + 5
    : (10 * weight) + (6.25 * height) - (5 * age) - 161;

  // Total Daily Energy Expenditure (TDEE) multiplier from physical activity
  const tdeeMultiplier = {
    'Mostly Sedentary': 1.2,
    'Lightly Active': 1.375,
    'Moderately Active': 1.55,
    'Very Active': 1.725
  }[profile.activityIntensity || 'Mostly Sedentary'] || 1.3;

  const baselineCalories = bmr * tdeeMultiplier;

  // Dietary pattern adjustment
  const dietDelta = {
    'Health-Conscious / Balanced Diet': -150,
    'Mostly Home-Cooked & Balanced': 0,
    'Home-Cooked but Often Oily/Fried': +150,
    'Mixed Home-Cooked & Outside Food': +200,
    'Frequently Street/Fast Food': +350,
    'Mostly High-Calorie / Processed Food': +450
  }[profile.dietaryPattern || 'Mostly Home-Cooked & Balanced'] || 0;

  // Outside food frequency adjustment
  const outsideDelta = {
    'Rarely': 0,
    '1–2 times/week': +75,
    '3–4 times/week': +180,
    '5+ times/week': +300
  }[profile.outsideFoodFrequency || 'Rarely'] || 0;

  // Fried food frequency adjustment
  const friedDelta = {
    'Rarely': 0,
    '1–2 times/week': +80,
    '3–4 times/week': +180,
    'Almost Daily': +300
  }[profile.friedFoodFrequency || 'Rarely'] || 0;

  // Profession energy adjustment
  const professionCalDelta = {
    'Construction / Manual Worker': +250,
    'Outdoor / Field Worker': +150,
    'Healthcare Worker': +75,
    'Desk / IT Professional': -50,
    'Driver': -50
  }[profile.profession] || 0;

  const rawCalories = baselineCalories + dietDelta + outsideDelta + friedDelta + professionCalDelta;
  const estimatedCalories = Math.max(1400, Math.min(4500, Math.round(rawCalories / 50) * 50));

  // ── 4. Hydration (Water Intake L) ───────────────────────────────────────────
  const baseWater = {
    'Mostly Sedentary': 2.0,
    'Lightly Active': 2.4,
    'Moderately Active': 2.8,
    'Very Active': 3.5
  }[profile.activityIntensity || 'Mostly Sedentary'] || 2.2;
  const outdoorWaterBonus = ['Construction / Manual Worker', 'Outdoor / Field Worker'].includes(profile.profession) ? 0.4 : 0;
  const estimatedWater = parseFloat((baseWater + outdoorWaterBonus).toFixed(1));

  return {
    daily_steps: estimatedSteps,
    sleep_hours: estimatedSleep,
    calories_consumed: estimatedCalories,
    water_intake_l: estimatedWater,
    sources: {
      daily_steps: `Estimated from ${profile.profession || 'profession'} & ${profile.activityIntensity || 'activity level'}`,
      sleep_hours: `Estimated from selected sleep pattern (${profile.sleepPattern || '6–7 hours'})`,
      calories_consumed: `Estimated from BMR, ${profile.activityIntensity || 'activity level'}, and dietary habits`,
      water_intake_l: `Estimated from ${profile.activityIntensity || 'activity intensity'} and daily routine`
    }
  };
}

export const DEFAULT_LIFESTYLE_PROFILE = {
  profession: 'Desk / IT Professional',
  activityIntensity: 'Mostly Sedentary',
  dietaryPattern: 'Mixed Home-Cooked & Outside Food',
  outsideFoodFrequency: '1–2 times/week',
  friedFoodFrequency: '1–2 times/week',
  sleepPattern: '6–7 hours'
};
