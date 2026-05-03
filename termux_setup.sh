#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
# VERTEX GO — Termux Setup & GitHub Push Script
# Run this on your Android phone in Termux
# ============================================================

set -e

REPO_URL="https://github.com/sammysam254/vertextgo.git"
BRANCH="main"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

header() { echo -e "\n${CYAN}══════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}══════════════════════════════════${NC}"; }
ok()     { echo -e "${GREEN}✓ $1${NC}"; }
warn()   { echo -e "${YELLOW}⚠ $1${NC}"; }
err()    { echo -e "${RED}✗ $1${NC}"; exit 1; }

# ─── STEP 0: Check we're in Termux ───────────────────────────────────────────
if [ ! -d "/data/data/com.termux" ]; then
  err "This script must be run inside Termux"
fi

# ─── STEP 1: Install required packages ───────────────────────────────────────
header "Installing packages"
pkg update -y && pkg upgrade -y
pkg install -y git openssh curl nano

ok "Packages ready"

# ─── STEP 2: Configure Git ────────────────────────────────────────────────────
header "Git configuration"

if [ -z "$(git config --global user.name)" ]; then
  read -p "Enter your Git username: " GIT_USER
  git config --global user.name "$GIT_USER"
fi

if [ -z "$(git config --global user.email)" ]; then
  read -p "Enter your Git email: " GIT_EMAIL
  git config --global user.email "$GIT_EMAIL"
fi

git config --global init.defaultBranch main
git config --global core.autocrlf false
ok "Git configured as: $(git config --global user.name)"

# ─── STEP 3: SSH Key setup ────────────────────────────────────────────────────
header "SSH Key Setup"

SSH_KEY="$HOME/.ssh/id_ed25519"

if [ ! -f "$SSH_KEY" ]; then
  echo "Generating SSH key..."
  ssh-keygen -t ed25519 -C "$(git config --global user.email)" -f "$SSH_KEY" -N ""
  ok "SSH key generated"
else
  ok "SSH key already exists"
fi

echo ""
echo -e "${YELLOW}══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  ADD THIS KEY TO GITHUB:${NC}"
echo -e "${YELLOW}  Settings → SSH and GPG keys → New SSH key${NC}"
echo -e "${YELLOW}══════════════════════════════════════════════════════${NC}"
echo ""
cat "$SSH_KEY.pub"
echo ""
echo -e "${YELLOW}══════════════════════════════════════════════════════${NC}"
echo ""
read -p "Press ENTER after adding the key to GitHub..."

# Test GitHub connection
ssh -T git@github.com 2>&1 | grep -q "successfully authenticated" && ok "GitHub SSH connection working!" || warn "SSH test inconclusive — continuing..."

# ─── STEP 4: Clone or update repo ────────────────────────────────────────────
header "Repository Setup"

WORK_DIR="$HOME/vertexgo"

# Convert HTTPS URL to SSH for Termux (SSH is more reliable)
SSH_REPO_URL=$(echo "$REPO_URL" | sed 's|https://github.com/|git@github.com:|')

if [ -d "$WORK_DIR/.git" ]; then
  echo "Repository exists — pulling latest..."
  cd "$WORK_DIR"
  git pull origin "$BRANCH"
  ok "Repository updated"
else
  echo "Cloning repository..."
  git clone "$SSH_REPO_URL" "$WORK_DIR"
  ok "Repository cloned to $WORK_DIR"
fi

cd "$WORK_DIR"

# ─── STEP 5: Set up GitHub secrets reminder ──────────────────────────────────
header "GitHub Secrets Required"
echo "Go to: GitHub → Your Repo → Settings → Secrets and variables → Actions"
echo ""
echo "Add these secrets:"
echo ""
echo "  SUPABASE_URL          → Your Supabase project URL"
echo "  SUPABASE_ANON_KEY     → Your Supabase anon/public key"
echo "  NETLIFY_AUTH_TOKEN    → From Netlify user settings (optional)"
echo "  NETLIFY_SITE_ID       → Your Netlify site ID (optional)"
echo "  KEYSTORE_BASE64       → base64 of your .jks keystore (optional)"
echo "  KEY_ALIAS             → Keystore key alias (optional)"
echo "  KEY_PASSWORD          → Key password (optional)"
echo "  STORE_PASSWORD        → Keystore password (optional)"
echo ""
read -p "Press ENTER to continue to push..."

# ─── STEP 6: Push to GitHub ──────────────────────────────────────────────────
header "Pushing to GitHub"

git add -A

# Smart commit message
CHANGED=$(git diff --cached --name-only | wc -l)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')

if [ "$CHANGED" -eq 0 ]; then
  warn "Nothing to commit — all files already pushed"
else
  git commit -m "🚀 Vertex Go update — $TIMESTAMP [$CHANGED files changed]"
  git push -u origin "$BRANCH"
  ok "Pushed $CHANGED files to $BRANCH"
  echo ""
  echo -e "${GREEN}GitHub Actions will now:${NC}"
  echo "  1. Build the Android APK"
  echo "  2. Deploy the web dashboard to Netlify"
  echo "  3. Create a GitHub Release with the APK"
  echo ""
  echo -e "${CYAN}Watch the build at:${NC}"
  echo "  $(echo $REPO_URL | sed 's/.git$//')/actions"
fi

ok "Done!"
