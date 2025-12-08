/**
 * Runtime Settings Engine
 * 
 * Centralized engine for applying survey settings during runtime execution.
 * Handles settings application at different phases of survey interaction:
 * - ADMISSION: Before survey starts (security, availability, access)
 * - NAVIGATION: During page/question navigation (UI behavior, flow control)
 * - VALIDATION: During answer submission (validation, error handling)
 * - COMPLETION: After survey completion (post-survey actions, redirects)
 */

import { PrismaClient } from '@prisma/client';

// ============================================================================
// CORE INTERFACES
// ============================================================================

export enum SettingsPhase {
  ADMISSION = 'ADMISSION',
  NAVIGATION = 'NAVIGATION', 
  VALIDATION = 'VALIDATION',
  COMPLETION = 'COMPLETION'
}

export interface RuntimeSettingsContext {
  // Core identifiers
  sessionId: string;
  surveyId: string;
  collectorId: string;
  tenantId: string;
  
  // Current state
  currentPhase: SettingsPhase;
  currentPageId?: string;
  currentQuestionId?: string;
  
  // User context
  userContext: {
    ip: string;
    userAgent: string;
    referrer?: string;
    deviceId: string;
    geoData?: any;
    vpnStatus?: any;
  };
  
  // Survey state
  surveySettings: any; // Will be typed more specifically
  answers: Map<string, any>;
  sessionMetadata: any;
  
  // Runtime data
  loopContext?: Map<string, any>;
  quotaStatus?: any;
}

export interface SettingsResult {
  canProceed: boolean;
  reason?: string;
  message?: string;
  redirectUrl?: string;
  customMessage?: string;
  uiSettings?: {
    showBackButton?: boolean;
    showProgressBar?: boolean;
    showQuestionNumbers?: boolean;
    showPageNumbers?: boolean;
    allowFinishLater?: boolean;
  };
  validationSettings?: {
    customErrorMessage?: string;
    preventMultipleSubmissions?: boolean;
  };
  postSurveySettings?: {
    redirectUrl?: string;
    thankYouEmail?: boolean;
    thankYouEmailMessage?: string;
    completionMessage?: string;
    showResults?: boolean;
  };
}

export interface AdmissionResult extends SettingsResult {
  reason?: 'PASSWORD_REQUIRED' | 'INVALID_PASSWORD' | 'REFERRAL_BLOCKED' | 'SURVEY_NOT_AVAILABLE' | 'MULTIPLE_SUBMISSION_BLOCKED' | 'VPN_BLOCKED';
}

export interface NavigationResult extends SettingsResult {
  reason?: 'BACK_BUTTON_DISABLED' | 'FINISH_LATER_DISABLED' | 'NAVIGATION_RESTRICTED';
}

export interface ValidationResult extends SettingsResult {
  reason?: 'CUSTOM_ERROR_MESSAGE' | 'MULTIPLE_SUBMISSION_DETECTED' | 'VALIDATION_FAILED';
}

export interface CompletionResult extends SettingsResult {
  reason?: 'REDIRECT_REQUIRED' | 'EMAIL_SENT' | 'COMPLETION_MESSAGE_SHOWN';
}

// ============================================================================
// MAIN SETTINGS ENGINE
// ============================================================================

export class RuntimeSettingsEngine {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Main entry point for applying settings
   */
  async applySettings(context: RuntimeSettingsContext): Promise<SettingsResult> {
    console.log(`🔧 [SETTINGS_ENGINE] Starting ${context.currentPhase} phase for survey ${context.surveyId}`);
    console.log(`🔧 [SETTINGS_ENGINE] Session: ${context.sessionId}, Collector: ${context.collectorId}`);
    
    try {
      let result: SettingsResult;
      
      switch (context.currentPhase) {
        case SettingsPhase.ADMISSION:
          console.log(`🔧 [SETTINGS_ENGINE] Processing ADMISSION settings...`);
          result = await this.handleAdmission(context);
          break;
        case SettingsPhase.NAVIGATION:
          console.log(`🔧 [SETTINGS_ENGINE] Processing NAVIGATION settings...`);
          result = await this.handleNavigation(context);
          break;
        case SettingsPhase.VALIDATION:
          console.log(`🔧 [SETTINGS_ENGINE] Processing VALIDATION settings...`);
          result = await this.handleValidation(context);
          break;
        case SettingsPhase.COMPLETION:
          console.log(`🔧 [SETTINGS_ENGINE] Processing COMPLETION settings...`);
          result = await this.handleCompletion(context);
          break;
        default:
          console.log(`⚠️ [SETTINGS_ENGINE] Unknown phase: ${context.currentPhase}`);
          result = {
            canProceed: true,
            message: 'Unknown phase, allowing default behavior'
          };
      }
      
      console.log(`🔧 [SETTINGS_ENGINE] ${context.currentPhase} result:`, {
        canProceed: result.canProceed,
        reason: result.reason,
        message: result.message
      });
      
      return result;
    } catch (error) {
      console.error(`❌ [SETTINGS_ENGINE] Error in ${context.currentPhase} phase:`, error);
      return {
        canProceed: true,
        message: 'Settings engine error, falling back to default behavior'
      };
    }
  }

  /**
   * Handle ADMISSION phase settings
   * - Password protection
   * - Referral website validation
   * - Survey availability (opensAt/closesAt)
   * - Multiple submission prevention
   * - VPN detection
   * - Survey access type
   */
  async handleAdmission(context: RuntimeSettingsContext): Promise<AdmissionResult> {
    const settings = context.surveySettings;
    const security = settings?.security || {};
    const responses = settings?.responses || {};

    console.log(`🔧 [ADMISSION] Security settings:`, {
      passwordProtected: security.passwordProtected,
      referralWebsite: security.referralWebsite,
      referralWebsiteURL: security.referralWebsiteURL,
      surveyAccess: security.surveyAccess
    });

    console.log(`🔧 [ADMISSION] User context:`, {
      ip: context.userContext.ip,
      referrer: context.userContext.referrer,
      userAgent: context.userContext.userAgent?.substring(0, 50) + '...'
    });

    // 1. Password Protection
    if (security.passwordProtected) {
      console.log(`🔧 [ADMISSION] Password protection enabled`);
      // This would be handled by the admission controller
      // We just need to ensure the setting is properly configured
      if (!security.surveyPassword) {
        console.log(`❌ [ADMISSION] Password protection enabled but no password configured`);
        return {
          canProceed: false,
          reason: 'PASSWORD_REQUIRED',
          message: 'Survey password is required but not configured'
        };
      }
      console.log(`✅ [ADMISSION] Password protection configured`);
    }

    // 2. Referral Website Validation
    if (security.referralWebsite) {
      console.log(`🔧 [ADMISSION] Referral website validation enabled`);
      if (!security.referralWebsiteURL) {
        console.log(`❌ [ADMISSION] Referral website enabled but no URL configured`);
        return {
          canProceed: false,
          reason: 'REFERRAL_BLOCKED',
          message: 'Referral website URL is required but not configured'
        };
      }
      
      // Check if referrer matches the configured URL
      const referrerDomain = this.extractDomain(context.userContext.referrer || '');
      const configuredDomain = this.extractDomain(security.referralWebsiteURL);
      
      console.log(`🔧 [ADMISSION] Referral check:`, {
        userReferrer: context.userContext.referrer,
        referrerDomain,
        configuredURL: security.referralWebsiteURL,
        configuredDomain
      });
      
      if (referrerDomain && referrerDomain !== configuredDomain) {
        console.log(`❌ [ADMISSION] Referral domain mismatch: ${referrerDomain} !== ${configuredDomain}`);
        return {
          canProceed: false,
          reason: 'REFERRAL_BLOCKED',
          message: 'Access denied: Referral website does not match configured URL'
        };
      }
      console.log(`✅ [ADMISSION] Referral website validation passed`);
    }

    // 3. Survey Availability Check
    if (responses.surveyAvailability === 'scheduled') {
      console.log(`🔧 [ADMISSION] Survey availability check (scheduled mode)`);
      const now = new Date();
      
      if (responses.surveyStartDate && responses.surveyStartTime) {
        const startDateTime = new Date(`${responses.surveyStartDate}T${responses.surveyStartTime}`);
        console.log(`🔧 [ADMISSION] Start time check:`, {
          now: now.toISOString(),
          startDateTime: startDateTime.toISOString(),
          isBeforeStart: now < startDateTime
        });
        if (now < startDateTime) {
          console.log(`❌ [ADMISSION] Survey not yet available`);
          return {
            canProceed: false,
            reason: 'SURVEY_NOT_AVAILABLE',
            message: 'Survey is not yet available. Please try again later.'
          };
        }
      }
      
      if (responses.surveyEndDate && responses.surveyEndTime) {
        const endDateTime = new Date(`${responses.surveyEndDate}T${responses.surveyEndTime}`);
        console.log(`🔧 [ADMISSION] End time check:`, {
          now: now.toISOString(),
          endDateTime: endDateTime.toISOString(),
          isAfterEnd: now > endDateTime
        });
        if (now > endDateTime) {
          console.log(`❌ [ADMISSION] Survey has expired`);
          return {
            canProceed: false,
            reason: 'SURVEY_NOT_AVAILABLE',
            message: 'Survey has expired. Thank you for your interest.'
          };
        }
      }
      console.log(`✅ [ADMISSION] Survey availability check passed`);
    }

    // 4. Multiple Submission Prevention (Device/IP based)
    if (security.onGoingSurveyPreventMultipleSubmissions) {
      console.log(`🔧 [ADMISSION] Multiple submission prevention enabled`);
      const isDuplicate = await this.checkMultipleSubmissions(context);
      console.log(`🔧 [ADMISSION] Multiple submission check result:`, { isDuplicate });
      if (isDuplicate) {
        console.log(`❌ [ADMISSION] Multiple submission detected`);
        return {
          canProceed: false,
          reason: 'MULTIPLE_SUBMISSION_BLOCKED',
          message: security.onGoingSurveyMultipleSubmissionsResponse || 'You have already started this survey.'
        };
      }
      console.log(`✅ [ADMISSION] Multiple submission check passed`);
    }

    // 5. VPN Detection
    if (context.userContext.vpnStatus?.blocked) {
      console.log(`❌ [ADMISSION] VPN usage detected and blocked`);
      return {
        canProceed: false,
        reason: 'VPN_BLOCKED',
        message: 'Access denied: VPN usage detected'
      };
    }

    console.log(`✅ [ADMISSION] All admission checks passed successfully`);
    return {
      canProceed: true,
      message: 'Admission settings validated successfully'
    };
  }

  /**
   * Handle NAVIGATION phase settings
   * - Back button control
   * - Finish later functionality
   * - UI display settings
   * - Question/page numbering
   * - Progress bar visibility
   */
  async handleNavigation(context: RuntimeSettingsContext): Promise<NavigationResult> {
    const settings = context.surveySettings;
    const responses = settings?.responses || {};

    console.log(`🔧 [NAVIGATION] Processing UI settings for page ${context.currentPageId}`);

    const uiSettings = {
      showBackButton: responses.backButton !== false, // Default to true unless explicitly disabled
      showProgressBar: settings?.progressBar !== false,
      showQuestionNumbers: settings?.showQuestionNumbers !== false,
      showPageNumbers: settings?.showPageNumbers !== false,
      allowFinishLater: responses.allowFinishLater !== false
    };

    console.log(`🔧 [NAVIGATION] UI settings applied:`, uiSettings);

    return {
      canProceed: true,
      uiSettings,
      message: 'Navigation settings applied successfully'
    };
  }

  /**
   * Handle VALIDATION phase settings
   * - Custom error messages
   * - Multiple submission detection
   * - Answer validation rules
   */
  async handleValidation(context: RuntimeSettingsContext): Promise<ValidationResult> {
    const settings = context.surveySettings;
    const responses = settings?.responses || {};
    const security = settings?.security || {};

    console.log(`🔧 [VALIDATION] Processing validation settings for page ${context.currentPageId}`);

    const validationSettings = {
      customErrorMessage: responses.customErrorMessages ? responses.customErrorMessageText : undefined,
      preventMultipleSubmissions: security.onGoingSurveyPreventMultipleSubmissions
    };

    console.log(`🔧 [VALIDATION] Validation settings applied:`, {
      hasCustomErrorMessage: !!validationSettings.customErrorMessage,
      preventMultipleSubmissions: validationSettings.preventMultipleSubmissions
    });

    return {
      canProceed: true,
      validationSettings,
      message: 'Validation settings applied successfully'
    };
  }

  /**
   * Handle COMPLETION phase settings
   * - Redirect URL
   * - Thank you email
   * - Completion message
   * - Results visibility
   * - Post-survey multiple submission prevention
   */
  async handleCompletion(context: RuntimeSettingsContext): Promise<CompletionResult> {
    const settings = context.surveySettings;
    const postSurvey = settings?.postSurvey || {};
    const security = settings?.security || {};

    console.log(`🔧 [COMPLETION] Processing post-survey settings`);

    const postSurveySettings = {
      redirectUrl: postSurvey.redirectUrl,
      thankYouEmail: postSurvey.thankYouEmail,
      thankYouEmailMessage: postSurvey.thankYouEmailMessage,
      completionMessage: postSurvey.completionMessage,
      showResults: postSurvey.showResults
    };

    console.log(`🔧 [COMPLETION] Post-survey settings:`, {
      hasRedirectUrl: !!postSurveySettings.redirectUrl,
      thankYouEmail: postSurveySettings.thankYouEmail,
      hasCompletionMessage: !!postSurveySettings.completionMessage,
      showResults: postSurveySettings.showResults
    });

    // Check for post-survey multiple submission prevention
    if (security.postSurveyPreventMultipleSubmissions) {
      console.log(`🔧 [COMPLETION] Post-survey multiple submission prevention enabled`);
      const isDuplicate = await this.checkMultipleSubmissions(context);
      console.log(`🔧 [COMPLETION] Multiple submission check result:`, { isDuplicate });
      if (isDuplicate) {
        console.log(`❌ [COMPLETION] Multiple submission detected during completion`);
        return {
          canProceed: false,
          reason: 'MULTIPLE_SUBMISSION_DETECTED' as any,
          message: 'Multiple submissions detected. Your response has already been recorded.'
        };
      }
      console.log(`✅ [COMPLETION] Multiple submission check passed`);
    }

    console.log(`✅ [COMPLETION] All completion checks passed successfully`);
    return {
      canProceed: true,
      postSurveySettings,
      message: 'Completion settings applied successfully'
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.toLowerCase();
    } catch {
      return '';
    }
  }

  /**
   * Check for multiple submissions based on device/IP
   */
  private async checkMultipleSubmissions(context: RuntimeSettingsContext): Promise<boolean> {
    try {
      // Check for existing sessions with same device ID or IP
      const existingSessions = await this.prisma.surveySession.findMany({
        where: {
          surveyId: context.surveyId,
          tenantId: context.tenantId,
          OR: [
            { meta: { path: ['deviceId'], equals: context.userContext.deviceId } },
            { meta: { path: ['ip'], equals: context.userContext.ip } }
          ],
          status: { in: ['IN_PROGRESS', 'COMPLETED'] }
        }
      });

      return existingSessions.length > 0;
    } catch (error) {
      console.error('Error checking multiple submissions:', error);
      return false; // Allow on error to avoid blocking legitimate users
    }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createRuntimeSettingsEngine(prisma: PrismaClient): RuntimeSettingsEngine {
  return new RuntimeSettingsEngine(prisma);
}
