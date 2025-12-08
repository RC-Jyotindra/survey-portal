"use client";

import { useState } from 'react';
import SurveyPreview from '@/components/survey-builder/survey-preview';
import Header from '@/components/navigation/header';

// Demo data with logic features
const demoSurvey = {
  id: 'demo-logic-survey',
  title: 'Logic Features Demo Survey',
  description: 'This survey demonstrates all the logic features working in preview mode.',
  status: 'PUBLISHED' as const,
  version: 1,
  settings: { theme: 'default' },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  _count: { pages: 3, questions: 8, sessions: 0 }
};

const demoPages = [
  {
    id: 'page-1',
    tenantId: 'demo',
    surveyId: 'demo-logic-survey',
    index: 1,
    titleTemplate: 'Welcome & Basic Info',
    descriptionTemplate: 'Let\'s start with some basic questions. Watch how your answers affect what questions appear next!',
    questionOrderMode: 'SEQUENTIAL' as const,
    groupOrderMode: 'SEQUENTIAL' as const,
    visibleIfExpressionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { questions: 3 }
  },
  {
    id: 'page-2',
    tenantId: 'demo',
    surveyId: 'demo-logic-survey',
    index: 2,
    titleTemplate: 'Conditional Questions',
    descriptionTemplate: 'These questions appear based on your previous answers (conditional logic).',
    questionOrderMode: 'RANDOM' as const,
    groupOrderMode: 'SEQUENTIAL' as const,
    visibleIfExpressionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { questions: 3 }
  },
  {
    id: 'page-3',
    tenantId: 'demo',
    surveyId: 'demo-logic-survey',
    index: 3,
    titleTemplate: 'Advanced Features',
    descriptionTemplate: 'Carry forward, randomization, and other advanced logic features.',
    questionOrderMode: 'SEQUENTIAL' as const,
    groupOrderMode: 'SEQUENTIAL' as const,
    visibleIfExpressionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { questions: 2 }
  }
];

const demoQuestions = [
  // Page 1 Questions
  {
    id: 'q1',
    tenantId: 'demo',
    surveyId: 'demo-logic-survey',
    pageId: 'page-1',
    index: 1,
    type: 'SINGLE_CHOICE' as const,
    variableName: 'Q1',
    titleTemplate: 'Are you interested in purchasing a new car?',
    helpTextTemplate: 'This answer will affect which questions you see next.',
    required: true,
    validation: null,
    optionOrderMode: 'SEQUENTIAL' as const,
    optionsSource: 'STATIC' as const,
    carryForwardQuestionId: null,
    carryForwardFilterExprId: null,
    visibleIfExpressionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    page: { id: 'page-1', index: 1, titleTemplate: 'Welcome & Basic Info' },
    options: [
      {
        id: 'q1-opt1',
        tenantId: 'demo',
        surveyId: 'demo-logic-survey',
        questionId: 'q1',
        index: 1,
        value: 'Yes',
        labelTemplate: 'Yes, I am interested',
        exclusive: false,
        groupKey: null,
        weight: null,
        visibleIfExpressionId: null
      },
      {
        id: 'q1-opt2',
        tenantId: 'demo',
        surveyId: 'demo-logic-survey',
        questionId: 'q1',
        index: 2,
        value: 'No',
        labelTemplate: 'No, not interested',
        exclusive: false,
        groupKey: null,
        weight: null,
        visibleIfExpressionId: null
      },
      {
        id: 'q1-opt3',
        tenantId: 'demo',
        surveyId: 'demo-logic-survey',
        questionId: 'q1',
        index: 3,
        value: 'Maybe',
        labelTemplate: 'Maybe in the future',
        exclusive: false,
        groupKey: null,
        weight: null,
        visibleIfExpressionId: null
      }
    ],
    items: [],
    scales: [],
    fromJumps: [
      {
        id: 'jump-1',
        fromQuestionId: 'q1',
        toQuestionId: null,
        toPageId: 'page-3',
        conditionExpressionId: 'jump-condition-1',
        priority: 1,
        condition: {
          id: 'jump-condition-1',
          dsl: "equals(answer('Q1'), 'No')",
          description: 'Jump to page 3 if not interested in cars'
        },
        toPage: {
          id: 'page-3',
          titleTemplate: 'Advanced Features',
          index: 3
        }
      }
    ]
  },
  {
    id: 'q2',
    tenantId: 'demo',
    surveyId: 'demo-logic-survey',
    pageId: 'page-1',
    index: 2,
    type: 'NUMBER' as const,
    variableName: 'Q2',
    titleTemplate: 'What is your age?',
    helpTextTemplate: 'We use this to tailor our recommendations.',
    required: true,
    validation: { min: 16, max: 100 },
    optionOrderMode: 'SEQUENTIAL' as const,
    optionsSource: 'STATIC' as const,
    carryForwardQuestionId: null,
    carryForwardFilterExprId: null,
    visibleIfExpressionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    page: { id: 'page-1', index: 1, titleTemplate: 'Welcome & Basic Info' },
    options: [],
    items: [],
    scales: [],
    fromJumps: []
  },
  {
    id: 'q3',
    tenantId: 'demo',
    surveyId: 'demo-logic-survey',
    pageId: 'page-1',
    index: 3,
    type: 'MULTIPLE_CHOICE' as const,
    variableName: 'Q3',
    titleTemplate: 'Which car brands do you prefer? (Select all that apply)',
    helpTextTemplate: 'Your selections will be carried forward to later questions.',
    required: false,
    validation: null,
    optionOrderMode: 'RANDOM' as const,
    optionsSource: 'STATIC' as const,
    carryForwardQuestionId: null,
    carryForwardFilterExprId: null,
    visibleIfExpressionId: 'show-if-yes',
    createdAt: new Date(),
    updatedAt: new Date(),
    page: { id: 'page-1', index: 1, titleTemplate: 'Welcome & Basic Info' },
    options: [
      {
        id: 'q3-opt1',
        tenantId: 'demo',
        surveyId: 'demo-logic-survey',
        questionId: 'q3',
        index: 1,
        value: 'Toyota',
        labelTemplate: 'Toyota',
        exclusive: false,
        groupKey: 'asian',
        weight: null,
        visibleIfExpressionId: null
      },
      {
        id: 'q3-opt2',
        tenantId: 'demo',
        surveyId: 'demo-logic-survey',
        questionId: 'q3',
        index: 2,
        value: 'Honda',
        labelTemplate: 'Honda',
        exclusive: false,
        groupKey: 'asian',
        weight: null,
        visibleIfExpressionId: null
      },
      {
        id: 'q3-opt3',
        tenantId: 'demo',
        surveyId: 'demo-logic-survey',
        questionId: 'q3',
        index: 3,
        value: 'BMW',
        labelTemplate: 'BMW',
        exclusive: false,
        groupKey: 'european',
        weight: null,
        visibleIfExpressionId: null
      },
      {
        id: 'q3-opt4',
        tenantId: 'demo',
        surveyId: 'demo-logic-survey',
        questionId: 'q3',
        index: 4,
        value: 'Mercedes',
        labelTemplate: 'Mercedes-Benz',
        exclusive: false,
        groupKey: 'european',
        weight: null,
        visibleIfExpressionId: null
      },
      {
        id: 'q3-opt5',
        tenantId: 'demo',
        surveyId: 'demo-logic-survey',
        questionId: 'q3',
        index: 5,
        value: 'Ford',
        labelTemplate: 'Ford',
        exclusive: false,
        groupKey: 'american',
        weight: null,
        visibleIfExpressionId: null
      },
      {
        id: 'q3-opt6',
        tenantId: 'demo',
        surveyId: 'demo-logic-survey',
        questionId: 'q3',
        index: 6,
        value: 'Chevrolet',
        labelTemplate: 'Chevrolet',
        exclusive: false,
        groupKey: 'american',
        weight: null,
        visibleIfExpressionId: null
      }
    ],
    items: [],
    scales: [],
    fromJumps: []
  },
  // Page 2 Questions  
  {
    id: 'q4',
    tenantId: 'demo',
    surveyId: 'demo-logic-survey',
    pageId: 'page-2',
    index: 1,
    type: 'TEXT' as const,
    variableName: 'Q4',
    titleTemplate: 'What specific car model are you considering?',
    helpTextTemplate: 'Please be as specific as possible.',
    required: true,
    validation: null,
    optionOrderMode: 'SEQUENTIAL' as const,
    optionsSource: 'STATIC' as const,
    carryForwardQuestionId: null,
    carryForwardFilterExprId: null,
    visibleIfExpressionId: 'show-if-yes',
    createdAt: new Date(),
    updatedAt: new Date(),
    page: { id: 'page-2', index: 2, titleTemplate: 'Conditional Questions' },
    options: [],
    items: [],
    scales: [],
    fromJumps: []
  },
  {
    id: 'q5',
    tenantId: 'demo',
    surveyId: 'demo-logic-survey',
    pageId: 'page-2',
    index: 2,
    type: 'SLIDER' as const,
    variableName: 'Q5',
    titleTemplate: 'What is your budget range? (in thousands)',
    helpTextTemplate: 'Move the slider to indicate your budget.',
    required: true,
    validation: null,
    optionOrderMode: 'SEQUENTIAL' as const,
    optionsSource: 'STATIC' as const,
    carryForwardQuestionId: null,
    carryForwardFilterExprId: null,
    visibleIfExpressionId: 'show-if-yes',
    createdAt: new Date(),
    updatedAt: new Date(),
    page: { id: 'page-2', index: 2, titleTemplate: 'Conditional Questions' },
    options: [],
    items: [],
    scales: [],
    fromJumps: []
  },
  {
    id: 'q6',
    tenantId: 'demo',
    surveyId: 'demo-logic-survey',
    pageId: 'page-2',
    index: 3,
    type: 'BOOLEAN' as const,
    variableName: 'Q6',
    titleTemplate: 'Are you planning to finance or pay cash?',
    helpTextTemplate: 'This helps us provide relevant information.',
    required: false,
    validation: null,
    optionOrderMode: 'SEQUENTIAL' as const,
    optionsSource: 'STATIC' as const,
    carryForwardQuestionId: null,
    carryForwardFilterExprId: null,
    visibleIfExpressionId: 'show-if-age-over-18',
    createdAt: new Date(),
    updatedAt: new Date(),
    page: { id: 'page-2', index: 2, titleTemplate: 'Conditional Questions' },
    options: [],
    items: [],
    scales: [],
    fromJumps: []
  },
  // Page 3 Questions
  {
    id: 'q7',
    tenantId: 'demo',
    surveyId: 'demo-logic-survey',
    pageId: 'page-3',
    index: 1,
    type: 'SINGLE_CHOICE' as const,
    variableName: 'Q7',
    titleTemplate: 'From your previously selected brands, which one is your top choice?',
    helpTextTemplate: 'This question carries forward options from Q3.',
    required: true,
    validation: null,
    optionOrderMode: 'SEQUENTIAL' as const,
    optionsSource: 'CARRY_FORWARD' as const,
    carryForwardQuestionId: 'q3',
    carryForwardFilterExprId: null,
    visibleIfExpressionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    page: { id: 'page-3', index: 3, titleTemplate: 'Advanced Features' },
    options: [], // Will be populated by carry forward
    items: [],
    scales: [],
    fromJumps: []
  },
  {
    id: 'q8',
    tenantId: 'demo',
    surveyId: 'demo-logic-survey',
    pageId: 'page-3',
    index: 2,
    type: 'TEXTAREA' as const,
    variableName: 'Q8',
    titleTemplate: 'Any additional comments or feedback?',
    helpTextTemplate: 'Optional: Tell us anything else you\'d like us to know.',
    required: false,
    validation: null,
    optionOrderMode: 'SEQUENTIAL' as const,
    optionsSource: 'STATIC' as const,
    carryForwardQuestionId: null,
    carryForwardFilterExprId: null,
    visibleIfExpressionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    page: { id: 'page-3', index: 3, titleTemplate: 'Advanced Features' },
    options: [],
    items: [],
    scales: [],
    fromJumps: []
  }
];

export default function DemoLogicPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <Header 
        surveyTitle="Logic Features Demo"
        surveyId="demo-logic-survey"
        showSurveyActions={false}
      />

      {/* Demo Description */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-blue-900 mb-3">🎮 Logic Features Demo</h2>
          <div className="text-blue-800 space-y-2">
            <p><strong>Try these features:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>Conditional Logic:</strong> Answer "Yes" to Q1 to see car-related questions appear</li>
              <li><strong>Jump Logic:</strong> Answer "No" to Q1 to skip directly to the final page</li>
              <li><strong>Randomization:</strong> Notice how Q3 options are shuffled randomly</li>
              <li><strong>Carry Forward:</strong> Your Q3 selections will appear as options in Q7</li>
              <li><strong>Age Logic:</strong> Enter age over 18 to see additional questions</li>
              <li><strong>Piping:</strong> Your answers are dynamically inserted into question text</li>
            </ul>
            <p className="mt-3 text-xs text-blue-600">
              Watch the "Logic Features Active" panel to see what's happening behind the scenes!
            </p>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <main className="max-w-4xl mx-auto px-4 pb-8">
        <SurveyPreview
          survey={demoSurvey as any}
          pages={demoPages as any}
          questions={demoQuestions as any}
        />
      </main>
    </div>
  );
}
