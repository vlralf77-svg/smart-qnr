// 섹션별 색상 — 채도를 낮춘 톤(편집기 섹션 색상 순서와 동일 색조).
// 조회 화면·입력(PC) 등 여러 화면에서 공유해 섹션 색을 일관되게 유지한다.
//  tint=아주 옅은 배경, bar=중간 톤 강조, text=읽기 좋은 진한 같은 계열
export interface SectionPalette {
  tint: string;
  bar: string;
  text: string;
}

export const SECTION_PALETTE: SectionPalette[] = [
  { tint: '#f3f6ff', bar: '#5b7cfa', text: '#3a4db3' }, // 블루
  { tint: '#f0faf5', bar: '#3f9d7c', text: '#2f7a5f' }, // 그린
  { tint: '#fdf6ec', bar: '#d59a4e', text: '#9c6a1c' }, // 앰버
  { tint: '#f7f4ff', bar: '#8b6fd0', text: '#6a4fb0' }, // 바이올렛
  { tint: '#edf9fa', bar: '#3fa3ad', text: '#2b7d86' }, // 틸
  { tint: '#fdf2f6', bar: '#d6738f', text: '#ad546e' }, // 로즈
  { tint: '#f3f5f8', bar: '#6b7a90', text: '#48546a' }, // 슬레이트
  { tint: '#f8f4f1', bar: '#a17c68', text: '#7a5a48' }, // 브라운
];

export const paletteFor = (index: number): SectionPalette =>
  SECTION_PALETTE[index % SECTION_PALETTE.length];
