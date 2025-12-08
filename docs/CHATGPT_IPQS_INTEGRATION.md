## Short doc for Cursor (what to add where and why)
Files to add / edit

1. Edit `src/services/.../geo.ts` (your existing file) — paste the patched file above (or merge the fetchIpRiskIpqs, IpqsRisk, computeRiskScore, and the result.ipRisk / result.riskScore attachments into it).

2. No Redis required — we purposely left out caching to keep this minimal. (Later you can add caching in a separate ipqs-cache.ts.)

3. Env: add to `.env (or deployment env)`:

`IPQS_KEY=your_ipqs_api_key
IPQS_STRICTNESS=1
IPQS_ALLOW_PUBLIC=1
VPN_BLOCK_THRESHOLD=85
VPN_CHALLENGE_THRESHOLD=60`

4. Admission integration: in admission.ts where you call createSessionMetadata(...) or lookupIp(ip), use the returned geoData.riskScore (or geoData.ipRisk) to decide action (allow / challenge / block). Example snippet below.

### Where to call
- Keep calling lookupIp(ip) exactly where you already do in createSessionMetadata. The patched lookupIp now also performs IPQS enrichment and returns geoData.ipRisk and geoData.riskScore.

- Admission: after you get sessionMeta, evaluate:
```
const score = sessionMeta.geoData?.riskScore ?? 0;
if (score >= Number(process.env.VPN_BLOCK_THRESHOLD || 85)) {
  // block
} else if (score >= Number(process.env.VPN_CHALLENGE_THRESHOLD || 60)) {
  // challenge with captcha
} else {
  // proceed
}
```

## What each piece does (summary)
- fetchIpRiskIpqs(ip): calls IPQS API and returns flags (vpn, proxy, tor, hosting) and fraudScore. No caching here.

- computeRiskScore(...): maps IPQS flags + fraud_score + optional local signals into a single 0-100 score.

- lookupIp(ip): loads MaxMind → fallback → attaches ipqs enrichment and riskScore to the GeoResult.

- admission.ts policy: inspects riskScore and returns allow / challenge / block decisions.

Explanation: IPQS strictness and thresholds
IPQS strictness (env: IPQS_STRICTNESS)

strictness is an IPQS query parameter that controls how conservative IPQS is about labeling IPs as VPN/proxy/hosting. Typical values:

0 — lenient. IPQS will be less aggressive; fewer false positives, but some VPN/proxy traffic may not be flagged.

1 — default / balanced. Good trade-off between detection and false positives.

2 — strict. Aggressive detection; catches more VPN/proxy, but increases false positives (may flag corporate NAT, some mobile carrier NATs, or aggressive privacy setups).

Use 1 to start. If you see too many false positives, reduce to 0. If you see many bypasses, consider 2 but be ready to handle legitimate users flagged.

Note: the exact internal behavior is IPQS proprietary; think of strictness as a sensitivity knob.

VPN_BLOCK_THRESHOLD and VPN_CHALLENGE_THRESHOLD

These are numeric thresholds applied to your computed riskScore (0–100):

VPN_CHALLENGE_THRESHOLD (e.g., 60): if riskScore >= challengeThreshold and < blockThreshold, take a soft action — present CAPTCHA (Cloudflare Turnstile) to verify the visitor is human. If CAPTCHA passes, allow. If fails or suspicious, escalate (SMS OTP or block).

VPN_BLOCK_THRESHOLD (e.g., 85): if riskScore >= blockThreshold, take a hard action — either block the session or require a higher-friction verification (SMS OTP). Use this only for surveys where fraud cost is high.

Examples:

riskScore = 25 → allow

riskScore = 65 → show CAPTCHA

riskScore = 90 → require SMS OTP or block

Tuning advice

Start with challengeThreshold = 60, blockThreshold = 85. Monitor false positives for a week and adjust.

Log every challenged/blocked attempt (IP, ASN, geo, ipqs flags) so you can whitelist legitimate ASNs or IP ranges.