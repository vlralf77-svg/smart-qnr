// 간단한 로컬 ID 채번 유틸 (서버 연동 전 프론트 프로토타입용)

let counter = 0;

function rand(len = 6): string {
  return Math.random()
    .toString(36)
    .slice(2, 2 + len);
}

export function uid(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${rand(3)}`;
}

export function newFormId(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate(),
  ).padStart(2, '0')}`;
  return `FORM_${ymd}_${rand(4).toUpperCase()}`;
}
