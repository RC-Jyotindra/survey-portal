/**
 * Collector Admission Module
 * 
 * Handles admission checks for survey collectors:
 * - Status, date window, response cap checks
 * - Token validation for SINGLE_USE collectors
 * - Device/session restrictions
 * - Survey target checks
 */

import { PrismaClient } from '@prisma/client';
import { generateDeviceFingerprint } from './utils';
import { lookupIp, parseUtmParams, parseUserAgent, getReferrerDomain } from '../lib/geo';

export interface AdmissionRequest {
  slug: string;
  token?: string;
  userAgent?: string;
  ip?: string;
  referrer?: string;
  utmParams?: Record<string, string>;
}

export interface AdmissionResult {
  canProceed: boolean;
  reason?: 'COLLECTOR_NOT_FOUND' | 'COLLECTOR_INACTIVE' | 'NOT_YET_OPEN' | 'ALREADY_CLOSED' | 'QUOTA_REACHED' | 'INVALID_TOKEN' | 'TOKEN_EXPIRED' | 'TOKEN_USED' | 'DEVICE_LIMIT' | 'SURVEY_CLOSED' | 'SURVEY_OVERQUOTA' | 'VPN_BLOCKED' | 'VPN_CHALLENGE';
  message?: string;
  collector?: {
    id: string;
    name: string;
    type: string;
    status: string;
    surveyId: string;
    tenantId: string;
    allowTest: boolean;
  };
  closingSoon?: boolean;
  existingSession?: any;
  vpnStatus?: {
    blocked: boolean;
    riskScore?: number;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    action?: 'ALLOW' | 'CHALLENGE' | 'BLOCK';
    reasons?: string[];
  };
}

export interface SessionMetadata {
  collectorId: string;
  inviteId?: string;
  deviceId: string;
  ip: string;
  referrer?: string;
  referrerDomain?: string;
  utmParams: Record<string, string>;
  userAgent: string;
  userAgentInfo: {
    browser?: string;
    os?: string;
    device?: string;
    isMobile: boolean;
    isBot: boolean;
  };
  geoData?: {
    ip: string;
    country?: string;
    countryCode?: string;
    region?: string;
    regionCode?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    source: 'maxmind' | 'fallback' | 'none';
    lookupTime: Date;
    ipRisk?: {
      vpn: boolean;
      proxy: boolean;
      tor: boolean;
      hosting: boolean;
      fraudScore: number;
      isp?: string;
      organization?: string;
      asn?: number;
      mobile?: boolean;
      queryTime: Date;
    };
    riskScore?: {
      score: number;
      level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      reasons: string[];
      action: 'ALLOW' | 'CHALLENGE' | 'BLOCK';
    };
  };
  source: string;
}

/**
 * Check if a request can be admitted to a survey collector
 */
export async function checkAdmission(
  prisma: PrismaClient,
  request: AdmissionRequest
): Promise<AdmissionResult> {
  const { slug, token, userAgent = '', ip = '', referrer = '', utmParams = {} } = request;

  // Find the collector by slug
  const collector = await prisma.surveyCollector.findUnique({
    where: { slug },
    include: {
      survey: {
        include: {
          target: true
        }
      }
    }
  });

  if (!collector) {
    return {
      canProceed: false,
      reason: 'COLLECTOR_NOT_FOUND',
      message: 'Survey link not found'
    };
  }

  // Check collector status
  if (collector.status !== 'active') {
    return {
      canProceed: false,
      reason: 'COLLECTOR_INACTIVE',
      message: 'This survey link is not active'
    };
  }

  // Check VPN status - ONLY if enabled in survey settings
  const surveySettings = collector.survey.settings as any;
  const vpnSettings = surveySettings?.security?.vpnDetection;
  
  if (vpnSettings?.enabled) {
    console.log('🔍 [ADMISSION] VPN detection enabled, checking status...', {
      surveyId: collector.survey.id,
      blockThreshold: vpnSettings.blockThreshold,
      challengeThreshold: vpnSettings.challengeThreshold
    });
    const vpnCheck = await checkVpnStatus(ip, userAgent, referrer, vpnSettings);
    if (!vpnCheck.canProceed) {
      console.log('🚫 [ADMISSION] User blocked due to VPN detection:', vpnCheck.reason);
      return {
        canProceed: false,
        reason: vpnCheck.reason,
        message: vpnCheck.message || vpnSettings.customMessage,
        vpnStatus: vpnCheck.vpnStatus
      };
    }
    console.log('✅ [ADMISSION] VPN check passed, continuing with admission...');
  } else {
    console.log('ℹ️ [ADMISSION] VPN detection disabled, skipping check...', {
      surveyId: collector.survey.id,
      vpnEnabled: vpnSettings?.enabled || false
    });
  }

  // Check date window
  const now = new Date();
  if (collector.opensAt && now < collector.opensAt) {
    return {
      canProceed: false,
      reason: 'NOT_YET_OPEN',
      message: 'This survey is not yet open'
    };
  }

  if (collector.closesAt && now > collector.closesAt) {
    return {
      canProceed: false,
      reason: 'ALREADY_CLOSED',
      message: 'This survey has closed'
    };
  }

  // Check response cap
  if (collector.maxResponses) {
    const responseCount = await prisma.surveySession.count({
      where: {
        collectorId: collector.id,
        status: { in: ['COMPLETED', 'IN_PROGRESS'] }
      }
    });

    if (responseCount >= collector.maxResponses) {
      return {
        canProceed: false,
        reason: 'QUOTA_REACHED',
        message: 'This survey has reached its response limit'
      };
    }
  }

  // Check survey target (hard close)
  if (collector.survey.target?.hardClose) {
    const completedCount = await prisma.surveySession.count({
      where: {
        surveyId: collector.surveyId,
        status: 'COMPLETED'
      }
    });

    if (completedCount >= collector.survey.target.totalN) {
      return {
        canProceed: false,
        reason: 'SURVEY_CLOSED',
        message: 'This survey has reached its target number of responses'
      };
    }
  }

  // Check for closing soon (soft close)
  let closingSoon = false;
  if (collector.survey.target?.softCloseN) {
    const completedCount = await prisma.surveySession.count({
      where: {
        surveyId: collector.surveyId,
        status: 'COMPLETED'
      }
    });

    if (completedCount >= collector.survey.target.softCloseN) {
      closingSoon = true;
    }
  }

  // Type-specific checks
  if (collector.type === 'SINGLE_USE') {
    const tokenResult = await checkSingleUseToken(prisma, collector.id, token);
    if (!tokenResult.canProceed) {
      return tokenResult;
    }
  }

  // Check device restrictions
  if (!collector.allowMultiplePerDevice) {
    const deviceId = generateDeviceFingerprint(userAgent, ip);
    const existingSession = await prisma.surveySession.findFirst({
      where: {
        collectorId: collector.id,
        meta: {
          path: ['deviceId'],
          equals: deviceId
        },
        status: { in: ['COMPLETED', 'IN_PROGRESS'] }
      }
    });

    if (existingSession) {
      // If there's an IN_PROGRESS session, allow resumption by returning the existing session
      if (existingSession.status === 'IN_PROGRESS') {
        return {
          canProceed: true,
          collector,
          existingSession,
          message: 'Resuming existing session'
        };
      }
      
      // If there's a COMPLETED session, block with device limit
      return {
        canProceed: false,
        reason: 'DEVICE_LIMIT',
        message: 'You have already responded to this survey'
      };
    }
  }

  return {
    canProceed: true,
    collector: {
      id: collector.id,
      name: collector.name,
      type: collector.type,
      status: collector.status,
      surveyId: collector.surveyId,
      tenantId: collector.tenantId,
      allowTest: collector.allowTest
    },
    closingSoon
  };
}

/**
 * Check VPN status and determine if user should be blocked
 */
export async function checkVpnStatus(
  ip: string,
  userAgent: string,
  referrer: string,
  vpnSettings: {
    blockThreshold?: number;
    challengeThreshold?: number;
    allowPrivateIPs?: boolean;
    blockVPN?: boolean;
    blockProxy?: boolean;
    blockTor?: boolean;
    blockHosting?: boolean;
    customMessage?: string;
  } = {}
): Promise<{
  canProceed: boolean;
  reason?: 'VPN_BLOCKED' | 'VPN_CHALLENGE';
  message?: string;
  vpnStatus?: {
    blocked: boolean;
    riskScore?: number;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    action?: 'ALLOW' | 'CHALLENGE' | 'BLOCK';
    reasons?: string[];
  };
}> {
  console.log('🔍 [ADMISSION] Checking VPN status for IP:', ip);
  
  try {
    // Perform geo lookup with VPN detection
    const geoData = await lookupIp(ip);
    
    if (!geoData || !geoData.riskScore) {
      console.log('ℹ️ [ADMISSION] No risk data available, allowing access');
      return {
        canProceed: true,
        vpnStatus: {
          blocked: false,
          riskScore: 0,
          riskLevel: 'LOW',
          action: 'ALLOW',
          reasons: ['No risk data available']
        }
      };
    }
    
    // Apply custom settings to risk scoring
    const adjustedRiskScore = adjustRiskScore(geoData.riskScore, vpnSettings);
    
    const blockThreshold = vpnSettings.blockThreshold || 85;
    const challengeThreshold = vpnSettings.challengeThreshold || 60;
    
    console.log('📊 [ADMISSION] Risk assessment completed:', {
      ip,
      originalScore: geoData.riskScore.score,
      adjustedScore: adjustedRiskScore.score,
      riskLevel: adjustedRiskScore.level,
      blockThreshold,
      challengeThreshold,
      reasons: adjustedRiskScore.reasons
    });
    
    // Check if user should be blocked based on custom thresholds
    if (adjustedRiskScore.score >= blockThreshold) {
      console.log('🚫 [ADMISSION] User BLOCKED due to high risk score:', adjustedRiskScore.score);
      return {
        canProceed: false,
        reason: 'VPN_BLOCKED',
        message: vpnSettings.customMessage || 'Sorry, this survey cannot be accessed using VPN, proxy, or Tor networks. Please use a regular internet connection to participate.',
        vpnStatus: {
          blocked: true,
          riskScore: adjustedRiskScore.score,
          riskLevel: adjustedRiskScore.level,
          action: 'BLOCK',
          reasons: adjustedRiskScore.reasons
        }
      };
    }
    
    if (adjustedRiskScore.score >= challengeThreshold) {
      console.log('⚠️ [ADMISSION] User requires CHALLENGE due to medium risk score:', adjustedRiskScore.score);
      return {
        canProceed: false,
        reason: 'VPN_CHALLENGE',
        message: 'We need to verify your connection. Please complete the verification step to continue with the survey.',
        vpnStatus: {
          blocked: false,
          riskScore: adjustedRiskScore.score,
          riskLevel: adjustedRiskScore.level,
          action: 'CHALLENGE',
          reasons: adjustedRiskScore.reasons
        }
      };
    }
    
    console.log('✅ [ADMISSION] User ALLOWED - Risk score acceptable:', adjustedRiskScore.score);
    return {
      canProceed: true,
      vpnStatus: {
        blocked: false,
        riskScore: adjustedRiskScore.score,
        riskLevel: adjustedRiskScore.level,
        action: 'ALLOW',
        reasons: adjustedRiskScore.reasons
      }
    };
    
  } catch (error) {
    console.error('❌ [ADMISSION] VPN status check failed for IP:', ip, 'Error:', error);
    // On error, allow access but log the issue
    return {
      canProceed: true,
      vpnStatus: {
        blocked: false,
        riskScore: 0,
        riskLevel: 'LOW',
        action: 'ALLOW',
        reasons: ['VPN check failed - allowing access']
      }
    };
  }
}

/**
 * Adjust risk score based on custom VPN settings
 */
function adjustRiskScore(originalScore: any, vpnSettings: any): any {
  let adjustedScore = { ...originalScore };
  
  // If specific detection types are disabled, reduce their impact
  if (!vpnSettings.blockVPN && originalScore.reasons?.includes('VPN detected')) {
    adjustedScore.score -= 30;
    adjustedScore.reasons = adjustedScore.reasons.filter((r: string) => r !== 'VPN detected');
  }
  
  if (!vpnSettings.blockProxy && originalScore.reasons?.includes('Proxy detected')) {
    adjustedScore.score -= 25;
    adjustedScore.reasons = adjustedScore.reasons.filter((r: string) => r !== 'Proxy detected');
  }
  
  if (!vpnSettings.blockTor && originalScore.reasons?.includes('Tor detected')) {
    adjustedScore.score -= 35;
    adjustedScore.reasons = adjustedScore.reasons.filter((r: string) => r !== 'Tor detected');
  }
  
  if (!vpnSettings.blockHosting && originalScore.reasons?.includes('Hosting provider detected')) {
    adjustedScore.score -= 20;
    adjustedScore.reasons = adjustedScore.reasons.filter((r: string) => r !== 'Hosting provider detected');
  }
  
  // Ensure score doesn't go below 0
  adjustedScore.score = Math.max(0, adjustedScore.score);
  
  // Recalculate risk level based on adjusted score
  if (adjustedScore.score >= 85) adjustedScore.level = 'CRITICAL';
  else if (adjustedScore.score >= 60) adjustedScore.level = 'HIGH';
  else if (adjustedScore.score >= 30) adjustedScore.level = 'MEDIUM';
  else adjustedScore.level = 'LOW';
  
  return adjustedScore;
}

/**
 * Check single-use token validity
 */
async function checkSingleUseToken(
  prisma: PrismaClient,
  collectorId: string,
  token?: string
): Promise<AdmissionResult> {
  if (!token) {
    return {
      canProceed: false,
      reason: 'INVALID_TOKEN',
      message: 'Access token is required'
    };
  }

  const invite = await prisma.collectorInvite.findFirst({
    where: {
      collectorId,
      token,
      status: 'active'
    }
  });

  if (!invite) {
    return {
      canProceed: false,
      reason: 'INVALID_TOKEN',
      message: 'Invalid access token'
    };
  }

  // Check if token is expired
  if (invite.expiresAt && new Date() > invite.expiresAt) {
    // Mark as expired
    await prisma.collectorInvite.update({
      where: { id: invite.id },
      data: { status: 'expired' }
    });

    return {
      canProceed: false,
      reason: 'TOKEN_EXPIRED',
      message: 'Access token has expired'
    };
  }

  // Check if token has already been used
  if (invite.consumedAt) {
    return {
      canProceed: false,
      reason: 'TOKEN_USED',
      message: 'This access link has already been used'
    };
  }

  return { canProceed: true };
}

/**
 * Create session metadata for tracking
 */
export async function createSessionMetadata(
  collectorId: string,
  inviteId: string | undefined,
  userAgent: string,
  ip: string,
  referrer: string,
  utmParams: Record<string, string>
): Promise<SessionMetadata> {
  // Parse user agent information
  const userAgentInfo = parseUserAgent(userAgent);
  
  // Parse UTM parameters
  const parsedUtmParams = parseUtmParams(utmParams);
  
  // Get referrer domain
  const referrerDomain = getReferrerDomain(referrer);
  
  // Perform geo lookup (async)
  const geoData = await lookupIp(ip);
  
  return {
    collectorId,
    inviteId,
    deviceId: generateDeviceFingerprint(userAgent, ip),
    ip,
    referrer: referrer || undefined,
    referrerDomain,
    utmParams: parsedUtmParams,
    userAgent,
    userAgentInfo,
    geoData: geoData || undefined,
    source: 'web' // Could be 'mobile', 'api', etc.
  };
}

/**
 * Mark a single-use token as consumed
 */
export async function consumeToken(
  prisma: PrismaClient,
  collectorId: string,
  token: string
): Promise<void> {
  await prisma.collectorInvite.updateMany({
    where: {
      collectorId,
      token,
      status: 'active'
    },
    data: {
      consumedAt: new Date(),
      status: 'used'
    }
  });
}

/**
 * Check if a session can continue (for existing sessions)
 */
export async function checkSessionContinuation(
  prisma: PrismaClient,
  sessionId: string
): Promise<AdmissionResult> {
  const session = await prisma.surveySession.findUnique({
    where: { id: sessionId },
    include: {
      collector: {
        include: {
          survey: {
            include: {
              target: true
            }
          }
        }
      }
    }
  });

  if (!session || !session.collector) {
    return {
      canProceed: false,
      reason: 'COLLECTOR_NOT_FOUND',
      message: 'Session not found'
    };
  }

  const collector = session.collector;

  // Check collector status
  if (collector.status !== 'active') {
    return {
      canProceed: false,
      reason: 'COLLECTOR_INACTIVE',
      message: 'This survey link is no longer active'
    };
  }

  // Check date window
  const now = new Date();
  if (collector.opensAt && now < collector.opensAt) {
    return {
      canProceed: false,
      reason: 'NOT_YET_OPEN',
      message: 'This survey is not yet open'
    };
  }

  if (collector.closesAt && now > collector.closesAt) {
    return {
      canProceed: false,
      reason: 'ALREADY_CLOSED',
      message: 'This survey has closed'
    };
  }

  // Check survey target
  if (collector.survey.target?.hardClose) {
    const completedCount = await prisma.surveySession.count({
      where: {
        surveyId: collector.surveyId,
        status: 'COMPLETED'
      }
    });

    if (completedCount >= collector.survey.target.totalN) {
      return {
        canProceed: false,
        reason: 'SURVEY_CLOSED',
        message: 'This survey has reached its target number of responses'
      };
    }
  }

  return {
    canProceed: true,
    collector: {
      id: collector.id,
      name: collector.name,
      type: collector.type,
      status: collector.status,
      surveyId: collector.surveyId,
      tenantId: collector.tenantId,
      allowTest: collector.allowTest
    }
  };
}

/**
 * Get collector statistics for monitoring
 */
export async function getCollectorAdmissionStats(
  prisma: PrismaClient,
  collectorId: string
): Promise<{
  totalAttempts: number;
  successfulAdmissions: number;
  rejectedAdmissions: number;
  rejectionReasons: Record<string, number>;
}> {
  // This would typically be tracked in a separate analytics table
  // For now, we'll use session data as a proxy
  
  const sessions = await prisma.surveySession.findMany({
    where: { collectorId },
    select: { status: true, meta: true }
  });

  const totalAttempts = sessions.length;
  const successfulAdmissions = sessions.filter(s => s.status === 'IN_PROGRESS' || s.status === 'COMPLETED').length;
  const rejectedAdmissions = sessions.filter(s => s.status === 'TERMINATED').length;

  // Rejection reasons would need to be tracked separately
  const rejectionReasons: Record<string, number> = {};

  return {
    totalAttempts,
    successfulAdmissions,
    rejectedAdmissions,
    rejectionReasons
  };
}
