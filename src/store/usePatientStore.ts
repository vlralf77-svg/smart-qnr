// 환자(실사용자) 로그인 — 환자 이름 + (환자번호/주민등록번호 선택) 입력.
//  API 연동에 '환자 로그인/인증'이 등록되어 있으면 그 API로 검증한다. (없으면 로컬/데모)
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { IS_DEMO } from '@/config';
import { useApiConfigStore } from '@/store/useApiConfigStore';
import { callEndpoint, extractRecord, isTruthy } from '@/utils/emrFetch';

// 테스트용 번호(데모 모드에서만 통과)
export const TEST_PATIENT_NO = '0000011111';

export type PatientIdType = 'regno' | 'rrn'; // 등록번호 / 주민등록번호

const KEY = 'smartqnr.patient';

interface Saved {
  patientNo: string; // 선택한 식별번호(등록번호 또는 주민등록번호)
  name: string | null;
  idType: PatientIdType | null;
  // 진료 정보(로그인 API 응답에서 매핑되면 채워짐)
  visitDate?: string | null; // 진료일자(예약일자)
  department?: string | null; // 진료과
  doctor?: string | null; // 진료의사
}

function read(): Saved | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

function write(s: Saved) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* 무시 */
  }
}

interface PatientState {
  patientNo: string | null;
  name: string | null;
  idType: PatientIdType | null;
  visitDate: string | null;
  department: string | null;
  doctor: string | null;
  error: string;
  busy: boolean;
  /** 이름 + (환자번호/주민번호)로 로그인. 로그인 API가 등록돼 있으면 그걸로 검증(비동기) */
  login: (p: { name: string; idType: PatientIdType; idValue: string }) => Promise<boolean>;
  /** 딥링크 토큰(번호만)으로 로그인 */
  loginByNumber: (no: string) => boolean;
  logout: () => void;
}

const init = read();

export const usePatientStore = create<PatientState>()(
  devtools(
    (set) => ({
      patientNo: init?.patientNo ?? null,
      name: init?.name ?? null,
      idType: init?.idType ?? null,
      visitDate: init?.visitDate ?? null,
      department: init?.department ?? null,
      doctor: init?.doctor ?? null,
      error: '',
      busy: false,
      login: async ({ name, idType, idValue }) => {
        const n = name.trim();
        // 주민등록번호는 화면에만 '-'를 표시하고, 검증·전송·저장은 숫자만으로 처리
        const v = idType === 'rrn' ? idValue.replace(/\D/g, '') : idValue.trim();
        if (!n) {
          set({ error: '환자 이름을 입력해 주세요.' });
          return false;
        }
        if (!v) {
          set({
            error: idType === 'rrn' ? '주민등록번호를 입력해 주세요.' : '환자번호를 입력해 주세요.',
          });
          return false;
        }
        // 주민등록번호 길이 체크(하이픈 제외 13자리)
        if (idType === 'rrn' && v.replace(/\D/g, '').length !== 13) {
          set({ error: '주민등록번호는 13자리로 입력해 주세요. (앞 6자리 - 뒤 7자리)' });
          return false;
        }

        // 등록된 '환자 로그인/인증' API가 있으면 그걸로 검증
        const ep = useApiConfigStore
          .getState()
          .endpoints.find((e) => e.enabled && e.purpose === 'patientLogin' && e.url.trim());
        if (ep) {
          set({ busy: true, error: '' });
          const vars: Record<string, string> = { patientName: n, patientNo: v };
          if (idType === 'rrn') vars.rrn = v;
          else vars.regno = v;
          const res = await callEndpoint(ep, vars);
          const rec = extractRecord(res.data, ep.rootPath, ep.mappings);
          let ok = res.ok;
          const hasValidField = ep.mappings.some((m) => m.target === 'valid' && m.source.trim());
          if (hasValidField) ok = ok && isTruthy(rec.valid);
          else if (ep.mappings.some((m) => m.target && m.source.trim()))
            ok = ok && !!(rec.patientNo || rec.name);
          if (!ok) {
            set({
              busy: false,
              error: '환자 정보를 확인할 수 없습니다. 이름/번호를 확인해 주세요.',
            });
            return false;
          }
          const str = (x: unknown): string | null =>
            x != null && String(x).trim() ? String(x).trim() : null;
          const s: Saved = {
            patientNo: rec.patientNo != null && String(rec.patientNo) ? String(rec.patientNo) : v,
            name: rec.name != null && String(rec.name) ? String(rec.name) : n,
            idType,
            visitDate: str(rec.visitDate),
            department: str(rec.department),
            doctor: str(rec.doctor),
          };
          write(s);
          set({ ...s, busy: false, error: '' });
          return true;
        }

        // API 미설정 → 로컬(데모: 테스트번호만 / 운영: 입력값 허용)
        if (IS_DEMO && v !== TEST_PATIENT_NO) {
          set({ error: `등록되지 않은 번호입니다. (테스트: ${TEST_PATIENT_NO})` });
          return false;
        }
        // 데모에서는 진료 정보 예시를 채워 화면 구성을 확인할 수 있게 함(운영 로컬은 미표시)
        const demoVisit = IS_DEMO
          ? {
              visitDate: new Date().toISOString().slice(0, 10),
              department: '내과',
              doctor: '김의사',
            }
          : { visitDate: null, department: null, doctor: null };
        const s: Saved = { patientNo: v, name: n, idType, ...demoVisit };
        write(s);
        set({ ...s, error: '' });
        return true;
      },
      loginByNumber: (no) => {
        const v = (no || '').trim();
        if (!v) return false;
        if (IS_DEMO && v !== TEST_PATIENT_NO) {
          set({ error: '등록되지 않은 번호입니다.' });
          return false;
        }
        const s: Saved = {
          patientNo: v,
          name: null,
          idType: 'regno',
          visitDate: null,
          department: null,
          doctor: null,
        };
        write(s);
        set({ ...s, error: '' });
        return true;
      },
      logout: () => {
        try {
          sessionStorage.removeItem(KEY);
        } catch {
          /* 무시 */
        }
        set({
          patientNo: null,
          name: null,
          idType: null,
          visitDate: null,
          department: null,
          doctor: null,
          error: '',
        });
      },
    }),
    { name: 'patient' },
  ),
);
