/**
 * VPN Detection Service
 * 
 * Handles VPN/proxy detection using IPQS API
 * Provides risk scoring and blocking capabilities for survey respondents
 */

export interface IpqsRisk {
  ip: string;
  vpn: boolean;
  proxy: boolean;
  tor: boolean;
  hosting: boolean;
  fraudScore: number;
  country?: string;
  region?: string;
  city?: string;
  isp?: string;
  organization?: string;
  asn?: number;
  mobile?: boolean;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  zip?: string;
  queryTime: Date;
}

export interface RiskScore {
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasons: string[];
  action: 'ALLOW' | 'CHALLENGE' | 'BLOCK';
}

/**
 * Fetch IP risk data from IPQS API
 */
export async function fetchIpRiskIpqs(ip: string): Promise<IpqsRisk | null> {
  const apiKey = process.env.IPQS_KEY;
  const strictness = process.env.IPQS_STRICTNESS || '1';
  const allowPublic = process.env.IPQS_ALLOW_PUBLIC || '1';
  
  if (!apiKey) {
    console.warn('⚠️ [VPN] IPQS_KEY not found in environment variables');
    return null;
  }

  console.log('🔍 [VPN] Starting IPQS lookup for IP:', ip);
  console.log('🔧 [VPN] Using strictness level:', strictness);
  console.log('🔧 [VPN] Allow public IPs:', allowPublic);

  try {
    const { default: fetch } = await import('node-fetch');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const url = `https://ipqualityscore.com/api/json/ip/${apiKey}/${ip}?strictness=${strictness}&allow_public_access_points=${allowPublic}&fast=true`;
    
    console.log('🌐 [VPN] Making IPQS API request to:', url.replace(apiKey, '***'));
    
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'SurveyService/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error('❌ [VPN] IPQS API error:', response.status, response.statusText);
      return null;
    }
    
    const data = await response.json() as any;
    
    if (data.success === false) {
      console.error('❌ [VPN] IPQS API returned error:', data.message);
      return null;
    }
    
    const result: IpqsRisk = {
      ip,
      vpn: data.vpn || false,
      proxy: data.proxy || false,
      tor: data.tor || false,
      hosting: data.hosting || false,
      fraudScore: data.fraud_score || 0,
      country: data.country_code,
      region: data.region,
      city: data.city,
      isp: data.ISP,
      organization: data.organization,
      asn: data.ASN,
      mobile: data.mobile,
      timezone: data.timezone,
      latitude: data.latitude,
      longitude: data.longitude,
      zip: data.zip_code,
      queryTime: new Date()
    };
    
    console.log('✅ [VPN] IPQS lookup successful:', {
      ip: result.ip,
      vpn: result.vpn,
      proxy: result.proxy,
      tor: result.tor,
      hosting: result.hosting,
      fraudScore: result.fraudScore,
      country: result.country,
      city: result.city,
      isp: result.isp
    });
    
    return result;
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('⏰ [VPN] IPQS API request timed out for IP:', ip);
    } else {
      console.error('❌ [VPN] IPQS API request failed for IP:', ip, 'Error:', error);
    }
    return null;
  }
}

/**
 * Compute risk score based on IPQS data and local signals
 */
export function computeRiskScore(ipqsData: IpqsRisk | null, localSignals: {
  isPrivateIP?: boolean;
  isLocalhost?: boolean;
  userAgentSuspicious?: boolean;
  referrerSuspicious?: boolean;
} = {}): RiskScore {
  console.log('🧮 [VPN] Computing risk score for IP:', ipqsData?.ip || 'unknown');
  
  if (!ipqsData) {
    console.log('ℹ️ [VPN] No IPQS data available, using default low risk score');
    return {
      score: 0,
      level: 'LOW',
      reasons: ['No IPQS data available'],
      action: 'ALLOW'
    };
  }
  
  let score = 0;
  const reasons: string[] = [];
  
  // IPQS fraud score (0-100)
  score += ipqsData.fraudScore * 0.4; // 40% weight
  if (ipqsData.fraudScore > 0) {
    reasons.push(`Fraud score: ${ipqsData.fraudScore}`);
  }
  
  // VPN detection (high risk)
  if (ipqsData.vpn) {
    score += 30;
    reasons.push('VPN detected');
  }
  
  // Proxy detection (medium-high risk)
  if (ipqsData.proxy) {
    score += 25;
    reasons.push('Proxy detected');
  }
  
  // Tor detection (high risk)
  if (ipqsData.tor) {
    score += 35;
    reasons.push('Tor network detected');
  }
  
  // Hosting provider (medium risk)
  if (ipqsData.hosting) {
    score += 20;
    reasons.push('Hosting provider detected');
  }
  
  // Local signals
  if (localSignals.isPrivateIP || localSignals.isLocalhost) {
    score = 0; // Override to 0 for private IPs
    reasons.push('Private IP address');
  }
  
  if (localSignals.userAgentSuspicious) {
    score += 10;
    reasons.push('Suspicious user agent');
  }
  
  if (localSignals.referrerSuspicious) {
    score += 5;
    reasons.push('Suspicious referrer');
  }
  
  // Cap score at 100
  score = Math.min(score, 100);
  
  // Determine risk level and action
  let level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  let action: 'ALLOW' | 'CHALLENGE' | 'BLOCK';
  
  if (score >= 85) {
    level = 'CRITICAL';
    action = 'BLOCK';
  } else if (score >= 60) {
    level = 'HIGH';
    action = 'CHALLENGE';
  } else if (score >= 50) {
    level = 'MEDIUM';
    action = 'CHALLENGE';
  } else {
    level = 'LOW';
    action = 'ALLOW';
  }
  
  const result: RiskScore = {
    score: Math.round(score),
    level,
    reasons,
    action
  };
  
  console.log('📊 [VPN] Risk score computed:', {
    ip: ipqsData.ip,
    score: result.score,
    level: result.level,
    action: result.action,
    reasons: result.reasons
  });
  
  return result;
}

/**
 * Check if IP should be blocked based on risk score
 */
export function shouldBlockIP(riskScore: RiskScore): {
  shouldBlock: boolean;
  reason?: string;
  action: 'ALLOW' | 'CHALLENGE' | 'BLOCK';
} {
  const blockThreshold = Number(process.env.VPN_BLOCK_THRESHOLD || 85);
  const challengeThreshold = Number(process.env.VPN_CHALLENGE_THRESHOLD || 60);
  
  console.log('🚫 [VPN] Checking if IP should be blocked:', {
    riskScore: riskScore.score,
    blockThreshold,
    challengeThreshold,
    currentAction: riskScore.action
  });
  
  if (riskScore.score >= blockThreshold) {
    console.log('🚫 [VPN] IP BLOCKED - Risk score too high:', riskScore.score);
    return {
      shouldBlock: true,
      reason: `High risk score: ${riskScore.score}. Reasons: ${riskScore.reasons.join(', ')}`,
      action: 'BLOCK'
    };
  }
  
  if (riskScore.score >= challengeThreshold) {
    console.log('⚠️ [VPN] IP CHALLENGED - Risk score requires verification:', riskScore.score);
    return {
      shouldBlock: false,
      reason: `Medium risk score: ${riskScore.score}. Requires verification.`,
      action: 'CHALLENGE'
    };
  }
  
  console.log('✅ [VPN] IP ALLOWED - Risk score acceptable:', riskScore.score);
  return {
    shouldBlock: false,
    reason: `Low risk score: ${riskScore.score}`,
    action: 'ALLOW'
  };
}

/**
 * Get user-friendly error message for blocked users
 */
export function getBlockedUserMessage(riskScore: RiskScore): string {
  if (riskScore.action === 'BLOCK') {
    return 'Sorry, this survey cannot be accessed using VPN, proxy, or Tor networks. Please use a regular internet connection to participate.';
  }
  
  if (riskScore.action === 'CHALLENGE') {
    return 'We need to verify your connection. Please complete the verification step to continue with the survey.';
  }
  
  return 'Access granted.';
}
