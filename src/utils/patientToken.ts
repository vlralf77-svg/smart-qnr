// 환자 링크용 토큰 — 환자번호를 URL에 그대로 노출하지 않도록 난독화(URL-safe)한다.
//  주의: 이는 "번호 감추기(난독화)"이며 강력한 암호화가 아니다. 진짜 보안이 필요하면
//  백엔드에서 일회용 토큰을 발급/검증하는 방식으로 교체할 것.
const SECRET = 'smartqnr-link-v1';

// 문자열을 고정 키로 XOR (대칭: 같은 함수로 복호화)
function xor(str: string): string {
  let out = '';
  for (let i = 0; i < str.length; i++) {
    out += String.fromCharCode(str.charCodeAt(i) ^ SECRET.charCodeAt(i % SECRET.length));
  }
  return out;
}

function toBase64Url(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return atob(b64);
}

/** 환자번호 → 링크에 넣을 토큰 */
export function encodePatientToken(no: string): string {
  return toBase64Url(xor(no.trim()));
}

/** 링크 토큰 → 환자번호(복원 실패 시 null) */
export function decodePatientToken(token: string): string | null {
  try {
    const no = xor(fromBase64Url(token.trim()));
    // 숫자로만 이루어진 환자번호만 유효로 간주(손상된 토큰 방지)
    return /^\d+$/.test(no) ? no : null;
  } catch {
    return null;
  }
}
