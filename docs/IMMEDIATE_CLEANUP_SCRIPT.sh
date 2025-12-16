#!/bin/bash
# IMMEDIATE CLEANUP SCRIPT - Run this NOW
# This script removes all identified malware from the system

set -e

echo "🚨 STARTING MALWARE CLEANUP..."
echo "⚠️  WARNING: This will stop all services and remove malware files"
echo ""

# Step 1: Stop all PM2 services
echo "1. Stopping all PM2 services..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Step 2: Kill malicious processes
echo "2. Killing malicious processes..."
pkill -9 -f cARM 2>/dev/null || true
pkill -9 -f cX86 2>/dev/null || true
pkill -9 -f ".b4nd1d0" 2>/dev/null || true
pkill -9 -f "05bf0e9b" 2>/dev/null || true
pkill -9 -f "c3pool" 2>/dev/null || true

# Step 3: Remove malware directories
echo "3. Removing malware directories..."
rm -rf /etc/de 2>/dev/null || true
rm -rf /tmp/.esd101 2>/dev/null || true
rm -rf /root/.local/share/.05bf0e9b 2>/dev/null || true
rm -rf /root/c3pool 2>/dev/null || true

# Step 4: Remove suspicious binaries from Next.js app directory
echo "4. Removing suspicious binaries from web app..."
cd /var/www/survey-portal/apps/web 2>/dev/null || cd /var/www/survey-portal/apps/web || exit 1
rm -rf i386 2>/dev/null || true
rm -rf amd64 2>/dev/null || true
rm -rf am64 2>/dev/null || true  # In case it's named am64 instead of amd64

# Step 5: Remove cron jobs
echo "5. Removing malicious cron jobs..."
crontab -r 2>/dev/null || true

# Step 6: Block malicious IP
echo "6. Blocking malicious IP address..."
iptables -A INPUT -s 5.231.31.52 -j DROP 2>/dev/null || true
iptables -A OUTPUT -d 5.231.31.52 -j DROP 2>/dev/null || true

# Step 7: Check for and remove systemd services
echo "7. Checking for malicious systemd services..."
systemctl stop 5168631990d6.service 2>/dev/null || true
systemctl disable 5168631990d6.service 2>/dev/null || true
rm -f /etc/systemd/system/5168631990d6.service 2>/dev/null || true
rm -f /etc/systemd/system/multi-user.target.wants/5168631990d6.service 2>/dev/null || true
systemctl daemon-reload 2>/dev/null || true

# Step 8: Verify processes are killed
echo "8. Verifying cleanup..."
echo "Checking for remaining malicious processes..."
if pgrep -f "cARM|cX86|.b4nd1d0|05bf0e9b|c3pool" > /dev/null; then
    echo "⚠️  WARNING: Some malicious processes may still be running"
    pgrep -af "cARM|cX86|.b4nd1d0|05bf0e9b|c3pool"
else
    echo "✅ No malicious processes found"
fi

# Step 9: Check for remaining malware files
echo "9. Checking for remaining malware files..."
if [ -d "/etc/de" ] || [ -d "/tmp/.esd101" ] || [ -d "/root/.local/share/.05bf0e9b" ] || [ -d "/root/c3pool" ]; then
    echo "⚠️  WARNING: Some malware directories may still exist"
    ls -la /etc/de 2>/dev/null || true
    ls -la /tmp/.esd101 2>/dev/null || true
    ls -la /root/.local/share/.05bf0e9b 2>/dev/null || true
    ls -la /root/c3pool 2>/dev/null || true
else
    echo "✅ Malware directories removed"
fi

# Step 10: Check for suspicious binaries in web directory
echo "10. Checking web directory for suspicious files..."
cd /var/www/survey-portal/apps/web 2>/dev/null || true
if [ -d "i386" ] || [ -d "amd64" ] || [ -d "am64" ]; then
    echo "⚠️  WARNING: Suspicious architecture directories still exist"
    ls -la i386 amd64 am64 2>/dev/null || true
else
    echo "✅ Suspicious binaries removed from web directory"
fi

echo ""
echo "✅ CLEANUP COMPLETE"
echo ""
echo "⚠️  IMPORTANT NEXT STEPS:"
echo "1. Review and restore legitimate cron jobs if needed"
echo "2. Update Next.js: cd /var/www/survey-portal/apps/web && npm update next@latest"
echo "3. Run: npm audit fix --force"
echo "4. Review all server actions and API routes for vulnerabilities"
echo "5. Rotate all secrets (JWT_SECRET, database passwords, etc.)"
echo "6. Do NOT restart services until you've patched Next.js"
echo ""
echo "Run this command to check for any remaining threats:"
echo "  ps aux | grep -E 'curl|wget|node.*\.js' | grep -v grep"
echo "  find /var/www/survey-portal/apps/web -name 'i386' -o -name 'amd64' -o -name 'am64'"

