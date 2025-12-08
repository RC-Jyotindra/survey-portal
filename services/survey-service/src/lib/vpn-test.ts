/**
 * VPN Detection Test
 * 
 * Simple test to verify VPN detection functionality
 */

import { fetchIpRiskIpqs, computeRiskScore, shouldBlockIP } from './vpn-detection';
import { lookupIp } from './geo';

async function testVpnDetection() {
  console.log('🧪 [TEST] Starting VPN detection test...');
  
  // Test with a known VPN IP (example)
  const testIPs = [
    '8.8.8.8', // Google DNS (should be clean)
    '1.1.1.1', // Cloudflare DNS (should be clean)
    '::1',     // Localhost (should be skipped)
    '127.0.0.1' // Localhost (should be skipped)
  ];
  
  for (const ip of testIPs) {
    console.log(`\n🔍 [TEST] Testing IP: ${ip}`);
    
    try {
      // Test direct IPQS lookup
      const ipqsData = await fetchIpRiskIpqs(ip);
      console.log('📊 [TEST] IPQS Data:', ipqsData);
      
      if (ipqsData) {
        // Test risk scoring
        const riskScore = computeRiskScore(ipqsData);
        console.log('🎯 [TEST] Risk Score:', riskScore);
        
        // Test blocking decision
        const blockDecision = shouldBlockIP(riskScore);
        console.log('🚫 [TEST] Block Decision:', blockDecision);
      }
      
      // Test full geo lookup with VPN detection
      const geoData = await lookupIp(ip);
      console.log('🌍 [TEST] Geo Data with VPN:', {
        ip: geoData?.ip,
        country: geoData?.country,
        city: geoData?.city,
        vpn: geoData?.ipRisk?.vpn,
        proxy: geoData?.ipRisk?.proxy,
        tor: geoData?.ipRisk?.tor,
        fraudScore: geoData?.ipRisk?.fraudScore,
        riskScore: geoData?.riskScore?.score,
        riskLevel: geoData?.riskScore?.level,
        action: geoData?.riskScore?.action
      });
      
    } catch (error) {
      console.error('❌ [TEST] Error testing IP:', ip, error);
    }
  }
  
  console.log('\n✅ [TEST] VPN detection test completed!');
}

// Run test if this file is executed directly
if (require.main === module) {
  testVpnDetection().catch(console.error);
}

export { testVpnDetection };
