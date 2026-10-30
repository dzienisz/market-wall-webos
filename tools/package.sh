#!/bin/sh
# Builds the .ipk and its Homebrew Channel manifest into a folder (default: dist).
# Needs ares-package from @webos-tools/cli on PATH, and node.
set -e
OUT=${1:-dist}
cd "$(dirname "$0")/.."

ID=$(node -p "require('./appinfo.json').id")
VERSION=$(node -p "require('./appinfo.json').version")
REPO=https://github.com/dzienisz/market-wall-webos

# Only what the TV needs goes into the package. ares-package's own --app-exclude doesn't match on macOS or
# Linux paths, so the app is copied into a clean folder first.
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
cp -R appinfo.json index.html icon.png largeIcon.png LICENSE css fonts src "$STAGE/"
mkdir -p "$STAGE/screens" "$STAGE/assets"
for f in screens/*.js; do case "$f" in screens/_*) ;; *) cp "$f" "$STAGE/screens/" ;; esac; done
cp assets/screensaver-main.qml "$STAGE/assets/"

mkdir -p "$OUT"
rm -f "$OUT"/*.ipk "$OUT"/*.manifest.json
ares-package "$STAGE" -o "$OUT"

IPK="${ID}_${VERSION}_all.ipk"
SHA=$(shasum -a 256 "$OUT/$IPK" 2>/dev/null || sha256sum "$OUT/$IPK")
SHA=${SHA%% *}
SIZE=$(wc -c < "$OUT/$IPK" | tr -d ' ')

cat > "$OUT/$ID.manifest.json" <<EOF
{
  "id": "$ID",
  "version": "$VERSION",
  "type": "web",
  "title": "Market Wall",
  "appDescription": "Live markets on your TV: crypto, gold, indices and exchange rates in your currency",
  "iconUri": "https://raw.githubusercontent.com/dzienisz/market-wall-webos/main/largeIcon.png",
  "sourceUrl": "$REPO",
  "rootRequired": "optional",
  "ipkUrl": "$IPK",
  "ipkHash": { "sha256": "$SHA" },
  "ipkSize": $SIZE
}
EOF
echo "Built $OUT/$IPK ($SIZE bytes) and $OUT/$ID.manifest.json"
