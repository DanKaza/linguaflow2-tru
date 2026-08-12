#!/usr/bin/env bash
# ============================================================================
# LinguaFlow School — SEEDER DATA DUMMY (khusus testing)
#
# PENTING: jalankan SETELAH setup-db.sql berhasil dijalankan di
# Supabase Dashboard → SQL Editor → Run.
#
#   bash seed-db.sh
#
# Yang dibuat:
#   - 1 admin, 2 guru, 12 murid (password semua: 123456, email @test.com)
#   - 1 sekolah: SMK Texar Nihongo
#   - 4 kelas + wali kelas
#   - Tugas contoh + 1 kuis lengkap dengan soal
#   - Pengerjaan kuis beberapa murid (buat Laporan ada isinya)
#
# Aman dijalankan sekali di DB fresh. Kalau dijalankan 2x, akun email
# sudah terdaftar → script berhenti dengan pesan jelas.
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")"
. .env.local

AUTH="$NEXT_PUBLIC_SUPABASE_URL/auth/v1"
BASE="$NEXT_PUBLIC_SUPABASE_URL/rest/v1"
KEY="$SUPABASE_SERVICE_ROLE_KEY"
PASS="123456"

# ── Helper: ambil field dari JSON (via node) ──────────────────────────────
jget() {
  node -e '
    let d = "";
    process.stdin.on("data", (c) => (d += c));
    process.stdin.on("end", () => {
      try {
        const j = JSON.parse(d);
        const obj = Array.isArray(j) ? j[0] : j; // PostgREST membungkus hasil dalam array
        const path = process.argv[1].replace(/^\./, "").split(".").filter(Boolean);
        console.log(path.reduce((a, k) => (a == null ? a : a[k]), obj) ?? "");
      } catch { console.log(""); }
    });
  ' "$1"
}

# ── Helper: panggil REST ──────────────────────────────────────────────────
rest() { # method path json
  curl -s -X "$1" "$BASE/$2" \
    -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "$3"
}

# ── Helper: buat user auth via Admin API, print user id ───────────────────
create_user() { # email role nama -> prints id
  local resp
  resp=$(curl -s -X POST "$AUTH/admin/users" \
    -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$PASS\",\"email_confirm\":true,\"user_metadata\":{\"full_name\":\"$3\",\"role\":\"$2\"}}")
  local id
  id=$(echo "$resp" | jget ".id")
  if [ -z "$id" ]; then
    echo "❌ Gagal buat user $1 → $(echo "$resp" | jget '.msg // .error_description // .message // .code')"
    echo "   (kemungkinan email sudah terdaftar — jalankan sekali saja, atau ganti email di script)"
    exit 1
  fi
  echo "$id"
}

echo "══════════════════════════════════════════════"
echo "  SEEDER DATA DUMMY LinguaFlow"
echo "══════════════════════════════════════════════"

echo "── 1/6  Buat akun auth (admin + guru + murid) ──"
ADMIN_ID=$(create_user "admin@test.com" "admin" "Siti Rahayu")
GURU1_ID=$(create_user "guru1@test.com" "guru" "Rina Wijaya")
GURU2_ID=$(create_user "guru2@test.com" "guru" "Budi Santoso")
MURID_IDS=()
for i in $(seq -w 1 12); do
  MURID_IDS+=("$(create_user "murid$i@test.com" "murid" "Murid $i")")
done
echo "   ✓ admin, 2 guru, 12 murid dibuat (password semua: $PASS)"

echo "── 2/6  Buat sekolah ──"
SCHOOL_RESP=$(rest POST "schools" "{\"name\":\"SMK Texar Nihongo\",\"npsn\":\"20203567\",\"admin_id\":\"$ADMIN_ID\"}")
SCHOOL_ID=$(echo "$SCHOOL_RESP" | jget ".id")
[ -z "$SCHOOL_ID" ] && { echo "❌ Gagal buat sekolah → $SCHOOL_RESP"; exit 1; }
rest PATCH "profiles?id=eq.$ADMIN_ID" "{\"school_id\":\"$SCHOOL_ID\",\"role\":\"admin\"}" > /dev/null
echo "   ✓ SMK Texar Nihongo ($SCHOOL_ID)"

echo "── 3/6  Buat 4 kelas + wali kelas ──"
class() { # name teacher_id
  local code
  code=$(rest POST "classes" "{\"school_id\":\"$SCHOOL_ID\",\"name\":\"$1\",\"code\":\"$1\",\"teacher_id\":\"$2\"}" | jget ".code")
  [ -z "$code" ] && { echo "❌ Gagal buat kelas $1"; exit 1; }
  echo "$code"
}
C1=$(class "X-RPL-1" "$GURU1_ID")
C2=$(class "X-RPL-2" "$GURU1_ID")
C3=$(class "XI-TKJ-1" "$GURU2_ID")
C4=$(class "XII-MM-1" "$GURU2_ID")
echo "   ✓ $C1, $C2, $C3, $C4"

echo "── 4/6  Assign murid ke kelas + NIS ──"
assign() { # start_idx end_idx class_code  (index array 0-based, murid01=0)
  local i code="$3"
  for i in $(seq "$1" "$2"); do
    local nis
    nis=$(printf "2026%03d" "$((10#$i + 1))")
    rest PATCH "profiles?id=eq.${MURID_IDS[$i]}" \
      "{\"school_id\":\"$SCHOOL_ID\",\"class_code\":\"$code\",\"nis\":\"$nis\"}" > /dev/null
  done
  echo "   ✓ murid $((10#$1 + 1))–$((10#$2 + 1)) → $code"
}
assign 0 3 "$C1"
assign 4 7 "$C2"
assign 8 9 "$C3"
assign 10 11 "$C4"

echo "── 5/6  Tugas + kuis contoh ──"
rest POST "tasks" "{\"school_id\":\"$SCHOOL_ID\",\"teacher_id\":\"$GURU1_ID\",\"class_code\":\"$C1\",\"title\":\"Flashcard Bab 1: Perkenalan\",\"type\":\"flashcard\",\"level\":\"N5\",\"category\":\"Perkenalan\",\"target\":20,\"duration\":15,\"deadline\":\"2026-08-30\"}" > /dev/null
rest POST "tasks" "{\"school_id\":\"$SCHOOL_ID\",\"teacher_id\":\"$GURU1_ID\",\"class_code\":\"$C2\",\"title\":\"Kuis Kanji Dasar\",\"type\":\"kuis\",\"level\":\"N5\",\"category\":\"Kanji\",\"target\":10,\"duration\":10,\"deadline\":\"2026-08-28\"}" > /dev/null
rest POST "tasks" "{\"school_id\":\"$SCHOOL_ID\",\"teacher_id\":\"$GURU2_ID\",\"class_code\":\"$C3\",\"title\":\"Flashcard Kata Kerja\",\"type\":\"flashcard\",\"level\":\"N4\",\"category\":\"Kata Kerja\",\"target\":15,\"duration\":20,\"deadline\":\"2026-09-05\"}" > /dev/null
echo "   ✓ 3 tugas"

QUIZ_ID=$(rest POST "quizzes" "{\"school_id\":\"$SCHOOL_ID\",\"teacher_id\":\"$GURU1_ID\",\"title\":\"Kuis Bab 1: Perkenalan\",\"level\":\"N5\",\"passing_grade\":70,\"class_code\":\"$C1\",\"published_at\":\"2026-08-10\"}" | jget ".id")
[ -z "$QUIZ_ID" ] && { echo "❌ Gagal buat kuis"; exit 1; }
rest POST "quiz_words" "[
  {\"quiz_id\":\"$QUIZ_ID\",\"kanji\":\"学校\",\"furigana\":\"がっこう\",\"arti\":\"sekolah\",\"level\":\"N5\",\"sort_order\":0},
  {\"quiz_id\":\"$QUIZ_ID\",\"kanji\":\"先生\",\"furigana\":\"せんせい\",\"arti\":\"guru\",\"level\":\"N5\",\"sort_order\":1},
  {\"quiz_id\":\"$QUIZ_ID\",\"kanji\":\"学生\",\"furigana\":\"がくせい\",\"arti\":\"murid\",\"level\":\"N5\",\"sort_order\":2},
  {\"quiz_id\":\"$QUIZ_ID\",\"kanji\":\"友達\",\"furigana\":\"ともだち\",\"arti\":\"teman\",\"level\":\"N5\",\"sort_order\":3},
  {\"quiz_id\":\"$QUIZ_ID\",\"kanji\":\"日本語\",\"furigana\":\"にほんご\",\"arti\":\"bahasa Jepang\",\"level\":\"N5\",\"sort_order\":4},
  {\"quiz_id\":\"$QUIZ_ID\",\"kanji\":\"本\",\"furigana\":\"ほん\",\"arti\":\"buku\",\"level\":\"N5\",\"sort_order\":5}
]" > /dev/null
echo "   ✓ kuis + 6 soal"

echo "── 6/6  Pengerjaan kuis beberapa murid ──"
attempt() { # student_id score correct submitted_at
  rest POST "quiz_attempts" "{\"student_id\":\"$1\",\"school_id\":\"$SCHOOL_ID\",\"quiz_id\":\"$QUIZ_ID\",\"score\":$2,\"correct_count\":$3,\"total_questions\":10,\"total_xp\":$(( $3 * 5 )),\"submitted_at\":\"$4\"}" > /dev/null
}
attempt "${MURID_IDS[0]}" 90 9 "2026-08-10T02:00:00Z"
attempt "${MURID_IDS[1]}" 70 7 "2026-08-10T03:30:00Z"
attempt "${MURID_IDS[2]}" 100 10 "2026-08-11T01:15:00Z"
attempt "${MURID_IDS[3]}" 60 6 "2026-08-11T05:45:00Z"
attempt "${MURID_IDS[4]}" 80 8 "2026-08-12T02:20:00Z"
attempt "${MURID_IDS[8]}" 50 5 "2026-08-12T04:10:00Z"
echo "   ✓ 6 pengerjaan kuis"

echo ""
echo "══════════════════════════════════════════════"
echo "  ✅ SEEDING SELESAI!"
echo "══════════════════════════════════════════════"
echo ""
echo "  AKUN TEST (password semua: $PASS)"
echo "  ────────────────────────────────────────────"
echo "  Admin : admin@test.com     → /a/dashboard"
echo "  Guru  : guru1@test.com     → /g/dashboard"
echo "  Guru  : guru2@test.com     → /g/dashboard"
echo "  Murid : murid01@test.com   → /m/dashboard"
echo "          (s.d. murid12@test.com)"
echo ""
echo "  Sekolah : SMK Texar Nihongo"
echo "  Kelas   : $C1 · $C2 · $C3 · $C4"
