# VPN Detection Implementation

## 🚀 **Overview**

We've successfully integrated IPQS VPN/proxy detection into the survey service to block suspicious users from filling surveys. The implementation includes comprehensive logging and risk scoring.

## 📁 **Files Created/Modified**

### **New Files:**
1. **`src/lib/vpn-detection.ts`** - Core VPN detection logic
2. **`src/lib/vpn-test.ts`** - Test file for VPN detection
3. **`VPN_DETECTION_IMPLEMENTATION.md`** - This documentation

### **Modified Files:**
1. **`src/lib/geo.ts`** - Extended with VPN detection integration
2. **`src/collectors/admission.ts`** - Added VPN blocking to admission flow

## 🔧 **Key Features**

### **1. VPN Detection Service (`vpn-detection.ts`)**
- **IPQS API Integration**: Fetches risk data from IPQS
- **Risk Scoring**: Computes 0-100 risk score based on multiple factors
- **Blocking Logic**: Determines ALLOW/CHALLENGE/BLOCK actions
- **Comprehensive Logging**: Detailed logs for debugging

### **2. Risk Scoring Algorithm**
```typescript
// Risk factors and weights:
- IPQS Fraud Score: 40% weight
- VPN Detection: +30 points
- Proxy Detection: +25 points  
- Tor Detection: +35 points
- Hosting Provider: +20 points
- Suspicious User Agent: +10 points
- Suspicious Referrer: +5 points
```

### **3. Action Thresholds**
- **BLOCK**: Risk score ≥ 85 (configurable via `VPN_BLOCK_THRESHOLD`)
- **CHALLENGE**: Risk score ≥ 60 (configurable via `VPN_CHALLENGE_THRESHOLD`)
- **ALLOW**: Risk score < 60

### **4. Geo Integration**
- **Extended `GeoResult` type** with `ipRisk` and `riskScore` fields
- **Automatic VPN detection** for all IP lookups
- **Private IP handling** - skips VPN detection for localhost/private IPs

### **5. Admission Integration**
- **New `checkVpnStatus()` function** for VPN blocking
- **Extended `AdmissionResult`** with VPN status information
- **User-friendly error messages** for blocked users

## 🌐 **Environment Variables Required**

```bash
IPQS_KEY=your_ipqs_api_key
IPQS_STRICTNESS=1
IPQS_ALLOW_PUBLIC=1
VPN_BLOCK_THRESHOLD=85
VPN_CHALLENGE_THRESHOLD=60
```

## 📊 **Data Flow**

1. **User visits survey** → IP extracted
2. **Geo lookup** → MaxMind + IPQS API call
3. **Risk scoring** → Compute 0-100 score
4. **Admission check** → Determine ALLOW/CHALLENGE/BLOCK
5. **Session creation** → Store risk data in metadata

## 🔍 **Logging Examples**

### **Successful VPN Detection:**
```
🔍 [VPN] Starting IPQS lookup for IP: 138.199.36.162
🌐 [VPN] Making IPQS API request to: https://ipqualityscore.com/api/json/ip/***/138.199.36.162
✅ [VPN] IPQS lookup successful: { vpn: true, proxy: false, tor: false, fraudScore: 85 }
🧮 [VPN] Computing risk score for IP: 138.199.36.162
📊 [VPN] Risk score computed: { score: 85, level: 'CRITICAL', action: 'BLOCK' }
🚫 [ADMISSION] User BLOCKED due to high risk score: 85
```

### **Clean IP (Allowed):**
```
🔍 [VPN] Starting IPQS lookup for IP: 8.8.8.8
✅ [VPN] IPQS lookup successful: { vpn: false, proxy: false, tor: false, fraudScore: 0 }
📊 [VPN] Risk score computed: { score: 0, level: 'LOW', action: 'ALLOW' }
✅ [ADMISSION] User ALLOWED - Risk score acceptable: 0
```

## 🚫 **Blocking Messages**

### **Blocked Users:**
> "Sorry, this survey cannot be accessed using VPN, proxy, or Tor networks. Please use a regular internet connection to participate."

### **Challenged Users:**
> "We need to verify your connection. Please complete the verification step to continue with the survey."

## 🧪 **Testing**

Run the test file to verify functionality:
```bash
cd services/survey-service
npx ts-node src/lib/vpn-test.ts
```

## 📈 **Monitoring**

### **Key Metrics to Monitor:**
- VPN detection rate
- False positive rate
- IPQS API response times
- Blocked vs allowed users

### **Log Patterns to Watch:**
- `🚫 [ADMISSION] User BLOCKED` - High-risk users blocked
- `⚠️ [ADMISSION] User requires CHALLENGE` - Medium-risk users
- `❌ [VPN] IPQS API error` - API failures
- `⏰ [VPN] IPQS API request timed out` - Timeout issues

## 🔧 **Configuration**

### **Adjusting Sensitivity:**
- **Lower `VPN_BLOCK_THRESHOLD`** (e.g., 70) = More aggressive blocking
- **Higher `VPN_BLOCK_THRESHOLD`** (e.g., 95) = Less aggressive blocking
- **Adjust `IPQS_STRICTNESS`** (0-2) for IPQS sensitivity

### **Handling False Positives:**
- Monitor logs for legitimate users being blocked
- Consider whitelisting specific IP ranges or ASNs
- Adjust risk scoring weights if needed

## 🚀 **Next Steps**

1. **Test with real VPN users** to verify blocking
2. **Monitor false positive rate** and adjust thresholds
3. **Implement CAPTCHA challenge** for medium-risk users
4. **Add analytics dashboard** for VPN detection metrics
5. **Consider caching** for frequently accessed IPs

## ⚠️ **Important Notes**

- **Private IPs are always allowed** (localhost, 192.168.x.x, etc.)
- **API failures default to allowing access** (fail-open approach)
- **Risk scoring is configurable** via environment variables
- **All VPN detection is logged** for debugging and monitoring
