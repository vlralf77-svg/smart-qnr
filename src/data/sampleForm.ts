import { FormSchema } from '@/types/schema';

// 작업지시서 §3.1 예시 기반 샘플 (첫 실행 시 seed)
export const SAMPLE_FORM: FormSchema = {
  id: 'FORM_SAMPLE_ANES',
  title: '수술 전 마취 문진표',
  description: '수술 전 마취과 진료를 위한 문진입니다. AI가 생성한 초안이니 확인·수정하세요.',
  version: 1,
  status: 'draft',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  sections: [
    {
      id: 'sec_1',
      title: '기본 정보',
      questions: [
        {
          id: 'q_sex',
          type: 'radio',
          label: '성별',
          required: true,
          options: [
            { id: 'o_m', label: '남', value: 'M' },
            { id: 'o_f', label: '여', value: 'F' },
          ],
        },
        {
          id: 'q_birth',
          type: 'date',
          label: '생년월일',
          required: true,
        },
        {
          id: 'q_weight',
          type: 'number',
          label: '체중 (kg)',
          required: false,
          min: 0,
          max: 300,
        },
      ],
    },
    {
      id: 'sec_2',
      title: '병력 및 복용약물',
      questions: [
        {
          id: 'q_history',
          type: 'checkbox',
          label: '과거 병력 (해당사항 모두 선택)',
          required: false,
          allowEtc: true,
          options: [
            { id: 'o_htn', label: '고혈압', value: 'HTN' },
            { id: 'o_dm', label: '당뇨', value: 'DM' },
            { id: 'o_heart', label: '심장질환', value: 'HEART' },
          ],
        },
        {
          id: 'q_med_yn',
          type: 'boolean',
          label: '현재 복용 중인 약물이 있습니까?',
          required: true,
        },
        {
          id: 'q_med_detail',
          type: 'textarea',
          label: '현재 복용 중인 약물을 적어주세요',
          required: false,
          placeholder: '약물명 / 용량 / 복용기간',
          condition: { questionId: 'q_med_yn', operator: 'equals', value: 'yes' },
        },
      ],
    },
    {
      id: 'sec_3',
      title: '통증 평가',
      questions: [
        {
          id: 'q_info',
          type: 'info',
          label: '아래 척도는 현재 느끼는 통증 정도(0: 없음 ~ 10: 매우 심함)를 나타냅니다.',
        },
        {
          id: 'q_pain',
          type: 'scale',
          label: '현재 통증 점수 (NRS)',
          required: false,
          min: 0,
          max: 10,
          step: 1,
        },
      ],
    },
  ],
};
