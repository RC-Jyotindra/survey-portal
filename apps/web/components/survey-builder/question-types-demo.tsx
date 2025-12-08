"use client";

import { QuestionType } from '@/lib/api/questions-api';
import QuestionPreview from './question-preview';

const DEMO_QUESTIONS = [
  // Basic Choice Types
  {
    type: 'SINGLE_CHOICE' as QuestionType,
    titleTemplate: 'What is your favorite color?',
    options: [
      { id: '1', labelTemplate: 'Red', value: 'red' },
      { id: '2', labelTemplate: 'Blue', value: 'blue' },
      { id: '3', labelTemplate: 'Green', value: 'green' }
    ]
  },
  {
    type: 'MULTIPLE_CHOICE' as QuestionType,
    titleTemplate: 'Which programming languages do you know?',
    options: [
      { id: '1', labelTemplate: 'JavaScript', value: 'js' },
      { id: '2', labelTemplate: 'Python', value: 'python' },
      { id: '3', labelTemplate: 'TypeScript', value: 'ts' },
      { id: '4', labelTemplate: 'Java', value: 'java' }
    ],
    maxSelections: 3,
    allowOther: true,
    otherLabel: 'Other'
  },
  {
    type: 'DROPDOWN' as QuestionType,
    titleTemplate: 'What is your experience level?',
    options: [
      { id: '1', labelTemplate: 'Beginner', value: 'beginner' },
      { id: '2', labelTemplate: 'Intermediate', value: 'intermediate' },
      { id: '3', labelTemplate: 'Advanced', value: 'advanced' },
      { id: '4', labelTemplate: 'Expert', value: 'expert' }
    ]
  },
  {
    type: 'YES_NO' as QuestionType,
    titleTemplate: 'Do you agree with our terms of service?',
    options: [
      { id: '1', labelTemplate: 'Yes', value: 'yes' },
      { id: '2', labelTemplate: 'No', value: 'no' }
    ]
  },

  // Text Input Types
  {
    type: 'TEXT' as QuestionType,
    titleTemplate: 'What is your full name?'
  },
  {
    type: 'TEXTAREA' as QuestionType,
    titleTemplate: 'Please describe your experience with our product.'
  },
  {
    type: 'EMAIL' as QuestionType,
    titleTemplate: 'What is your email address?'
  },
  {
    type: 'PHONE_NUMBER' as QuestionType,
    titleTemplate: 'What is your phone number?',
    phoneFormat: 'US',
    countryCode: 'US'
  },
  {
    type: 'WEBSITE' as QuestionType,
    titleTemplate: 'What is your website URL?',
    urlProtocol: 'https'
  },

  // Numeric Types
  {
    type: 'NUMBER' as QuestionType,
    titleTemplate: 'How many years of experience do you have?',
    minValue: 0,
    maxValue: 50
  },
  {
    type: 'DECIMAL' as QuestionType,
    titleTemplate: 'What is your GPA?',
    minValue: 0,
    maxValue: 4.0
  },
  {
    type: 'SLIDER' as QuestionType,
    titleTemplate: 'Rate your satisfaction (1-10)',
    minValue: 1,
    maxValue: 10,
    stepValue: 1,
    defaultValue: 5
  },
  {
    type: 'OPINION_SCALE' as QuestionType,
    titleTemplate: 'How would you rate our customer service?',
    scaleSteps: 5,
    scaleMinLabel: 'Poor',
    scaleMaxLabel: 'Excellent'
  },
  {
    type: 'CONSTANT_SUM' as QuestionType,
    titleTemplate: 'Allocate 100 points across these features:',
    options: [
      { id: '1', labelTemplate: 'Performance', value: 'performance' },
      { id: '2', labelTemplate: 'Design', value: 'design' },
      { id: '3', labelTemplate: 'Price', value: 'price' },
      { id: '4', labelTemplate: 'Support', value: 'support' }
    ],
    totalPoints: 100,
    allowZero: true
  },

  // Date/Time Types
  {
    type: 'DATE' as QuestionType,
    titleTemplate: 'What is your birth date?',
    dateFormat: 'MM/DD/YYYY'
  },
  {
    type: 'TIME' as QuestionType,
    titleTemplate: 'What time do you prefer for meetings?',
    timeFormat: '12h'
  },
  {
    type: 'DATETIME' as QuestionType,
    titleTemplate: 'When would you like to schedule the appointment?',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h'
  },

  // Advanced Types
  {
    type: 'RANK' as QuestionType,
    titleTemplate: 'Rank these priorities from most to least important:',
    options: [
      { id: '1', labelTemplate: 'Work-life balance', value: 'balance' },
      { id: '2', labelTemplate: 'Salary', value: 'salary' },
      { id: '3', labelTemplate: 'Career growth', value: 'growth' },
      { id: '4', labelTemplate: 'Company culture', value: 'culture' }
    ]
  },
  {
    type: 'MATRIX' as QuestionType,
    titleTemplate: 'Rate each aspect of our service:',
    options: [
      { id: '1', labelTemplate: 'Speed', value: 'speed' },
      { id: '2', labelTemplate: 'Quality', value: 'quality' },
      { id: '3', labelTemplate: 'Price', value: 'price' },
      { id: '4', labelTemplate: 'Poor', value: 'poor' },
      { id: '5', labelTemplate: 'Fair', value: 'fair' },
      { id: '6', labelTemplate: 'Good', value: 'good' },
      { id: '7', labelTemplate: 'Excellent', value: 'excellent' }
    ],
    matrixType: 'single',
    showHeaders: true
  },
  {
    type: 'BIPOLAR_MATRIX' as QuestionType,
    titleTemplate: 'Rate your agreement with these statements:',
    options: [
      { id: '1', labelTemplate: 'The product is easy to use', value: 'easy' },
      { id: '2', labelTemplate: 'The price is reasonable', value: 'price' },
      { id: '3', labelTemplate: 'Customer support is helpful', value: 'support' }
    ],
    scaleSteps: 5,
    scaleMinLabel: 'Strongly Disagree',
    scaleMaxLabel: 'Strongly Agree'
  },
  {
    type: 'GROUP_RANK' as QuestionType,
    titleTemplate: 'Rank the items in each group:',
    options: [
      { id: '1', labelTemplate: 'Item 1', value: 'item1' },
      { id: '2', labelTemplate: 'Item 2', value: 'item2' },
      { id: '3', labelTemplate: 'Item 3', value: 'item3' },
      { id: '4', labelTemplate: 'Item 4', value: 'item4' },
      { id: '5', labelTemplate: 'Item 5', value: 'item5' },
      { id: '6', labelTemplate: 'Item 6', value: 'item6' }
    ],
    groupSize: 3,
    groupLabel: 'Group'
  },
  {
    type: 'GROUP_RATING' as QuestionType,
    titleTemplate: 'Rate the items in each group:',
    options: [
      { id: '1', labelTemplate: 'Feature A', value: 'featureA' },
      { id: '2', labelTemplate: 'Feature B', value: 'featureB' },
      { id: '3', labelTemplate: 'Feature C', value: 'featureC' },
      { id: '4', labelTemplate: 'Feature D', value: 'featureD' }
    ],
    groupSize: 2,
    groupLabel: 'Category',
    scaleSteps: 5,
    scaleMinLabel: 'Poor',
    scaleMaxLabel: 'Excellent'
  },

  // File Types
  {
    type: 'FILE_UPLOAD' as QuestionType,
    titleTemplate: 'Please upload your resume:',
    allowedFileTypes: ['pdf', 'doc', 'docx'],
    maxFileSize: 5242880, // 5MB
    maxFiles: 1
  },
  {
    type: 'PHOTO_CAPTURE' as QuestionType,
    titleTemplate: 'Take a photo of your ID:',
    allowedFileTypes: ['jpg', 'jpeg', 'png'],
    maxFileSize: 2097152, // 2MB
    maxFiles: 1
  },

  // Special Types
  {
    type: 'PICTURE_CHOICE' as QuestionType,
    titleTemplate: 'Which design do you prefer?',
    options: [
      { id: '1', labelTemplate: 'Design A', value: 'designA' },
      { id: '2', labelTemplate: 'Design B', value: 'designB' },
      { id: '3', labelTemplate: 'Design C', value: 'designC' }
    ],
    imageLayout: 'grid',
    imageSize: 'medium'
  },
  {
    type: 'PAYMENT' as QuestionType,
    titleTemplate: 'Complete your purchase:',
    paymentAmount: 29.99,
    currency: 'USD',
    paymentMethods: ['card', 'paypal']
  },
  {
    type: 'SIGNATURE' as QuestionType,
    titleTemplate: 'Please sign below:',
    signatureWidth: 400,
    signatureHeight: 200,
    signatureColor: '#000000'
  },
  {
    type: 'CONSENT_AGREEMENT' as QuestionType,
    titleTemplate: 'Terms and Conditions',
    consentText: 'I agree to the terms and conditions and privacy policy. I understand that my data will be used for research purposes only.',
    requireSignature: true
  },
  {
    type: 'MESSAGE' as QuestionType,
    titleTemplate: 'Important Information',
    descriptionTemplate: 'Thank you for participating in our survey. Your responses are confidential and will be used for research purposes only.'
  },
  {
    type: 'CONTACT_FORM' as QuestionType,
    titleTemplate: 'Contact Information',
    collectName: true,
    collectEmail: true,
    collectPhone: true,
    collectCompany: false,
    collectAddress: false
  },
  {
    type: 'DESCRIPTIVE' as QuestionType,
    titleTemplate: 'Survey Instructions',
    descriptionTemplate: 'Please read the following instructions carefully before proceeding with the survey. This survey should take approximately 10 minutes to complete.'
  }
];

export default function QuestionTypesDemo() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Question Types Demo</h1>
        <p className="text-gray-600">
          This demo showcases all the question types available in our Survey Builder. 
          Each question type has its own configuration options and preview.
        </p>
      </div>

      <div className="space-y-8">
        {DEMO_QUESTIONS.map((question, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-6">
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  {question.type.replace(/_/g, ' ')}
                </span>
                <span className="text-sm text-gray-500">Question #{index + 1}</span>
              </div>
            </div>
            <QuestionPreview
              questionType={question.type}
              question={question}
              isPreview={true}
            />
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Choice Questions</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• Single Choice</li>
              <li>• Multiple Choice</li>
              <li>• Dropdown</li>
              <li>• Yes/No</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Text Questions</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• Text Entry</li>
              <li>• Long Text</li>
              <li>• Email</li>
              <li>• Phone Number</li>
              <li>• Website</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Numeric Questions</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• Number</li>
              <li>• Decimal</li>
              <li>• Slider</li>
              <li>• Opinion Scale</li>
              <li>• Constant Sum</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Advanced Questions</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• Date/Time</li>
              <li>• Rank Order</li>
              <li>• Matrix Table</li>
              <li>• Bipolar Matrix</li>
              <li>• Group Rank/Rating</li>
              <li>• File Upload</li>
              <li>• Special Types</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
