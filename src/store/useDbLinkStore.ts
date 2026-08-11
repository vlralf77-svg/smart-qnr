// DB(쿼리) 연동 설정 — API 대신 병원 DB(Oracle 등)에 직접 쿼리해서 데이터를 받아온다.
//  실제 접속·쿼리 실행은 백엔드(Spring Boot)에서 수행한다(프론트는 DB 직접 접속 불가).
//  여기서는 접속 정보(TNS/JDBC)·쿼리·컬럼 매핑만 설정·저장한다.
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { ApiPurpose } from './useApiConfigStore';

export type DbConnMode = 'ezconnect' | 'tns' | 'jdbc';

export interface DbFieldMapping {
  target: string; // 앱 필드(key)
  column: string; // DB 컬럼/별칭
}
export interface DbBindParam {
  key: string; // 바인드 변수명(:key)
  value: string; // 고정값(비우면 실행 시 입력)
}

export interface DbLinkConfig {
  enabled: boolean;
  name: string;
  purpose: ApiPurpose;
  mode: DbConnMode;
  // ezconnect
  host: string;
  port: string;
  serviceName: string;
  // tns
  tnsAlias: string;
  tnsAdmin: string; // tnsnames.ora 위치(TNS_ADMIN)
  // jdbc
  jdbcUrl: string;
  // 인증(비밀번호는 운영에서 서버 secret 로 주입 권장)
  user: string;
  password: string;
  // 쿼리 + 바인드 파라미터
  query: string;
  params: DbBindParam[];
  // DB 컬럼 → 앱 필드 매핑
  mappings: DbFieldMapping[];
}

interface DbLinkState {
  config: DbLinkConfig;
  update: (patch: Partial<DbLinkConfig>) => void;
  reset: () => void;
}

const DEFAULT: DbLinkConfig = {
  enabled: false,
  name: '병원 EMR DB',
  purpose: 'patientForms',
  mode: 'ezconnect',
  host: '',
  port: '1521',
  serviceName: '',
  tnsAlias: '',
  tnsAdmin: '',
  jdbcUrl: '',
  user: '',
  password: '',
  query:
    'SELECT form_id AS "formId", title AS "title", category AS "category"\nFROM qnr_forms\nWHERE patient_no = :patientNo',
  params: [{ key: 'patientNo', value: '' }],
  mappings: [],
};

/** 접속 정보로 JDBC URL 을 생성(미리보기·백엔드 전달용) */
export function buildJdbcUrl(c: DbLinkConfig): string {
  if (c.mode === 'jdbc') return c.jdbcUrl.trim();
  if (c.mode === 'tns') return c.tnsAlias.trim() ? `jdbc:oracle:thin:@${c.tnsAlias.trim()}` : '';
  // ezconnect
  const host = c.host.trim();
  const port = c.port.trim() || '1521';
  const svc = c.serviceName.trim();
  return host && svc ? `jdbc:oracle:thin:@//${host}:${port}/${svc}` : '';
}

export const useDbLinkStore = create<DbLinkState>()(
  devtools(
    persist(
      (set) => ({
        config: DEFAULT,
        update: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),
        reset: () => set({ config: DEFAULT }),
      }),
      { name: 'smartqnr-dblink' },
    ),
    { name: 'dblink' },
  ),
);
