/**
 * Test file for VPN Settings Implementation
 * This file tests the new configurable VPN detection feature
 */

import { checkVpnStatus } from '../collectors/admission';

// Test VPN settings configurations
const testVpnSettings = {
  enabled: true,
  blockThreshold: 85,
  challengeThreshold: 60,
  allowPrivateIPs: true,
  blockVPN: true,
  blockProxy: true,
  blockTor: true,
  blockHosting: false,
  customMessage: 'Custom blocking message for testing'
};

const testVpnSettingsDisabled = {
  enabled: false,
  blockThreshold: 85,
  challengeThreshold: 60,
  allowPrivateIPs: true,
  blockVPN: true,
  blockProxy: true,
  blockTor: true,
  blockHosting: false,
  customMessage: ''
};

const testVpnSettingsLenient = {
  enabled: true,
  blockThreshold: 50, // More lenient
  challengeThreshold: 30,
  allowPrivateIPs: true,
  blockVPN: false, // Don't block VPN
  blockProxy: true,
  blockTor: true,
  blockHosting: false,
  customMessage: 'Lenient settings test'
};

async function testVpnSettingsImplementation() {
  console.log('🧪 [VPN_TEST] Testing VPN Settings Implementation...\n');

  // Test 1: VPN detection disabled (should allow all)
  console.log('📋 Test 1: VPN detection disabled');
  try {
    const result1 = await checkVpnStatus(
      '138.199.36.163', // Known VPN IP
      'Mozilla/5.0...',
      'https://example.com',
      testVpnSettingsDisabled
    );
    console.log('✅ Result:', result1.canProceed ? 'ALLOWED' : 'BLOCKED');
    console.log('   Expected: ALLOWED (VPN detection disabled)\n');
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
  }

  // Test 2: VPN detection enabled with default settings
  console.log('📋 Test 2: VPN detection enabled (default settings)');
  try {
    const result2 = await checkVpnStatus(
      '138.199.36.163', // Known VPN IP
      'Mozilla/5.0...',
      'https://example.com',
      testVpnSettings
    );
    console.log('✅ Result:', result2.canProceed ? 'ALLOWED' : 'BLOCKED');
    console.log('   Reason:', result2.reason);
    console.log('   Message:', result2.message);
    console.log('   Expected: BLOCKED (VPN detected)\n');
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
  }

  // Test 3: VPN detection enabled but VPN blocking disabled
  console.log('📋 Test 3: VPN detection enabled but VPN blocking disabled');
  try {
    const result3 = await checkVpnStatus(
      '138.199.36.163', // Known VPN IP
      'Mozilla/5.0...',
      'https://example.com',
      testVpnSettingsLenient
    );
    console.log('✅ Result:', result3.canProceed ? 'ALLOWED' : 'BLOCKED');
    console.log('   Reason:', result3.reason);
    console.log('   Expected: ALLOWED (VPN blocking disabled)\n');
  } catch (error) {
    console.error('❌ Test 3 failed:', error);
  }

  // Test 4: Clean IP with VPN detection enabled
  console.log('📋 Test 4: Clean IP with VPN detection enabled');
  try {
    const result4 = await checkVpnStatus(
      '8.8.8.8', // Google DNS (clean IP)
      'Mozilla/5.0...',
      'https://example.com',
      testVpnSettings
    );
    console.log('✅ Result:', result4.canProceed ? 'ALLOWED' : 'BLOCKED');
    console.log('   Expected: ALLOWED (clean IP)\n');
  } catch (error) {
    console.error('❌ Test 4 failed:', error);
  }

  console.log('🎉 VPN Settings Implementation Test Complete!');
}

// Export for use in other test files
export { testVpnSettingsImplementation, testVpnSettings, testVpnSettingsDisabled, testVpnSettingsLenient };

// Run tests if this file is executed directly
if (require.main === module) {
  testVpnSettingsImplementation().catch(console.error);
}
