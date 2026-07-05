/* ============================================================
 * Kordle 로직 테스트
 * 실행:  node logic.test.js
 * ============================================================ */
const { decompose, evaluate, WORDS } = require("./logic.js");

let passed = 0, failed = 0;

function eq(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function test(name, actual, expected) {
  if (eq(actual, expected)) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}`);
    console.log(`       기대: ${JSON.stringify(expected)}`);
    console.log(`       실제: ${JSON.stringify(actual)}`);
  }
}

// 채점 헬퍼: 문자열로 간결하게 (guess/answer는 자모 문자열)
function grade(guessStr, answerStr) {
  return evaluate([...guessStr], [...answerStr]);
}
// 기대값을 이모지 문자열(🟩🟨⬜)로 적을 수 있게 파싱
function expect(emoji) {
  const map = { "🟩": "correct", "🟨": "present", "⬜": "absent" };
  return [...emoji].map((c) => map[c]);
}

/* ---------- 1. 분해 검증 ---------- */
console.log("\n[분해] decompose");
test("어둠", decompose("어둠"), [..."ㅇㅓㄷㅜㅁ"]);
test("규칙", decompose("규칙"), [..."ㄱㅠㅊㅣㄱ"]);
test("비용", decompose("비용"), [..."ㅂㅣㅇㅛㅇ"]);
test("부분", decompose("부분"), [..."ㅂㅜㅂㅜㄴ"]);
test("까치 (ㄲ→ㄱㄱ)", decompose("까치"), [..."ㄱㄱㅏㅊㅣ"]);
test("개미 (ㅐ→ㅏㅣ)", decompose("개미"), [..."ㄱㅏㅣㅁㅣ"]);
test("모든 후보가 자모 5개",
  WORDS.map((w) => decompose(w).length),
  WORDS.map(() => 5));

/* ---------- 2. 기본 채점 ---------- */
console.log("\n[채점] 기본");
test("완전 정답 (어둠)", grade("ㅇㅓㄷㅜㅁ", "ㅇㅓㄷㅜㅁ"), expect("🟩🟩🟩🟩🟩"));
test("전부 오답", grade("ㅋㅋㅋㅋㅋ", "ㅇㅓㄷㅜㅁ"), expect("⬜⬜⬜⬜⬜"));
test("초록/노랑/회색 혼합", grade("ㅇㅜㄷㅋㅋ", "ㅇㅓㄷㅜㅁ"), expect("🟩🟨🟩⬜⬜"));

/* ---------- 3. 중복 자모 규칙 ---------- */
console.log("\n[채점] 중복 자모 규칙");
// 규칙1: 정답에 0개인데 2번 입력 → 모두 회색
test("규칙1: 정답에 없음×2 → 모두 회색",
  grade("ㄷㄷㅏㅏㅏ", "ㅇㅓㅜㅁㅣ"), expect("⬜⬜⬜⬜⬜"));

// 규칙2-1: 정답에 1개, 초록 가능 → 그 위치 초록, 나머지 회색
test("규칙2-1: 1개+초록가능 → 초록 우선",
  grade("ㅂㅏㅏㅂㅏ", "ㅂㅣㅇㅛㅇ"), expect("🟩⬜⬜⬜⬜"));

// 규칙2-2: 정답에 1개, 초록 불가 → 앞쪽 노랑, 뒤 회색
test("규칙2-2: 1개+초록불가 → 앞글자 노랑",
  grade("ㅏㅜㅜㅏㅏ", "ㅇㅓㄷㅜㅁ"), expect("⬜🟨⬜⬜⬜"));

// 규칙3: 정답에 2개, 초록1 + 나머지 앞글자 노랑, 초과분 회색
test("규칙3: 2개, 초록1+노랑1 (부분)",
  grade("ㅂㅂㅏㅂㅂ", "ㅂㅜㅂㅜㄴ"), expect("🟩🟨⬜⬜⬜"));

// 규칙3: 정답에 2개, 초록 없음 → 앞 2개 노랑, 나머지 회색
// (ㅂ을 정답의 ㅂ 위치 0·2가 아닌 1·3·4에 배치해 초록이 안 나오게 함)
test("규칙3: 2개, 초록없음 → 앞2개 노랑",
  grade("ㅏㅂㅏㅂㅂ", "ㅂㅜㅂㅜㄴ"), expect("⬜🟨⬜🟨⬜"));

// 규칙3: 정답에 2개, 초록 2개 → 둘 다 초록
test("규칙3: 2개, 초록2개 → 둘 다 초록",
  grade("ㅂㅏㅂㅏㅂ", "ㅂㅜㅂㅜㄴ"), expect("🟩⬜🟩⬜⬜"));

/* ---------- 결과 ---------- */
console.log(`\n결과: ${passed} 통과, ${failed} 실패`);
process.exit(failed > 0 ? 1 : 0);
