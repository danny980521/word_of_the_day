/* ============================================================
 * Kordle 핵심 로직 (게임과 테스트가 공유하는 단일 소스)
 * 브라우저(<script src>)와 Node(require) 양쪽에서 로드 가능
 * ============================================================ */
(function (root) {
  "use strict";

  /* ---------- 한글 → 기본 자모 분해 ---------- */
  const CHO  = [..."ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"];
  const JUNG = [..."ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"];
  const JONG = ["", ..."ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ"];

  // 복합 자모 → 기본 자모 조합 (예: ㄲ→ㄱㄱ, ㅐ→ㅏㅣ)
  const SPLIT = {
    "ㄲ":"ㄱㄱ","ㄸ":"ㄷㄷ","ㅃ":"ㅂㅂ","ㅆ":"ㅅㅅ","ㅉ":"ㅈㅈ",
    "ㄳ":"ㄱㅅ","ㄵ":"ㄴㅈ","ㄶ":"ㄴㅎ","ㄺ":"ㄹㄱ","ㄻ":"ㄹㅁ","ㄼ":"ㄹㅂ",
    "ㄽ":"ㄹㅅ","ㄾ":"ㄹㅌ","ㄿ":"ㄹㅍ","ㅀ":"ㄹㅎ","ㅄ":"ㅂㅅ",
    "ㅐ":"ㅏㅣ","ㅒ":"ㅑㅣ","ㅔ":"ㅓㅣ","ㅖ":"ㅕㅣ",
    "ㅘ":"ㅗㅏ","ㅙ":"ㅗㅏㅣ","ㅚ":"ㅗㅣ","ㅝ":"ㅜㅓ","ㅞ":"ㅜㅓㅣ","ㅟ":"ㅜㅣ","ㅢ":"ㅡㅣ"
  };

  function decompose(word) {
    let out = "";
    for (const ch of word) {
      const code = ch.charCodeAt(0) - 0xAC00;
      if (code < 0 || code > 11171) continue;
      const cho = CHO[Math.floor(code / 588)];
      const jung = JUNG[Math.floor((code % 588) / 28)];
      const jong = JONG[code % 28];
      for (const j of [cho, jung, jong]) {
        if (j) out += (SPLIT[j] || j);
      }
    }
    return [...out];
  }

  /* ---------- 채점 (중복 자모 처리 포함) ----------
   * 규칙:
   *  1) 정답에 없는 자모 → 회색(absent)
   *  2) 위치까지 일치 → 초록(correct). 초록 우선.
   *  3) 정답에 있으나 위치가 틀림 → 남은 개수만큼 앞에서부터 노랑(present),
   *     초과분은 회색.
   */
  function evaluate(guess, answer) {
    const len = answer.length;
    const res = new Array(len).fill("absent");
    const remain = {};
    // 1패스: 초록 확정 + 나머지 정답 자모 개수 집계
    for (let i = 0; i < len; i++) {
      if (guess[i] === answer[i]) res[i] = "correct";
      else remain[answer[i]] = (remain[answer[i]] || 0) + 1;
    }
    // 2패스: 앞에서부터 노랑 배분
    for (let i = 0; i < len; i++) {
      if (res[i] === "correct") continue;
      if (remain[guess[i]] > 0) { res[i] = "present"; remain[guess[i]]--; }
    }
    return res;
  }

  /* ---------- 정답 후보 (모두 자모 5개로 분해됨) ---------- */
  const WORDS = ["어둠", "규칙", "비용", "부분", "까치", "개미"];

  const api = { CHO, JUNG, JONG, SPLIT, decompose, evaluate, WORDS };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.KordleLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
