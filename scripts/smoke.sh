#!/usr/bin/env bash
# Smoke test untuk deployment Vercel.
# Pakai: bash scripts/smoke.sh https://url-deployment.vercel.app
#
# Rute ditemukan OTOMATIS dari folder app/ (setiap page.tsx tanpa segmen dinamis),
# jadi tidak perlu ditambah manual setiap ada fitur baru.
# scripts/smoke-routes.txt opsional untuk rute tambahan (mis. /proyek/1).
#
# Aturan lulus:
#   - "/" wajib < 400 (kalau 401, artinya bypass Vercel belum benar → gagal)
#   - rute lain: < 400 lulus, 401/403 dianggap "terlindungi" (lulus), lainnya gagal
#   - halaman berisi "Application error" / "Internal Server Error" gagal
set -uo pipefail

BASE_URL="${1:-${DEPLOY_URL:-}}"
if [ -z "$BASE_URL" ]; then
  echo "URL deployment kosong. Pakai: bash scripts/smoke.sh <url>" >&2
  exit 1
fi
BASE_URL="${BASE_URL%/}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

discover_routes() {
  local appdir=""
  for d in "$ROOT_DIR/src/app" "$ROOT_DIR/app"; do
    [ -d "$d" ] && appdir="$d" && break
  done
  [ -z "$appdir" ] && return 0
  find "$appdir" -type f \( -name 'page.tsx' -o -name 'page.ts' -o -name 'page.jsx' -o -name 'page.js' -o -name 'page.mdx' \) \
    | sed -e "s#^$appdir##" -e 's#/page\.[a-z]*$##' \
    | grep -vE '\[|/@|/_' \
    | sed -E 's#/\([^/]*\)##g' \
    | sed -e 's#^$#/#'
}

ROUTES="$( { echo "/"; discover_routes; [ -f "$SCRIPT_DIR/smoke-routes.txt" ] && sed -e 's/#.*//' "$SCRIPT_DIR/smoke-routes.txt"; } \
  | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' | grep -v '^$' | awk '!seen[$0]++' )"

HEADERS=()
if [ -n "${VERCEL_AUTOMATION_BYPASS_SECRET:-}" ]; then
  HEADERS+=(-H "x-vercel-protection-bypass: ${VERCEL_AUTOMATION_BYPASS_SECRET}" -H "x-vercel-set-bypass-cookie: true")
fi

COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

fail=0
echo "Smoke test: $BASE_URL"
while IFS= read -r route; do
  body="$(mktemp)"
  code="$(curl -sS -L --max-time 30 -o "$body" -w '%{http_code}' -b "$COOKIE_JAR" -c "$COOKIE_JAR" ${HEADERS[@]+"${HEADERS[@]}"} "$BASE_URL$route" 2>/dev/null || true)"
  code="${code:-000}"
  if [ "$code" = "000" ] || [ "$code" -ge 500 ] 2>/dev/null; then
    echo "  GAGAL      $code  $route"; fail=1
  elif [ "$route" = "/" ] && [ "$code" -ge 400 ]; then
    echo "  GAGAL      $code  $route  (beranda harus bisa diakses; jika 401 cek VERCEL_AUTOMATION_BYPASS_SECRET)"; fail=1
  elif [ "$code" = "401" ] || [ "$code" = "403" ]; then
    echo "  TERLINDUNG $code  $route"
  elif [ "$code" -ge 400 ]; then
    echo "  GAGAL      $code  $route"; fail=1
  elif grep -qiE "Application error|Internal Server Error" "$body"; then
    echo "  GAGAL      $code  $route  (halaman berisi pesan error)"; fail=1
  else
    echo "  OK         $code  $route"
  fi
  rm -f "$body"
done <<< "$ROUTES"

[ "$fail" -ne 0 ] && { echo "Ada rute yang gagal." >&2; exit 1; }
echo "Semua rute OK."
