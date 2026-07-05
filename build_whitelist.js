/* ============================================================
 * korean_words.txt (EUC-KR) → whitelist.txt 생성
 * 실행:  node build_whitelist.js
 *
 * 필터 조건:
 *   1) 품사가 정확히 "명"
 *   2) 단어에서 숫자(0-9) 제거 후 중복 제거
 *   3) 자모 분해 결과가 정확히 5개
 *   4) blacklist.txt에 있는 단어는 제외
 *
 * 출력 형식(탭 구분):  단어<TAB>등급   (예: 가게	A)
 * 중복(숫자만 다른 동음이의어)이 서로 다른 등급이면 가장 쉬운(A<B<C) 등급을 남긴다.
 * ============================================================ */
const fs = require("fs");
const path = require("path");
const { decompose } = require("./logic.js");

const DATA = path.join(__dirname, "data");
const SRC = path.join(DATA, "korean_words.txt");
const OUT = path.join(DATA, "whitelist.txt");
const OUT_JS = path.join(__dirname, "words.js");   // 브라우저 임베드용(file:// 대응)
const BLACKLIST = path.join(DATA, "blacklist.txt");

// EUC-KR(CP949)로 저장된 원본을 디코드
const raw = new TextDecoder("euc-kr").decode(fs.readFileSync(SRC));
const lines = raw.split(/\r?\n/);

// 제외 목록 (한 줄에 단어 하나, UTF-8). 없으면 빈 집합.
const blacklist = new Set(
  fs.existsSync(BLACKLIST)
    ? fs.readFileSync(BLACKLIST, "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
    : []
);

// 헤더: 순위 \t 단어 \t 품사 \t 풀이 \t 등급
const GRADE_RANK = { A: 0, B: 1, C: 2 };   // 낮을수록 쉬움
const byWord = new Map();                  // clean → { word, grade }
const order = [];                          // 첫 등장 순서 유지
let total = 0, noun = 0, five = 0, blocked = 0;

for (let i = 1; i < lines.length; i++) {   // 0번은 헤더
  const line = lines[i];
  if (!line.trim()) continue;
  const cols = line.split("\t");
  if (cols.length < 3) continue;
  total++;

  const word = cols[1];
  const pos = cols[2];
  const grade = (cols[4] || "").trim();

  // 1) 품사가 정확히 "명"
  if (pos !== "명") continue;
  noun++;

  // 2) 숫자 제거
  const clean = word.replace(/[0-9]/g, "");
  if (!clean) continue;

  // 3) 자모 분해 길이 5
  if (decompose(clean).length !== 5) continue;
  five++;

  // 4) blacklist 제외
  if (blacklist.has(clean)) { blocked++; continue; }

  // 2) 중복 제거 (숫자 제거 이후 기준) — 등급이 다르면 더 쉬운 쪽 유지
  const prev = byWord.get(clean);
  if (!prev) {
    byWord.set(clean, { grade });
    order.push(clean);
  } else if ((GRADE_RANK[grade] ?? 9) < (GRADE_RANK[prev.grade] ?? 9)) {
    prev.grade = grade;
  }
}

// 등급순(A→B→C) 정렬, 같은 등급 안에서는 기존(등장) 순서 유지 — 안정 정렬
const sorted = order
  .map((w, i) => ({ w, i, grade: byWord.get(w).grade }))
  .sort((a, b) =>
    ((GRADE_RANK[a.grade] ?? 9) - (GRADE_RANK[b.grade] ?? 9)) || (a.i - b.i)
  )
  .map((x) => x.w);

const result = sorted.map((w) => `${w}\t${byWord.get(w).grade}`);
fs.writeFileSync(OUT, result.join("\n") + "\n", "utf8");

// 브라우저 임베드용 words.js — 등급별로 묶어서 내보낸다 (file://에서 fetch 불가 대응)
const byGrade = {};
for (const w of order) {
  const g = byWord.get(w).grade || "";
  (byGrade[g] ||= []).push(w);
}
const jsBody =
  "/* 자동 생성 파일 — build_whitelist.js 로 재생성. 직접 수정하지 마세요. */\n" +
  "(function (root) {\n" +
  "  const WORDS_BY_GRADE = " + JSON.stringify(byGrade, null, 2) + ";\n" +
  "  const api = { WORDS_BY_GRADE };\n" +
  "  if (typeof module !== 'undefined' && module.exports) module.exports = api;\n" +
  "  else root.KordleWords = api;\n" +
  "})(typeof globalThis !== 'undefined' ? globalThis : this);\n";
fs.writeFileSync(OUT_JS, jsBody, "utf8");

const gradeCount = order.reduce((acc, w) => {
  const g = byWord.get(w).grade || "(없음)";
  acc[g] = (acc[g] || 0) + 1;
  return acc;
}, {});

console.log(`전체 표제어:        ${total}`);
console.log(`품사 "명":          ${noun}`);
console.log(`자모 5개(중복 포함): ${five}`);
console.log(`blacklist 제외:      ${blocked}`);
console.log(`최종(중복 제거):     ${result.length}`);
console.log(`등급 분포:          ${JSON.stringify(gradeCount)}`);
console.log(`→ ${path.basename(OUT)} 생성 완료 (UTF-8, "단어<TAB>등급")`);
console.log(`→ ${path.basename(OUT_JS)} 생성 완료 (브라우저 임베드용)`);
