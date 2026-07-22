// 오프라인(데스크톱) 계정 비밀번호 해시 — 평문 저장 방지.
//  보안 컨텍스트(Electron file://, https, localhost)에서는 SHA-256(Web Crypto),
//  아니면 약식 폴백. (백엔드 모드에서는 서버 인증을 사용하므로 이 해시는 미사용)
export async function hashPassword(pw: string): Promise<string> {
  const data = new TextEncoder().encode(pw);
  if (typeof globalThis.crypto?.subtle?.digest === 'function') {
    const buf = await crypto.subtle.digest('SHA-256', data);
    const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    return `sha256:${hex}`;
  }
  // 폴백(비암호) — 보안 컨텍스트가 아닌 경우에만. 평문보다는 낫다.
  let h = 5381;
  for (let i = 0; i < pw.length; i++) h = ((h * 33) ^ pw.charCodeAt(i)) >>> 0;
  return `weak:${h.toString(16)}`;
}
