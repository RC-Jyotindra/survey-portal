export interface ChoiceTemplate {
  id: string;
  name: string;
  description: string;
  choices: Array<{
    value: string;
    label: string;
  }>;
  category: string;
  applicableTypes: string[];
}

export const CHOICE_TEMPLATES: ChoiceTemplate[] = [
  // Yes/No Templates
  {
    id: 'yes-no',
    name: 'Yes - No',
    description: 'Simple binary choice',
    choices: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' }
    ],
    category: 'Binary',
    applicableTypes: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN']
  },
  {
    id: 'true-false',
    name: 'True - False',
    description: 'Boolean choice',
    choices: [
      { value: 'true', label: 'True' },
      { value: 'false', label: 'False' }
    ],
    category: 'Binary',
    applicableTypes: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN']
  },

  // Satisfaction Templates
  {
    id: 'dissatisfied-satisfied',
    name: 'Dissatisfied - Satisfied',
    description: 'Satisfaction scale',
    choices: [
      { value: 'very_dissatisfied', label: 'Very Dissatisfied' },
      { value: 'dissatisfied', label: 'Dissatisfied' },
      { value: 'neutral', label: 'Neutral' },
      { value: 'satisfied', label: 'Satisfied' },
      { value: 'very_satisfied', label: 'Very Satisfied' }
    ],
    category: 'Satisfaction',
    applicableTypes: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN']
  },
  {
    id: 'inappropriate-appropriate',
    name: 'Inappropriate - Appropriate',
    description: 'Appropriateness scale',
    choices: [
      { value: 'very_inappropriate', label: 'Very Inappropriate' },
      { value: 'inappropriate', label: 'Inappropriate' },
      { value: 'neutral', label: 'Neutral' },
      { value: 'appropriate', label: 'Appropriate' },
      { value: 'very_appropriate', label: 'Very Appropriate' }
    ],
    category: 'Satisfaction',
    applicableTypes: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN']
  },

  // Demographic Templates
  {
    id: 'gender-binary',
    name: 'Male - Female - Non-binary',
    description: 'Gender identity options',
    choices: [
      { value: 'male', label: 'Male' },
      { value: 'female', label: 'Female' },
      { value: 'non_binary', label: 'Non-binary' }
    ],
    category: 'Demographics',
    applicableTypes: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN']
  },
  {
    id: 'age-groups',
    name: 'Age Groups',
    description: 'Common age ranges',
    choices: [
      { value: '18-24', label: '18-24' },
      { value: '25-34', label: '25-34' },
      { value: '35-44', label: '35-44' },
      { value: '45-54', label: '45-54' },
      { value: '55-64', label: '55-64' },
      { value: '65+', label: '65+' }
    ],
    category: 'Demographics',
    applicableTypes: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN']
  },
  {
    id: 'education-levels',
    name: 'Education Levels',
    description: 'Educational attainment',
    choices: [
      { value: 'high_school', label: 'High School' },
      { value: 'some_college', label: 'Some College' },
      { value: 'associates', label: 'Associate Degree' },
      { value: 'bachelors', label: 'Bachelor\'s Degree' },
      { value: 'masters', label: 'Master\'s Degree' },
      { value: 'doctorate', label: 'Doctorate' }
    ],
    category: 'Demographics',
    applicableTypes: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN']
  },

  // Frequency Templates
  {
    id: 'frequency-daily',
    name: 'Daily Frequency',
    description: 'How often do you...',
    choices: [
      { value: 'never', label: 'Never' },
      { value: 'rarely', label: 'Rarely' },
      { value: 'sometimes', label: 'Sometimes' },
      { value: 'often', label: 'Often' },
      { value: 'always', label: 'Always' }
    ],
    category: 'Frequency',
    applicableTypes: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN']
  },
  {
    id: 'frequency-weekly',
    name: 'Weekly Frequency',
    description: 'How many times per week...',
    choices: [
      { value: '0', label: '0 times' },
      { value: '1-2', label: '1-2 times' },
      { value: '3-4', label: '3-4 times' },
      { value: '5-6', label: '5-6 times' },
      { value: '7+', label: '7+ times' }
    ],
    category: 'Frequency',
    applicableTypes: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN']
  },

  // Agreement Templates
  {
    id: 'strongly-disagree-agree',
    name: 'Strongly Disagree - Strongly Agree',
    description: 'Likert scale agreement',
    choices: [
      { value: 'strongly_disagree', label: 'Strongly Disagree' },
      { value: 'disagree', label: 'Disagree' },
      { value: 'neutral', label: 'Neutral' },
      { value: 'agree', label: 'Agree' },
      { value: 'strongly_agree', label: 'Strongly Agree' }
    ],
    category: 'Agreement',
    applicableTypes: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN']
  },
  {
    id: 'not-at-all-extremely',
    name: 'Not at all - Extremely',
    description: 'Intensity scale',
    choices: [
      { value: 'not_at_all', label: 'Not at all' },
      { value: 'slightly', label: 'Slightly' },
      { value: 'moderately', label: 'Moderately' },
      { value: 'very', label: 'Very' },
      { value: 'extremely', label: 'Extremely' }
    ],
    category: 'Agreement',
    applicableTypes: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN']
  },

  // Quality Templates
  {
    id: 'poor-excellent',
    name: 'Poor - Excellent',
    description: 'Quality rating scale',
    choices: [
      { value: 'poor', label: 'Poor' },
      { value: 'fair', label: 'Fair' },
      { value: 'good', label: 'Good' },
      { value: 'very_good', label: 'Very Good' },
      { value: 'excellent', label: 'Excellent' }
    ],
    category: 'Quality',
    applicableTypes: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN']
  },
  {
    id: 'unlikely-likely',
    name: 'Unlikely - Likely',
    description: 'Likelihood scale',
    choices: [
      { value: 'very_unlikely', label: 'Very Unlikely' },
      { value: 'unlikely', label: 'Unlikely' },
      { value: 'neutral', label: 'Neutral' },
      { value: 'likely', label: 'Likely' },
      { value: 'very_likely', label: 'Very Likely' }
    ],
    category: 'Quality',
    applicableTypes: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN']
  },

  // Time Templates
  {
    id: 'time-periods',
    name: 'Time Periods',
    description: 'Common time ranges',
    choices: [
      { value: 'less_than_1_hour', label: 'Less than 1 hour' },
      { value: '1-2_hours', label: '1-2 hours' },
      { value: '3-5_hours', label: '3-5 hours' },
      { value: '6-10_hours', label: '6-10 hours' },
      { value: 'more_than_10_hours', label: 'More than 10 hours' }
    ],
    category: 'Time',
    applicableTypes: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN']
  },
  {
    id: 'time-of-day',
    name: 'Time of Day',
    description: 'Daily time periods',
    choices: [
      { value: 'early_morning', label: 'Early Morning (5-8 AM)' },
      { value: 'morning', label: 'Morning (8-12 PM)' },
      { value: 'afternoon', label: 'Afternoon (12-5 PM)' },
      { value: 'evening', label: 'Evening (5-8 PM)' },
      { value: 'night', label: 'Night (8 PM-5 AM)' }
    ],
    category: 'Time',
    applicableTypes: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN']
  },

  // Priority Templates
  {
    id: 'priority-levels',
    name: 'Priority Levels',
    description: 'Task or item priority',
    choices: [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'critical', label: 'Critical' }
    ],
    category: 'Priority',
    applicableTypes: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN']
  },

  // Custom Templates
  {
    id: 'custom-list',
    name: 'List',
    description: 'Create your own custom list',
    choices: [],
    category: 'Custom',
    applicableTypes: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN']
  }
];

export const getTemplatesByCategory = (): Record<string, ChoiceTemplate[]> => {
  return CHOICE_TEMPLATES.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category]!.push(template);
    return acc;
  }, {} as Record<string, ChoiceTemplate[]>);
};

export const getTemplatesForQuestionType = (questionType: string): ChoiceTemplate[] => {
  return CHOICE_TEMPLATES.filter(template => 
    template.applicableTypes.includes(questionType)
  );
};

export const getTemplateById = (id: string): ChoiceTemplate | undefined => {
  return CHOICE_TEMPLATES.find(template => template.id === id);
};
