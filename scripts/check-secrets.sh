#!/usr/bin/env bash
# Gagal jika ada file .env asli atau kunci rahasia Supabase/Vercel yang ikut ter-commit.
set -uo pipefail

fail=0

# 1. File .env selain .env.example
envfiles="$(git ls-files | grep -E '(^|/)\.env($|\.)' | grep -vE '\.env\.example$' || true)"
if [ -n "$envfiles" ]; then
  echo "::error::File env ter-commit (hapus dari repo dan rotasi kuncinya):"; echo "$envfiles"; fail=1
fi

# 2. Pola kunci rahasia di file yang dilacak git
patterns='sb_secret_[A-Za-z0-9_-]{10,}|SUPABASE_SERVICE_ROLE_KEY=[^[:space:]]{20,}|SUPABASE_SECRET_KEY=[^[:space:]]{20,}|SUPABASE_DB_PASSWORD=[^[:space:]]{6,}|postgres(ql)?://[^:/[:space:]]+:[^@[:space:]]{6,}@'
hits="$(git ls-files -z | xargs -0 grep -nIE "$patterns" -- 2>/dev/null | grep -vE '^(scripts/check-secrets\.sh|\.env\.example):' || true)"
if [ -n "$hits" ]; then
  echo "::error::Kemungkinan secret ditemukan di kode:"; echo "$hits" | cut -c1-160; fail=1
fi

[ "$fail" -eq 0 ] && echo "Tidak ada secret yang terdeteksi."
exit "$fail"
