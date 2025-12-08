/**
 * Geo Location Service
 * 
 * Handles IP geolocation using MaxMind databases with fallback to ip-api.com
 * Provides country, city, region, and coordinates for IP addresses
 */

import path from 'path';
import maxmind from 'maxmind';
import fetch from 'node-fetch';
import { fetchIpRiskIpqs, computeRiskScore, IpqsRisk } from './vpn-detection';

// Go up one level from services/survey-service to the project root
const PROJECT_ROOT = path.join(process.cwd(), '..', '..');
const DB_DIR = path.join(PROJECT_ROOT, 'data');
const CITY_DB = path.join(DB_DIR, 'city', 'GeoLite2-City.mmdb');
const COUNTRY_DB = path.join(DB_DIR, 'country', 'GeoLite2-Country.mmdb');

// Log the paths on module load
console.log('🗂️ [GEO] Module loaded - Paths configured:');
console.log('📂 [GEO] Current working directory:', process.cwd());
console.log('📁 [GEO] Project root directory:', PROJECT_ROOT);
console.log('📁 [GEO] Database directory:', DB_DIR);
console.log('🏙️ [GEO] City database path:', CITY_DB);
console.log('🌍 [GEO] Country database path:', COUNTRY_DB);

let cityReader: any = null;
let countryReader: any = null;

export type GeoResult = {
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

/**
 * Initialize MaxMind database readers
 */
export async function initMaxmind(): Promise<void> {
  try {
    console.log('🔍 [GEO] Initializing MaxMind databases...');
    console.log('📁 [GEO] Database directory:', DB_DIR);
    console.log('🏙️ [GEO] City database path:', CITY_DB);
    console.log('🌍 [GEO] Country database path:', COUNTRY_DB);
    
    if (!cityReader) {
      console.log('🔍 [GEO] Checking city database...');
      if (await fileExists(CITY_DB)) {
        console.log('📖 [GEO] Loading city database...');
        cityReader = await maxmind.open(CITY_DB);
        console.log('✅ [GEO] City database loaded successfully:', CITY_DB);
      } else {
        console.log('⚠️ [GEO] City database not found, skipping...');
      }
    } else {
      console.log('ℹ️ [GEO] City database already loaded');
    }
    
    if (!countryReader) {
      console.log('🔍 [GEO] Checking country database...');
      if (await fileExists(COUNTRY_DB)) {
        console.log('📖 [GEO] Loading country database...');
        countryReader = await maxmind.open(COUNTRY_DB);
        console.log('✅ [GEO] Country database loaded successfully:', COUNTRY_DB);
      } else {
        console.log('⚠️ [GEO] Country database not found, skipping...');
      }
    } else {
      console.log('ℹ️ [GEO] Country database already loaded');
    }
    
    console.log('🏁 [GEO] MaxMind initialization complete');
  } catch (error) {
    console.error('❌ [GEO] Failed to initialize MaxMind databases:', error);
  }
}

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    const fs = await import('fs');
    await fs.promises.access(filePath);
    console.log('✅ [GEO] File exists:', filePath);
    return true;
  } catch (error) {
    console.log('❌ [GEO] File not found:', filePath, 'Error:', error);
    return false;
  }
}

/**
 * Check if an IP address is in a private range
 */
function isPrivateIP(ip: string): boolean {
  // IPv4 private ranges
  const privateRanges = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./,              // 192.168.0.0/16
    /^127\./,                   // 127.0.0.0/8 (localhost)
    /^169\.254\./,              // 169.254.0.0/16 (link-local)
    /^0\./,                     // 0.0.0.0/8
  ];
  
  // IPv6 private ranges
  const privateIPv6Ranges = [
    /^::1$/,                    // IPv6 localhost
    /^fe80:/,                   // IPv6 link-local
    /^fc00:/,                   // IPv6 unique local
    /^fd00:/,                   // IPv6 unique local
  ];
  
  // Check IPv4 private ranges
  for (const range of privateRanges) {
    if (range.test(ip)) {
      return true;
    }
  }
  
  // Check IPv6 private ranges
  for (const range of privateIPv6Ranges) {
    if (range.test(ip)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Lookup IP address for geolocation data
 */
export async function lookupIp(ip: string): Promise<GeoResult | null> {
  console.log('🔍 [GEO] Starting IP lookup for:', ip);
  
  // Check for localhost/private IPs
  if (!ip || ip === '::1' || ip === '127.0.0.1') {
    console.log('ℹ️ [GEO] Skipping geo lookup for localhost/private IP:', ip);
    return {
      ip,
      source: 'none',
      lookupTime: new Date()
    };
  }
  
  // Check for private IP ranges
  if (isPrivateIP(ip)) {
    console.log('ℹ️ [GEO] Skipping geo lookup for private IP range:', ip);
    return {
      ip,
      source: 'none',
      lookupTime: new Date()
    };
  }

  // Ensure maxmind readers are loaded
  console.log('🔄 [GEO] Ensuring MaxMind databases are loaded...');
  await initMaxmind();

  // Try City DB first (more detailed)
  try {
    if (cityReader) {
      console.log('🏙️ [GEO] Attempting city database lookup for:', ip);
      const record = cityReader.get(ip);
      if (record) {
        const result: GeoResult = {
          ip,
          country: record?.country?.names?.en,
          countryCode: record?.country?.iso_code,
          region: record?.subdivisions?.[0]?.names?.en,
          regionCode: record?.subdivisions?.[0]?.iso_code,
          city: record?.city?.names?.en,
          latitude: record?.location?.latitude,
          longitude: record?.location?.longitude,
          timezone: record?.location?.time_zone,
          source: 'maxmind',
          lookupTime: new Date()
        };
        
        console.log('✅ [GEO] MaxMind city lookup successful:', { 
          ip, 
          country: result.country, 
          city: result.city,
          region: result.region,
          coordinates: result.latitude && result.longitude ? `${result.latitude},${result.longitude}` : 'N/A'
        });
        
        // Add VPN detection
        await enrichWithVpnData(result);
        return result;
      } else {
        console.log('ℹ️ [GEO] No city data found in MaxMind city database for:', ip);
      }
    } else {
      console.log('⚠️ [GEO] City database not available, skipping city lookup');
    }

    // Fallback to Country DB
    if (countryReader) {
      console.log('🌍 [GEO] Attempting country database lookup for:', ip);
      const record = countryReader.get(ip);
      if (record) {
        const result: GeoResult = {
          ip,
          country: record?.country?.names?.en,
          countryCode: record?.country?.iso_code,
          source: 'maxmind',
          lookupTime: new Date()
        };
        
        console.log('✅ [GEO] MaxMind country lookup successful:', { 
          ip, 
          country: result.country,
          countryCode: result.countryCode
        });
        
        // Add VPN detection
        await enrichWithVpnData(result);
        return result;
      } else {
        console.log('ℹ️ [GEO] No country data found in MaxMind country database for:', ip);
      }
    } else {
      console.log('⚠️ [GEO] Country database not available, skipping country lookup');
    }
  } catch (error) {
    console.warn('❌ [GEO] MaxMind lookup error:', error);
  }

  // Fallback to public API (ip-api.com)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,region,city,lat,lon,timezone`, { 
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json() as any;
      if (data?.status === 'success') {
        const result: GeoResult = {
          ip,
          country: data.country,
          countryCode: data.countryCode,
          region: data.regionName,
          regionCode: data.region,
          city: data.city,
          latitude: data.lat,
          longitude: data.lon,
          timezone: data.timezone,
          source: 'fallback',
          lookupTime: new Date()
        };
        
        console.log('✅ [GEO] Fallback API lookup successful:', { 
          ip, 
          country: result.country, 
          city: result.city,
          region: result.region,
          coordinates: result.latitude && result.longitude ? `${result.latitude},${result.longitude}` : 'N/A'
        });
        
        // Add VPN detection
        await enrichWithVpnData(result);
        return result;
      }
    }
  } catch (error) {
    console.warn('⚠️ [GEO] Fallback API lookup error:', error);
  }

  // No result found
  const result: GeoResult = {
    ip,
    source: 'none',
    lookupTime: new Date()
  };
  
  console.log('🌍 [GEO] No geo data found for IP:', ip);
  
  // Add VPN detection to all results (including private IPs)
  await enrichWithVpnData(result);
  
  return result;
}

/**
 * Enrich GeoResult with VPN detection data
 */
async function enrichWithVpnData(result: GeoResult): Promise<void> {
  console.log('🔍 [GEO] Enriching geo result with VPN detection for IP:', result.ip);
  
  try {
    // Skip VPN detection for private IPs
    if (isPrivateIP(result.ip)) {
      console.log('ℹ️ [GEO] Skipping VPN detection for private IP:', result.ip);
      return;
    }
    
    // Fetch IPQS risk data
    const ipqsData = await fetchIpRiskIpqs(result.ip);
    
    if (ipqsData) {
      // Add IPQS risk data
      result.ipRisk = {
        vpn: ipqsData.vpn,
        proxy: ipqsData.proxy,
        tor: ipqsData.tor,
        hosting: ipqsData.hosting,
        fraudScore: ipqsData.fraudScore,
        isp: ipqsData.isp,
        organization: ipqsData.organization,
        asn: ipqsData.asn,
        mobile: ipqsData.mobile,
        queryTime: ipqsData.queryTime
      };
      
      // Compute risk score
      const riskScore = computeRiskScore(ipqsData, {
        isPrivateIP: isPrivateIP(result.ip),
        isLocalhost: result.ip === '::1' || result.ip === '127.0.0.1'
      });
      
      result.riskScore = riskScore;
      
      console.log('✅ [GEO] VPN detection completed for IP:', result.ip, {
        vpn: result.ipRisk.vpn,
        proxy: result.ipRisk.proxy,
        tor: result.ipRisk.tor,
        fraudScore: result.ipRisk.fraudScore,
        riskScore: result.riskScore.score,
        action: result.riskScore.action
      });
    } else {
      console.log('⚠️ [GEO] No IPQS data available for IP:', result.ip);
    }
  } catch (error) {
    console.error('❌ [GEO] VPN detection failed for IP:', result.ip, 'Error:', error);
  }
}

/**
 * Get user agent information
 */
export function parseUserAgent(userAgent: string): {
  browser?: string;
  os?: string;
  device?: string;
  isMobile: boolean;
  isBot: boolean;
} {
  if (!userAgent) {
    return { isMobile: false, isBot: false };
  }

  const ua = userAgent.toLowerCase();
  
  // Detect mobile devices
  const isMobile = /mobile|android|iphone|ipad|tablet|blackberry|windows phone/i.test(ua);
  
  // Detect bots
  const isBot = /bot|crawler|spider|scraper|facebookexternalhit|twitterbot|linkedinbot/i.test(ua);
  
  // Detect browser (order matters - check specific browsers first)
  let browser: string | undefined;
  if (ua.includes('edg/')) browser = 'Edge'; // Edge has "Edg/" in user agent
  else if (ua.includes('opr/') || ua.includes('opera')) browser = 'Opera';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('safari')) browser = 'Safari';
  else if (ua.includes('msie') || ua.includes('trident')) browser = 'Internet Explorer';
  
  // Detect OS
  let os: string | undefined;
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
  
  // Detect device type
  let device: string | undefined;
  if (ua.includes('mobile')) device = 'Mobile';
  else if (ua.includes('tablet') || ua.includes('ipad')) device = 'Tablet';
  else if (ua.includes('desktop')) device = 'Desktop';
  else device = isMobile ? 'Mobile' : 'Desktop';
  
  return {
    browser,
    os,
    device,
    isMobile,
    isBot
  };
}

/**
 * Parse UTM parameters from URL or query params
 */
export function parseUtmParams(urlOrParams: string | Record<string, string>): Record<string, string> {
  const utmParams: Record<string, string> = {};
  
  if (typeof urlOrParams === 'string') {
    try {
      const url = new URL(urlOrParams);
      const params = new URLSearchParams(url.search);
      
      const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
      for (const key of utmKeys) {
        const value = params.get(key);
        if (value) {
          utmParams[key] = value;
        }
      }
    } catch (error) {
      console.warn('⚠️ [GEO] Failed to parse UTM params from URL:', error);
    }
  } else {
    // Direct params object
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    for (const key of utmKeys) {
      if (urlOrParams[key]) {
        utmParams[key] = urlOrParams[key];
      }
    }
  }
  
  return utmParams;
}

/**
 * Get referrer domain from referrer URL
 */
export function getReferrerDomain(referrer: string): string | undefined {
  if (!referrer) return undefined;
  
  try {
    const url = new URL(referrer);
    return url.hostname;
  } catch {
    return undefined;
  }
}
