#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
# VERTEX GO — Quick Push from Termux
# Usage:  bash push.sh "your commit message"
#    or:  bash push.sh          (auto message)
# ============================================================

cd "$HOME/vertexgo" || { echo "Run termux_setup.sh first!"; exit 1; }

GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

MSG="${1:-"update: $(date '+%Y-%m-%d %H:%M')"}"

echo -e "${CYAN}Vertex Go — Quick Push${NC}"
echo "Branch: $(git branch --show-current)"
echo ""

git add -A
CHANGED=$(git diff --cached --name-only | wc -l)

if [ "$CHANGED" -eq 0 ]; then
  echo "Nothing new to push."
  exit 0
fi

echo "Files changed:"
git diff --cached --name-only | sed 's/^/  /'
echo ""

git commit -m "$MSG"
git push

echo ""
echo -e "${GREEN}✓ Pushed! GitHub Actions is building...${NC}"
echo ""
# Print APK download link
REPO=$(git remote get-url origin | sed 's|git@github.com:|https://github.com/|' | sed 's/.git$//')
echo "  Actions: $REPO/actions"
echo "  Releases: $REPO/releases"
