/**
 * Predefined choice types for survey questions
 * These provide common, ready-to-use choice sets for various question types
 */

export interface SuggestedChoice {
  id: string;
  label: string;
  description: string;
  category: string;
  choices: Array<{
    value: string;
    label: string;
  }>;
}

export const SUGGESTED_CHOICES: SuggestedChoice[] = [
  // Agreement & Satisfaction
  {
    id: 'agreement_scale',
    label: 'Agreement Scale',
    description: 'Strongly Disagree to Strongly Agree',
    category: 'Rating',
    choices: [
      { value: 'strongly_disagree', label: 'Strongly Disagree' },
      { value: 'disagree', label: 'Disagree' },
      { value: 'neutral', label: 'Neutral' },
      { value: 'agree', label: 'Agree' },
      { value: 'strongly_agree', label: 'Strongly Agree' }
    ]
  },
  {
    id: 'satisfaction_scale',
    label: 'Satisfaction Scale',
    description: 'Very Dissatisfied to Very Satisfied',
    category: 'Rating',
    choices: [
      { value: 'very_dissatisfied', label: 'Very Dissatisfied' },
      { value: 'dissatisfied', label: 'Dissatisfied' },
      { value: 'neutral', label: 'Neutral' },
      { value: 'satisfied', label: 'Satisfied' },
      { value: 'very_satisfied', label: 'Very Satisfied' }
    ]
  },
  {
    id: 'likelihood_scale',
    label: 'Likelihood Scale',
    description: 'Very Unlikely to Very Likely',
    category: 'Rating',
    choices: [
      { value: 'very_unlikely', label: 'Very Unlikely' },
      { value: 'unlikely', label: 'Unlikely' },
      { value: 'neutral', label: 'Neutral' },
      { value: 'likely', label: 'Likely' },
      { value: 'very_likely', label: 'Very Likely' }
    ]
  },
  {
    id: 'frequency_scale',
    label: 'Frequency Scale',
    description: 'Never to Always',
    category: 'Rating',
    choices: [
      { value: 'never', label: 'Never' },
      { value: 'rarely', label: 'Rarely' },
      { value: 'sometimes', label: 'Sometimes' },
      { value: 'often', label: 'Often' },
      { value: 'always', label: 'Always' }
    ]
  },
  {
    id: 'quality_scale',
    label: 'Quality Scale',
    description: 'Poor to Excellent',
    category: 'Rating',
    choices: [
      { value: 'poor', label: 'Poor' },
      { value: 'fair', label: 'Fair' },
      { value: 'good', label: 'Good' },
      { value: 'very_good', label: 'Very Good' },
      { value: 'excellent', label: 'Excellent' }
    ]
  },

  // Demographics
  {
    id: 'age_groups',
    label: 'Age Groups',
    description: 'Common age ranges',
    category: 'Demographics',
    choices: [
      { value: '18_24', label: '18-24' },
      { value: '25_34', label: '25-34' },
      { value: '35_44', label: '35-44' },
      { value: '45_54', label: '45-54' },
      { value: '55_64', label: '55-64' },
      { value: '65_plus', label: '65+' }
    ]
  },
  {
    id: 'gender',
    label: 'Gender',
    description: 'Gender identity options',
    category: 'Demographics',
    choices: [
      { value: 'male', label: 'Male' },
      { value: 'female', label: 'Female' },
      { value: 'non_binary', label: 'Non-binary' },
      { value: 'prefer_not_to_say', label: 'Prefer not to say' }
    ]
  },
  {
    id: 'education_level',
    label: 'Education Level',
    description: 'Educational attainment',
    category: 'Demographics',
    choices: [
      { value: 'high_school', label: 'High School' },
      { value: 'some_college', label: 'Some College' },
      { value: 'associates', label: 'Associate Degree' },
      { value: 'bachelors', label: 'Bachelor\'s Degree' },
      { value: 'masters', label: 'Master\'s Degree' },
      { value: 'doctorate', label: 'Doctorate' }
    ]
  },
  {
    id: 'income_ranges',
    label: 'Income Ranges',
    description: 'Annual household income',
    category: 'Demographics',
    choices: [
      { value: 'under_25k', label: 'Under $25,000' },
      { value: '25k_50k', label: '$25,000 - $49,999' },
      { value: '50k_75k', label: '$50,000 - $74,999' },
      { value: '75k_100k', label: '$75,000 - $99,999' },
      { value: '100k_150k', label: '$100,000 - $149,999' },
      { value: '150k_plus', label: '$150,000+' }
    ]
  },
  {
    id: 'employment_status',
    label: 'Employment Status',
    description: 'Current employment situation',
    category: 'Demographics',
    choices: [
      { value: 'full_time', label: 'Full-time employed' },
      { value: 'part_time', label: 'Part-time employed' },
      { value: 'self_employed', label: 'Self-employed' },
      { value: 'unemployed', label: 'Unemployed' },
      { value: 'student', label: 'Student' },
      { value: 'retired', label: 'Retired' }
    ]
  },

  // Technology & Digital
  {
    id: 'device_usage',
    label: 'Primary Device',
    description: 'Most used device for internet',
    category: 'Technology',
    choices: [
      { value: 'smartphone', label: 'Smartphone' },
      { value: 'laptop', label: 'Laptop' },
      { value: 'desktop', label: 'Desktop Computer' },
      { value: 'tablet', label: 'Tablet' },
      { value: 'smart_tv', label: 'Smart TV' }
    ]
  },
  {
    id: 'social_media',
    label: 'Social Media Platforms',
    description: 'Most used social platforms',
    category: 'Technology',
    choices: [
      { value: 'facebook', label: 'Facebook' },
      { value: 'instagram', label: 'Instagram' },
      { value: 'twitter', label: 'Twitter/X' },
      { value: 'linkedin', label: 'LinkedIn' },
      { value: 'tiktok', label: 'TikTok' },
      { value: 'youtube', label: 'YouTube' },
      { value: 'snapchat', label: 'Snapchat' }
    ]
  },
  {
    id: 'internet_usage',
    label: 'Internet Usage',
    description: 'Daily internet usage time',
    category: 'Technology',
    choices: [
      { value: 'less_than_1_hour', label: 'Less than 1 hour' },
      { value: '1_3_hours', label: '1-3 hours' },
      { value: '3_5_hours', label: '3-5 hours' },
      { value: '5_8_hours', label: '5-8 hours' },
      { value: 'more_than_8_hours', label: 'More than 8 hours' }
    ]
  },

  // Shopping & Consumer
  {
    id: 'shopping_frequency',
    label: 'Shopping Frequency',
    description: 'How often do you shop online',
    category: 'Shopping',
    choices: [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'rarely', label: 'Rarely' },
      { value: 'never', label: 'Never' }
    ]
  },
  {
    id: 'purchase_influence',
    label: 'Purchase Influence',
    description: 'What influences your purchases',
    category: 'Shopping',
    choices: [
      { value: 'price', label: 'Price' },
      { value: 'quality', label: 'Quality' },
      { value: 'brand', label: 'Brand reputation' },
      { value: 'reviews', label: 'Customer reviews' },
      { value: 'recommendations', label: 'Friend/family recommendations' },
      { value: 'convenience', label: 'Convenience' }
    ]
  },
  {
    id: 'budget_ranges',
    label: 'Budget Ranges',
    description: 'Spending budget for specific category',
    category: 'Shopping',
    choices: [
      { value: 'under_50', label: 'Under $50' },
      { value: '50_100', label: '$50 - $100' },
      { value: '100_250', label: '$100 - $250' },
      { value: '250_500', label: '$250 - $500' },
      { value: '500_1000', label: '$500 - $1,000' },
      { value: 'over_1000', label: 'Over $1,000' }
    ]
  },

  // Health & Lifestyle
  {
    id: 'exercise_frequency',
    label: 'Exercise Frequency',
    description: 'How often do you exercise',
    category: 'Health',
    choices: [
      { value: 'daily', label: 'Daily' },
      { value: '3_4_times_week', label: '3-4 times per week' },
      { value: '1_2_times_week', label: '1-2 times per week' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'rarely', label: 'Rarely' },
      { value: 'never', label: 'Never' }
    ]
  },
  {
    id: 'diet_preferences',
    label: 'Diet Preferences',
    description: 'Dietary restrictions or preferences',
    category: 'Health',
    choices: [
      { value: 'no_restrictions', label: 'No restrictions' },
      { value: 'vegetarian', label: 'Vegetarian' },
      { value: 'vegan', label: 'Vegan' },
      { value: 'gluten_free', label: 'Gluten-free' },
      { value: 'keto', label: 'Keto' },
      { value: 'paleo', label: 'Paleo' },
      { value: 'other', label: 'Other' }
    ]
  },
  {
    id: 'sleep_duration',
    label: 'Sleep Duration',
    description: 'Average hours of sleep per night',
    category: 'Health',
    choices: [
      { value: 'less_than_5', label: 'Less than 5 hours' },
      { value: '5_6_hours', label: '5-6 hours' },
      { value: '6_7_hours', label: '6-7 hours' },
      { value: '7_8_hours', label: '7-8 hours' },
      { value: '8_9_hours', label: '8-9 hours' },
      { value: 'more_than_9', label: 'More than 9 hours' }
    ]
  },

  // Business & Work
  {
    id: 'company_size',
    label: 'Company Size',
    description: 'Number of employees',
    category: 'Business',
    choices: [
      { value: '1_10', label: '1-10 employees' },
      { value: '11_50', label: '11-50 employees' },
      { value: '51_200', label: '51-200 employees' },
      { value: '201_1000', label: '201-1,000 employees' },
      { value: '1000_plus', label: '1,000+ employees' }
    ]
  },
  {
    id: 'industry_sectors',
    label: 'Industry Sectors',
    description: 'Primary business industry',
    category: 'Business',
    choices: [
      { value: 'technology', label: 'Technology' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'finance', label: 'Finance' },
      { value: 'education', label: 'Education' },
      { value: 'retail', label: 'Retail' },
      { value: 'manufacturing', label: 'Manufacturing' },
      { value: 'consulting', label: 'Consulting' },
      { value: 'other', label: 'Other' }
    ]
  },
  {
    id: 'work_environment',
    label: 'Work Environment',
    description: 'Primary work location',
    category: 'Business',
    choices: [
      { value: 'office', label: 'Office' },
      { value: 'remote', label: 'Remote' },
      { value: 'hybrid', label: 'Hybrid' },
      { value: 'field', label: 'Field/On-site' },
      { value: 'other', label: 'Other' }
    ]
  },

  // Travel & Transportation
  {
    id: 'travel_frequency',
    label: 'Travel Frequency',
    description: 'How often do you travel',
    category: 'Travel',
    choices: [
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'annually', label: 'Annually' },
      { value: 'rarely', label: 'Rarely' },
      { value: 'never', label: 'Never' }
    ]
  },
  {
    id: 'transportation_methods',
    label: 'Transportation Methods',
    description: 'Primary transportation method',
    category: 'Travel',
    choices: [
      { value: 'car', label: 'Car' },
      { value: 'public_transport', label: 'Public Transportation' },
      { value: 'bicycle', label: 'Bicycle' },
      { value: 'walking', label: 'Walking' },
      { value: 'rideshare', label: 'Rideshare (Uber/Lyft)' },
      { value: 'motorcycle', label: 'Motorcycle' }
    ]
  },

  // Simple Yes/No variations
  {
    id: 'yes_no',
    label: 'Yes/No',
    description: 'Simple binary choice',
    category: 'Binary',
    choices: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' }
    ]
  },
  {
    id: 'true_false',
    label: 'True/False',
    description: 'True or false statement',
    category: 'Binary',
    choices: [
      { value: 'true', label: 'True' },
      { value: 'false', label: 'False' }
    ]
  },
  {
    id: 'agree_disagree',
    label: 'Agree/Disagree',
    description: 'Simple agreement choice',
    category: 'Binary',
    choices: [
      { value: 'agree', label: 'Agree' },
      { value: 'disagree', label: 'Disagree' }
    ]
  }
];

/**
 * Get suggested choices by category
 */
export function getSuggestedChoicesByCategory(category?: string): SuggestedChoice[] {
  if (!category) {
    return SUGGESTED_CHOICES;
  }
  return SUGGESTED_CHOICES.filter(choice => choice.category === category);
}

/**
 * Get all available categories
 */
export function getSuggestedChoiceCategories(): string[] {
  const categories = new Set(SUGGESTED_CHOICES.map(choice => choice.category));
  return Array.from(categories).sort();
}

/**
 * Find a suggested choice by ID
 */
export function getSuggestedChoiceById(id: string): SuggestedChoice | undefined {
  return SUGGESTED_CHOICES.find(choice => choice.id === id);
}
