// 환자(실사용자) 로그인 — 환자번호만 입력. (테스트: 0000011111)
import { create } from 'zustand';

// 테스트용 환자번호
export const TEST_PATIENT_NO = '0000011111';

const KEY = 'smartqnr.patient';

function read(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

interface PatientState {
  patientNo: string | null;
  error: string;
  login: (no: string) => boolean;
  logout: () => void;
}

export const usePatientStore = create<PatientState>((set) => ({
  patientNo: read(),
  error: '',
  login: (no) => {
    const trimmed = no.trim();
    // 테스트: 지정된 환자번호만 허용
    if (trimmed === TEST_PATIENT_NO) {
      try {
        sessionStorage.setItem(KEY, trimmed);
      } catch {
        /* 무시 */
      }
      set({ patientNo: trimmed, error: '' });
      return true;
    }
    set({ error: `등록되지 않은 환자번호입니다. (테스트: ${TEST_PATIENT_NO})` });
    return false;
  },
  logout: () => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* 무시 */
    }
    set({ patientNo: null, error: '' });
  },
}));
