// SmartQnR 부하 테스트 — 동시 접속 100명(100 VU) 기준
//
// 실행(설치형 k6 필요: https://k6.io):
//   BASE_URL=https://qnr.hospital.example.com k6 run scripts/loadtest.js
//   (로컬 개발: BASE_URL=http://localhost:8080 k6 run scripts/loadtest.js)
//
// 시나리오: 100명이 동시에 접속해 "문진 목록 조회 → 특정 문진 상세 조회"를 반복(환자 사용 흐름).
// 합격 기준(thresholds): 오류율 < 1%, p95 응답 < 800ms. 미달 시 k6 가 비정상 종료 코드 반환.

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    concurrent_100: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 }, // 0→100명 램프업
        { duration: '2m', target: 100 }, // 100명 동시 유지(정상 작동 확인 구간)
        { duration: '30s', target: 0 }, // 램프다운
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'], // 오류율 1% 미만
    http_req_duration: ['p(95)<800'], // 95퍼센타일 800ms 미만
    errors: ['rate<0.01'],
  },
};

export default function () {
  group('문진 목록 조회', () => {
    const listRes = http.get(`${BASE_URL}/api/public/forms`, {
      headers: { Accept: 'application/json' },
      tags: { name: 'GET /api/public/forms' },
    });
    const ok = check(listRes, {
      'list 200': (r) => r.status === 200,
      'list is json array': (r) => Array.isArray(r.json()),
    });
    errorRate.add(!ok);

    // 목록에 문진이 있으면 첫 항목 상세도 조회(읽기 경로 부하)
    if (listRes.status === 200) {
      const forms = listRes.json();
      if (Array.isArray(forms) && forms.length > 0 && forms[0] && forms[0].id != null) {
        const detailRes = http.get(`${BASE_URL}/api/public/forms/${forms[0].id}`, {
          headers: { Accept: 'application/json' },
          tags: { name: 'GET /api/public/forms/{id}' },
        });
        errorRate.add(!check(detailRes, { 'detail 200': (r) => r.status === 200 }));
      }
    }
  });

  // 실제 사용자 간 요청 간격(think time) 모사 — 무한 반복 폭주 방지
  sleep(Math.random() * 2 + 1); // 1~3초
}
