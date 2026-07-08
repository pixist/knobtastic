#!/bin/sh
#
# Knobtastic skill installer.
#
#   Remote:  sh -c "$(curl -fsSL https://raw.githubusercontent.com/pixist/knobtastic/main/install.sh)"
#   Local:   ./install.sh            (run from a checkout)
#
# Installs the Knobtastic Claude Code skill into your skills directory so
# Claude offers MIDI knob-tuning when finishing UI work in Next.js + Tailwind
# projects. Set CLAUDE_SKILLS_DIR to override the destination.
#
# POSIX sh — runs under dash/ash/bash so the curl one-liner works everywhere.

set -eu

REPO="pixist/knobtastic"
BRANCH="${KNOBTASTIC_BRANCH:-main}"
SKILLS_DIR="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
DEST="$SKILLS_DIR/knobtastic"

say() { printf '\033[1;35m▸\033[0m %s\n' "$1"; }
die() { printf '\033[1;31m✗\033[0m %s\n' "$1" >&2; exit 1; }

# Resolve the skill source: prefer a local checkout, else fetch the repo.
here="$(CDPATH= cd "$(dirname -- "$0")" 2>/dev/null && pwd || true)"
CLEANUP=""
if [ -n "$here" ] && [ -f "$here/skill/knobtastic/SKILL.md" ]; then
  SRC="$here/skill/knobtastic"
  say "Installing from local checkout"
else
  command -v git >/dev/null 2>&1 || die "git is required to fetch the skill"
  CLEANUP="$(mktemp -d)"
  say "Fetching $REPO ($BRANCH)…"
  git clone --depth 1 --branch "$BRANCH" "https://github.com/$REPO.git" "$CLEANUP/repo" >/dev/null 2>&1 \
    || die "could not clone https://github.com/$REPO"
  SRC="$CLEANUP/repo/skill/knobtastic"
  [ -f "$SRC/SKILL.md" ] || die "skill not found in repository"
fi

mkdir -p "$SKILLS_DIR"
[ -d "$DEST" ] && say "Replacing existing install at $DEST"
rm -rf "$DEST"
cp -r "$SRC" "$DEST"
chmod +x "$DEST"/scripts/*.sh 2>/dev/null || true

[ -n "$CLEANUP" ] && rm -rf "$CLEANUP"

say "Installed to $DEST"
cat <<'EOF'

  Knobtastic is ready. In a Next.js + Tailwind project, run Claude Code and:

    /knobtastic                              full tune-before-commit flow
    /knobtastic tie the shadow depth to a knob
    /knobtastic use my Push

  Plug in a MIDI controller, open the dev server in Chrome, twist, then
  click "Commit to source". Claude folds the tuned values into your commit.
EOF
