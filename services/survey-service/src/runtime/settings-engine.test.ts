/**
 * Runtime Settings Engine Test
 * 
 * Simple test to verify the settings engine works with the sample survey settings
 */

import { PrismaClient } from '@prisma/client';
import { createRuntimeSettingsEngine, RuntimeSettingsContext, SettingsPhase } from './settings-engine';

// Sample survey settings from the user's survey
const sampleSurveySettings = {
  "theme": "corporate",
  "security": {
    "surveyAccess": "PUBLIC",
    "surveyPassword": "1234567890",
    "preventIndexing": true,
    "referralWebsite": true,
    "passwordProtected": true,
    "anonymizeResponses": false,
    "referralWebsiteURL": "https://research-connectllc.com",
    "uploadedFilesAccess": "permission_required",
    "postSurveyPreventMultipleSubmissions": true,
    "onGoingSurveyPreventMultipleSubmissions": true,
    "onGoingSurveyMultipleSubmissionsResponse": "Ek baar bhara na, don't try to add multiple entries"
  },
  "allowBack": true,
  "responses": {
    "backButton": false,
    "surveyEndDate": "2025-09-21",
    "surveyEndTime": "13:24",
    "surveyStartDate": "2025-09-15",
    "surveyStartTime": "13:24",
    "allowFinishLater": false,
    "automaticClosure": true,
    "surveyAvailability": "scheduled",
    "customErrorMessages": true,
    "inactiveMessageType": "custom",
    "incompleteResponses": "record",
    "incompleteTimeLimit": "2_weeks",
    "incompleteTimerStart": "survey_start",
    "customInactiveMessage": "Survey Inactive hai dost",
    "customErrorMessageText": "This question was required Buddy !!!",
    "automaticClosureMessage": "This survey is closed !!, Band Ho gaya ye"
  },
  "postSurvey": {
    "redirectUrl": "https://youtube.com",
    "showResults": false,
    "thankYouEmail": true,
    "completionMessage": "Dhanyavad",
    "contactListWorkflows": [],
    "thankYouEmailMessage": "Thankyou very much Jyotindra !! ",
    "completedSurveyMessage": true,
    "completedSurveyMessageText": "Hogaya Survey Complete, Ghar nikal chal"
  },
  "progressBar": true,
  "showPageNumbers": true,
  "randomizeQuestions": false,
  "newSurveyExperience": true,
  "showQuestionNumbers": true
};

async function testSettingsEngine() {
  console.log('🧪 Testing Runtime Settings Engine...\n');

  const prisma = new PrismaClient();
  const settingsEngine = createRuntimeSettingsEngine(prisma);

  // Test ADMISSION phase
  console.log('1️⃣ Testing ADMISSION Phase...');
  const admissionContext: RuntimeSettingsContext = {
    sessionId: 'test-session-123',
    surveyId: '470ef48b-6725-4225-8029-ec8f954bb969',
    collectorId: 'test-collector-123',
    tenantId: '96fb4499-2ba5-47fc-b054-d48078961a4b',
    currentPhase: SettingsPhase.ADMISSION,
    userContext: {
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      referrer: 'https://research-connectllc.com',
      deviceId: 'test-device-123',
      geoData: undefined,
      vpnStatus: undefined
    },
    surveySettings: sampleSurveySettings,
    answers: new Map(),
    sessionMetadata: undefined
  };

  try {
    const admissionResult = await settingsEngine.applySettings(admissionContext);
    console.log('✅ ADMISSION Result:', {
      canProceed: admissionResult.canProceed,
      reason: admissionResult.reason,
      message: admissionResult.message
    });
  } catch (error) {
    console.log('❌ ADMISSION Error:', error);
  }

  // Test NAVIGATION phase
  console.log('\n2️⃣ Testing NAVIGATION Phase...');
  const navigationContext: RuntimeSettingsContext = {
    ...admissionContext,
    currentPhase: SettingsPhase.NAVIGATION,
    currentPageId: 'test-page-123'
  };

  try {
    const navigationResult = await settingsEngine.applySettings(navigationContext);
    console.log('✅ NAVIGATION Result:', {
      canProceed: navigationResult.canProceed,
      uiSettings: navigationResult.uiSettings
    });
  } catch (error) {
    console.log('❌ NAVIGATION Error:', error);
  }

  // Test VALIDATION phase
  console.log('\n3️⃣ Testing VALIDATION Phase...');
  const validationContext: RuntimeSettingsContext = {
    ...admissionContext,
    currentPhase: SettingsPhase.VALIDATION,
    currentPageId: 'test-page-123',
    answers: new Map([['test-question-1', { questionId: 'test-question-1', textValue: 'test answer' }]])
  };

  try {
    const validationResult = await settingsEngine.applySettings(validationContext);
    console.log('✅ VALIDATION Result:', {
      canProceed: validationResult.canProceed,
      validationSettings: validationResult.validationSettings
    });
  } catch (error) {
    console.log('❌ VALIDATION Error:', error);
  }

  // Test COMPLETION phase
  console.log('\n4️⃣ Testing COMPLETION Phase...');
  const completionContext: RuntimeSettingsContext = {
    ...admissionContext,
    currentPhase: SettingsPhase.COMPLETION,
    answers: new Map([['test-question-1', { questionId: 'test-question-1', textValue: 'test answer' }]])
  };

  try {
    const completionResult = await settingsEngine.applySettings(completionContext);
    console.log('✅ COMPLETION Result:', {
      canProceed: completionResult.canProceed,
      postSurveySettings: completionResult.postSurveySettings
    });
  } catch (error) {
    console.log('❌ COMPLETION Error:', error);
  }

  console.log('\n🎉 Settings Engine Test Complete!');
  
  await prisma.$disconnect();
}

// Run the test if this file is executed directly
if (require.main === module) {
  testSettingsEngine().catch(console.error);
}

export { testSettingsEngine };
