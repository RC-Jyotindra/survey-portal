#!/bin/bash

# Puppeteer Dependencies Installation Script for Ubuntu
# This script installs all required system dependencies for Puppeteer's Chromium

set -e  # Exit on error

echo "🔧 Installing Puppeteer dependencies for Ubuntu..."

# Update package list
echo "📦 Updating package list..."
apt-get update

# Detect Ubuntu version and use appropriate package names
UBUNTU_VERSION=$(lsb_release -rs 2>/dev/null || echo "unknown")

echo "🖥️  Detected Ubuntu version: $UBUNTU_VERSION"

# Function to install package with fallback
install_pkg() {
    local pkg=$1
    local fallback=$2
    
    if apt-cache show "$pkg" &>/dev/null; then
        echo "  ✓ Installing $pkg"
        apt-get install -y "$pkg" || true
    elif [ -n "$fallback" ] && apt-cache show "$fallback" &>/dev/null; then
        echo "  ✓ Installing $fallback (fallback for $pkg)"
        apt-get install -y "$fallback" || true
    else
        echo "  ⚠️  Package $pkg not found, skipping..."
    fi
}

# Install core dependencies
echo "📚 Installing core dependencies..."
install_pkg "ca-certificates"
install_pkg "fonts-liberation"
install_pkg "wget"
install_pkg "xdg-utils"
install_pkg "lsb-release"

# Install audio libraries
echo "🔊 Installing audio libraries..."
install_pkg "libasound2" "libasound2t64"

# Install ATK (Accessibility Toolkit)
echo "♿ Installing accessibility libraries..."
install_pkg "libatk1.0-0" "libatk1.0-0t64"
install_pkg "libatk-bridge2.0-0" "libatk-bridge2.0-0t64"

# Install GTK and related
echo "🎨 Installing GUI libraries..."
install_pkg "libgtk-3-0" "libgtk-3-0t64"
install_pkg "libgdk-pixbuf2.0-0" "libgdk-pixbuf-2.0-0"

# Install GLib
echo "📚 Installing GLib..."
install_pkg "libglib2.0-0" "libglib2.0-0t64"

# Install Cairo and Pango
echo "🖼️  Installing graphics libraries..."
install_pkg "libcairo2"
install_pkg "libpango-1.0-0" "libpango-1.0-0t64"
install_pkg "libpangocairo-1.0-0" "libpangocairo-1.0-0t64"

# Install X11 libraries
echo "🖥️  Installing X11 libraries..."
install_pkg "libx11-6"
install_pkg "libx11-xcb1"
install_pkg "libxcb1"
install_pkg "libxcomposite1"
install_pkg "libxcursor1"
install_pkg "libxdamage1"
install_pkg "libxext6"
install_pkg "libxfixes3"
install_pkg "libxi6"
install_pkg "libxrandr2"
install_pkg "libxrender1"
install_pkg "libxss1"
install_pkg "libxtst6"

# Install other required libraries
echo "📦 Installing additional libraries..."
install_pkg "libappindicator3-1"
install_pkg "libc6"
install_pkg "libcups2" "libcups2t64"
install_pkg "libdbus-1-3"
install_pkg "libexpat1"
install_pkg "libfontconfig1"
install_pkg "libgbm1"
install_pkg "libgcc1" "libgcc-s1"
install_pkg "libnspr4"
install_pkg "libnss3"
install_pkg "libstdc++6"

# Try to install Chromium as a system alternative
echo "🌐 Attempting to install system Chromium (optional)..."
if apt-get install -y chromium-browser 2>/dev/null || apt-get install -y chromium 2>/dev/null; then
    echo "  ✓ System Chromium installed successfully"
    CHROMIUM_PATH=$(which chromium-browser 2>/dev/null || which chromium 2>/dev/null || echo "")
    if [ -n "$CHROMIUM_PATH" ]; then
        echo "  📍 Chromium found at: $CHROMIUM_PATH"
        echo "  💡 You can set PUPPETEER_EXECUTABLE_PATH=$CHROMIUM_PATH in ecosystem.config.js"
    fi
else
    echo "  ⚠️  System Chromium not available, Puppeteer will use bundled version"
fi

echo ""
echo "✅ Dependency installation complete!"
echo ""
echo "🔄 Restarting survey-service..."
pm2 restart rc-survey-service || echo "⚠️  PM2 restart failed. Please restart manually: pm2 restart rc-survey-service"

echo ""
echo "✨ Done! Puppeteer should now work correctly."
