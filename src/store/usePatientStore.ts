// 환자(실사용자) 로그인 — 환자 이름 + (등록번호/주민등록번호 선택) 입력. (테스트: 0000011111)
import { create } from 'zustand';
import { IS_DEMO } from '@/config';

// 테스트용 번호(데모 모드에서만 통과)
export const TEST_PATIENT_NO = '0000011111';

export type PatientIdType = 'regno' | 'rrn'; // 등록번호 / 주민등록번호

const KEY = 'smartqnr.patient';

interface Saved {
  patientNo: string; // 선택한 식별번호(등록번호 또는 주민등록번호)
  name: string | null;
  idType: PatientIdType | null;
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
  error: string;
  /** 이름 + (등록번호/주민번호)로 로그인 */
  login: (p: { name: string; idType: PatientIdType; idValue: string }) => boolean;
  /** 딥링크 토큰(번호만)으로 로그인 */
  loginByNumber: (no: string) => boolean;
  logout: () => void;
}

const init = read();

export const usePatientStore = create<PatientState>((set) => ({
  patientNo: init?.patientNo ?? null,
  name: init?.name ?? null,
  idType: init?.idType ?? null,
  error: '',
  login: ({ name, idType, idValue }) => {
    const n = name.trim();
    const v = idValue.trim();
    if (!n) {
      set({ error: '환자 이름을 입력해 주세요.' });
      return false;
    }
    if (!v) {
      set({ error: idType === 'rrn' ? '주민등록번호를 입력해 주세요.' : '등록번호를 입력해 주세요.' });
      return false;
    }
    // 데모 모드: 지정 테스트 번호만 통과. 운영 모드: 입력값 허용(대상 검증은 EMR/백엔드가 수행)
    if (IS_DEMO && v !== TEST_PATIENT_NO) {
      set({ error: `등록되지 않은 번호입니다. (테스트: ${TEST_PATIENT_NO})` });
      return false;
    }
    const s: Saved = { patientNo: v, name: n, idType };
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
    const s: Saved = { patientNo: v, name: null, idType: 'regno' };
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
    set({ patientNo: null, name: null, idType: null, error: '' });
  },
}));
