// DB 쿼리 연동 "테스트" 시뮬레이션 — 실제 Oracle 없이 파이프라인을 검증한다.
//  내장 샘플 데이터에 바인드 파라미터(WHERE)로 필터 → 컬럼→앱필드 매핑을 적용해 결과를 만든다.
//  백엔드 DB 연동 배포 후에는 동일한 결과 형태를 실제 쿼리 결과로 대체하면 된다.
import type { DbLinkConfig } from '@/store/useDbLinkStore';
import type { ApiPurpose } from '@/store/useApiConfigStore';

export type SimRow = Record<string, string | number>;

// 화면(purpose)별 병원 DB 가 돌려줄 법한 샘플 행(컬럼 별칭은 기본 쿼리와 맞춤)
const SAMPLE: Record<ApiPurpose, SimRow[]> = {
  patientForms: [
    { formId: 'F001', title: '건강검진 사전 문진', category: '건강검진', patientNo: '10001' },
    { formId: 'F002', title: '수술 전 안전 점검', category: '수술', patientNo: '10001' },
    { formId: 'F010', title: '우울 척도(PHQ-9)', category: '척도검사', patientNo: '20002' },
    { formId: 'F021', title: '낙상 위험 평가', category: '안전', patientNo: '10001' },
    { formId: 'F033', title: '영양 상태 문진', category: '영양', patientNo: '20002' },
  ],
  patientLogin: [
    { patientNo: '10001', name: '홍*동', birth: '1975-03-02' },
    { patientNo: '20002', name: '김*희', birth: '1988-11-20' },
  ],
  custom: [
    { col1: 'A', col2: '1' },
    { col1: 'B', col2: '2' },
  ],
};

export interface SimResult {
  columns: string[];
  rows: SimRow[];
  matched: number;
  effective: Record<string, string>;
  note: string;
}

const findKey = (row: SimRow, name: string): string | undefined =>
  Object.keys(row).find((k) => k.toLowerCase() === name.toLowerCase());

/** 샘플 데이터로 쿼리 파이프라인(필터→매핑)을 시뮬레이션한다. */
export function simulateDbQuery(c: DbLinkConfig, runtime: Record<string, string>): SimResult {
  const base = SAMPLE[c.purpose] ?? [];

  // 효과 파라미터: 고정값 우선, 없으면 실행 시 입력값
  const effective: Record<string, string> = {};
  for (const p of c.params) {
    const v = (p.value ?? '').trim() || (runtime[p.key] ?? '').trim();
    if (p.key && v) effective[p.key] = v;
  }

  // 파라미터 이름과 같은 컬럼이 있으면 그 값으로 필터(= WHERE col = :param)
  let rows = base.filter((row) =>
    Object.entries(effective).every(([k, val]) => {
      const col = findKey(row, k);
      return col ? String(row[col]) === val : true;
    }),
  );

  // 컬럼 → 앱 필드 매핑 적용(매핑이 없으면 원본 컬럼 그대로)
  const maps = c.mappings.filter((m) => m.target && m.column);
  let columns: string[];
  if (maps.length) {
    columns = maps.map((m) => m.target);
    rows = rows.map((row) => {
      const out: SimRow = {};
      for (const m of maps) {
        const col = findKey(row, m.column);
        out[m.target] = col ? row[col] : '';
      }
      return out;
    });
  } else {
    columns = base[0] ? Object.keys(base[0]) : [];
  }

  return {
    columns,
    rows,
    matched: rows.length,
    effective,
    note: '시뮬레이션 결과입니다(내장 샘플 데이터). 실제 값은 백엔드가 병원 DB에 읽기 전용으로 쿼리해 반환합니다.',
  };
}
