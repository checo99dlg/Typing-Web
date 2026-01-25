#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:5050}"
COOKIE_JAR="${COOKIE_JAR:-/tmp/typingweb_cj}"

echo "Running smoke test against ${BASE_URL}"

curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/" | grep -q "200" || {
  echo "Home page failed"
  exit 1
}

curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/words?count=5&lang=en" | grep -q "200" || {
  echo "Words API failed"
  exit 1
}

curl -s -i -c "${COOKIE_JAR}" -b "${COOKIE_JAR}" \
  -d "email=smoke@example.com&username=smokeuser&password=pass1234&confirm=pass1234" \
  "${BASE_URL}/signup" | grep -q "Location: /profile" || {
  echo "Signup failed"
  exit 1
}

curl -s -i -c "${COOKIE_JAR}" -b "${COOKIE_JAR}" \
  -d "email=smoke@example.com&password=pass1234" \
  "${BASE_URL}/login" | grep -q "Location: /profile" || {
  echo "Login failed"
  exit 1
}

curl -s -o /dev/null -w "%{http_code}" -b "${COOKIE_JAR}" -H "Content-Type: application/json" \
  -d '{"wpm":65,"rawWpm":72,"accuracy":96,"duration":60,"chars":300,"correctChars":280,"incorrectChars":10,"extraChars":5,"missedChars":5}' \
  "${BASE_URL}/api/results" | grep -q "200" || {
  echo "Results save failed"
  exit 1
}

curl -s -o /dev/null -w "%{http_code}" -b "${COOKIE_JAR}" "${BASE_URL}/profile" | grep -q "200" || {
  echo "Profile failed"
  exit 1
}

echo "Smoke test passed."
