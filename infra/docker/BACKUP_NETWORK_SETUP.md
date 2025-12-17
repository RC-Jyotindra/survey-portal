# Network Setup Guide for Remote Backups

## 🔴 Problem: Connection Timeout

If you're getting `Connection timed out` when trying to SSH to your local machine from the production server, this is a **network connectivity issue**, not an SSH key problem.

## 🌐 Understanding the Network Issue

### The Problem

```
Production Server (srv676458)          Your Local Network
     ↓                                        ↓
[Public IP]  ────Internet───>  [Router] ───> [192.168.1.246]
                                 ↓
                          (Port Forwarding?)
                          (Firewall Rules?)
```

**Issue**: Your production server can't reach `192.168.1.246` because:
1. `192.168.1.246` is a **private IP address** (only accessible within your local network)
2. The production server is on the **public internet**
3. Your router needs to forward port 22 (SSH) to your local machine

## ✅ Solutions

### Solution 1: Port Forwarding (Recommended for SSH Keys)

**Best for**: Secure, permanent setup with SSH keys

**Steps**:

1. **Find your router's public IP** (what your production server should connect to):
   ```bash
   # On your local machine, check your public IP
   curl ifconfig.me
   # Or visit: https://whatismyipaddress.com
   ```

2. **Configure Port Forwarding on your router**:
   - Access router admin panel (usually `192.168.1.1` or `192.168.0.1`)
   - Go to "Port Forwarding" or "Virtual Server" settings
   - Forward **External Port 22** → **Internal IP 192.168.1.246 Port 22**
   - Save and apply

3. **Update backup configuration** to use public IP:
   ```bash
   # In your .env file, change:
   REMOTE_BACKUP_HOST=YOUR_PUBLIC_IP  # Instead of 192.168.1.246
   ```

4. **Test connection from production server**:
   ```bash
   ssh -i infra/docker/backup-keys/id_rsa rcadmin@YOUR_PUBLIC_IP
   ```

**Security Note**: Exposing SSH to the internet requires:
- Strong passwords or SSH keys only (disable password auth)
- Consider changing SSH port (e.g., 2222 instead of 22)
- Use fail2ban to prevent brute force attacks
- Consider VPN instead (see Solution 3)

---

### Solution 2: Use Password Authentication (Quick Fix)

**Best for**: Quick setup, testing, or when port forwarding isn't possible

**Steps**:

1. **Update docker-compose.db.yml environment** (already supports this):
   ```yaml
   - REMOTE_SSH_PASSWORD=${REMOTE_SSH_PASSWORD}
   ```

2. **Set password in .env file**:
   ```bash
   REMOTE_BACKUP_HOST=YOUR_PUBLIC_IP  # Or use port-forwarded IP
   REMOTE_BACKUP_USER=rcadmin
   REMOTE_SSH_PASSWORD=your_ssh_password_here
   ```

3. **The backup scripts will automatically use sshpass** for password authentication

**Note**: Less secure than SSH keys, but works when port forwarding is configured.

---

### Solution 3: VPN Connection (Most Secure)

**Best for**: Enterprise setups, multiple services

**Options**:
- **WireGuard VPN**: Lightweight, fast
- **OpenVPN**: Mature, widely supported
- **Tailscale**: Easy setup, mesh networking

**Setup** (WireGuard example):
1. Install WireGuard on both servers
2. Create VPN tunnel
3. Use VPN IP addresses for backup connection
4. No port forwarding needed, more secure

---

### Solution 4: Reverse Backup (Push from Local Machine)

**Best for**: When you can't modify router/firewall

Instead of production server pulling backups, your local machine pushes them:

1. **Set up backup script on local machine** that:
   - Connects to production server via SSH
   - Pulls backups from production server
   - Stores locally

2. **Run as cron job on local machine**:
   ```bash
   # On your local machine (192.168.1.246)
   0 3 * * * /path/to/pull-backups.sh
   ```

**Advantage**: No port forwarding needed, local machine initiates connection

---

### Solution 5: Cloud Storage as Intermediate (Hybrid)

**Best for**: When direct connection isn't possible

1. **Production server** → Uploads backups to:
   - AWS S3
   - Google Cloud Storage
   - Azure Blob Storage
   - Dropbox/OneDrive (via rclone)

2. **Local machine** → Downloads from cloud storage

**Advantage**: No network configuration needed, works from anywhere

---

## 🔧 Quick Fix: Password Authentication Setup

If you want to use password authentication right now:

### Step 1: Configure Port Forwarding

1. Access your router admin panel
2. Forward port 22 to `192.168.1.246:22`
3. Note your public IP (check with `curl ifconfig.me`)

### Step 2: Update Environment Variables

```bash
# In your .env file on production server
REMOTE_BACKUP_HOST=YOUR_PUBLIC_IP  # Your router's public IP
REMOTE_BACKUP_USER=rcadmin
REMOTE_SSH_PASSWORD=your_ssh_password
REMOTE_BACKUP_PATH=/home/rcadmin/postgres-backups
```

### Step 3: Test Connection

```bash
# From production server, test SSH with password
sshpass -p 'your_password' ssh rcadmin@YOUR_PUBLIC_IP "echo 'Connection successful'"
```

### Step 4: Restart Backup Service

```bash
cd infra/docker
docker-compose -f docker-compose.db.yml restart postgres-backup
```

---

## 🔍 Troubleshooting Network Issues

### Test 1: Can you reach the public IP?

```bash
# From production server
ping YOUR_PUBLIC_IP
```

**If ping fails**: Router firewall might be blocking ICMP (normal, try SSH anyway)

### Test 2: Can you reach port 22?

```bash
# From production server
telnet YOUR_PUBLIC_IP 22
# Or
nc -zv YOUR_PUBLIC_IP 22
```

**If connection refused**: Port forwarding not configured or SSH not running

**If timeout**: Firewall blocking or wrong IP

### Test 3: Test SSH connection

```bash
# With password
sshpass -p 'password' ssh -v rcadmin@YOUR_PUBLIC_IP

# With key
ssh -i infra/docker/backup-keys/id_rsa -v rcadmin@YOUR_PUBLIC_IP
```

The `-v` flag shows detailed connection info.

### Test 4: Check router logs

- Check router admin panel for connection attempts
- Verify port forwarding rules are active
- Check firewall rules

---

## 🛡️ Security Recommendations

### If Using Port Forwarding:

1. **Change SSH Port** (reduce automated attacks):
   ```bash
   # On local machine, edit /etc/ssh/sshd_config
   Port 2222
   # Then forward external port 2222 → internal 22
   ```

2. **Disable Password Authentication** (use keys only):
   ```bash
   # On local machine, edit /etc/ssh/sshd_config
   PasswordAuthentication no
   PubkeyAuthentication yes
   ```

3. **Install fail2ban** (prevent brute force):
   ```bash
   sudo apt-get install fail2ban
   ```

4. **Use Strong SSH Keys** (4096-bit RSA or Ed25519):
   ```bash
   ssh-keygen -t ed25519 -f infra/docker/backup-keys/id_ed25519
   ```

### If Using Password Authentication:

1. **Use Strong Password**: 20+ characters, mixed case, numbers, symbols
2. **Limit SSH Access**: Use firewall to restrict source IPs if possible
3. **Monitor Logs**: Check `/var/log/auth.log` for failed attempts
4. **Consider VPN**: More secure than exposing SSH to internet

---

## 📋 Configuration Checklist

- [ ] Router port forwarding configured (External 22 → Internal 192.168.1.246:22)
- [ ] Public IP identified and tested
- [ ] SSH service running on local machine (port 22 or custom)
- [ ] Firewall allows SSH connections
- [ ] Environment variables set (REMOTE_BACKUP_HOST, REMOTE_SSH_PASSWORD)
- [ ] Test connection works: `sshpass -p 'pass' ssh user@PUBLIC_IP`
- [ ] Backup service restarted: `docker-compose restart postgres-backup`
- [ ] Verify backups syncing: Check logs `docker logs postgres-backup`

---

## 🚀 Recommended Setup (Step by Step)

### For SSH Key Authentication:

1. **On Production Server**:
   ```bash
   # Generate key (already done)
   ssh-keygen -t rsa -b 4096 -f infra/docker/backup-keys/id_rsa
   ```

2. **Configure Router**:
   - Forward port 22 → 192.168.1.246:22
   - Note your public IP

3. **On Local Machine** (192.168.1.246):
   ```bash
   # Create backup directory
   mkdir -p /home/rcadmin/postgres-backups/{base-backups,wal-archive}
   
   # Add public key to authorized_keys
   mkdir -p ~/.ssh
   # Copy public key from production server and add to ~/.ssh/authorized_keys
   ```

4. **On Production Server**:
   ```bash
   # Update .env
   REMOTE_BACKUP_HOST=YOUR_PUBLIC_IP
   REMOTE_BACKUP_USER=rcadmin
   # Don't set REMOTE_SSH_PASSWORD (use key instead)
   
   # Test connection
   ssh -i infra/docker/backup-keys/id_rsa rcadmin@YOUR_PUBLIC_IP
   
   # Restart backup service
   docker-compose -f docker-compose.db.yml restart postgres-backup
   ```

### For Password Authentication (Quick Setup):

1. **Configure Router**: Forward port 22 → 192.168.1.246:22

2. **On Production Server**:
   ```bash
   # Update .env
   REMOTE_BACKUP_HOST=YOUR_PUBLIC_IP
   REMOTE_BACKUP_USER=rcadmin
   REMOTE_SSH_PASSWORD=your_strong_password
   
   # Test connection
   sshpass -p 'your_password' ssh rcadmin@YOUR_PUBLIC_IP "echo 'Success'"
   
   # Restart backup service
   docker-compose -f docker-compose.db.yml restart postgres-backup
   ```

---

## ❓ FAQ

**Q: Can I use the private IP (192.168.1.246) from production server?**  
A: No, private IPs only work within the same local network. Production server needs the public IP.

**Q: Is password authentication secure?**  
A: Less secure than SSH keys, but acceptable if:
- Strong password is used
- Port forwarding is configured
- Consider VPN for better security

**Q: What if I can't configure port forwarding?**  
A: Use Solution 4 (reverse backup) or Solution 5 (cloud storage).

**Q: Can I use a different port?**  
A: Yes! Forward external port (e.g., 2222) → internal 22, then use:
```bash
REMOTE_BACKUP_HOST=YOUR_PUBLIC_IP:2222
```

**Q: My public IP changes (dynamic IP)?**  
A: Use Dynamic DNS (DDNS) service like:
- No-IP
- DuckDNS
- Cloudflare DNS

Then use hostname instead of IP:
```bash
REMOTE_BACKUP_HOST=mybackup.ddns.net
```

---

## 🎯 Next Steps

1. **Choose a solution** based on your network setup
2. **Configure port forwarding** (if using direct connection)
3. **Test connection** from production server
4. **Update environment variables**
5. **Restart backup service**
6. **Verify backups are syncing**

For detailed setup instructions, see the solution that matches your needs above.

