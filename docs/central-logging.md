# 중앙 로그 수집 API 규격 (SmartQnR)

여러 사용자(PC)의 화면 로그를 한곳에서 조회하려면 사내에 아래 규격의 로그 수집 API가 있어야 합니다.
앱에서는 **로그 보기 → 중앙(전체 사용자) 탭**에서 주소를 입력하고 "전송 사용"을 켜면 동작합니다.

수집 API 주소(하나)를 **전송(POST)** 과 **조회(GET)** 에 공용으로 사용합니다.
예: `https://logs.hospital.local/client-logs`

## 1) 전송(ingest) — 클라이언트 → 서버

```
POST {url}
Content-Type: application/json

{
  "logs": [
    {
      "ts": "2026-07-30T04:12:33.120Z",  // ISO8601
      "level": "error | warn | info | api | debug",
      "message": "…",
      "detail": "스택/응답 본문 등(선택)",
      "sessionId": "s_xxx",              // 앱 실행 세션 식별자
      "userId": "kim",                    // 로그인 아이디(환자는 patient:번호)
      "userName": "김간호",
      "department": "마취과",
      "role": "staff | patient",
      "appVersion": "0.5.9",
      "platform": "electron | web",
      "route": "#/editor/new"
    }
    // … 최대 100건/요청
  ]
}
```
- 성공: `200` 또는 `204`. 실패 시 앱은 다음 주기(4초)에 재전송합니다.
- 서버는 받은 로그를 DB/로그저장소에 append 하면 됩니다. (중복 방지는 `sessionId`+`ts`+`message` 기준 권장)

## 2) 조회(query) — 관리자 화면 → 서버

```
GET {url}?user={검색어}&level={레벨}&q={메시지검색}&limit={건수}
```
- 응답: 로그 배열(또는 `{ "logs": [...] }`). 각 항목 필드는 전송 payload와 동일하며,
  최소 `ts`, `level`, `message`, `userId`/`userName`, `department` 를 포함하면 화면에 그대로 표시됩니다.
- `user` 는 아이디/이름 부분일치, `level` 은 단일 레벨(`all`이면 전체), `q` 는 메시지 검색어입니다.

## 참고
- 앱은 CORS 우회를 위해 데스크톱(Electron)에서는 메인 프로세스로 요청합니다. 웹 배포 시에는 수집 서버가 **CORS** 를 허용해야 합니다.
- 인증이 필요하면 헤더 방식(예: 고정 API Key)을 알려주시면 전송/조회에 헤더를 추가하겠습니다.
- 개인정보(환자 식별정보)가 로그 detail에 포함되지 않도록 앱 측에서 주의하며, 보존기간/접근권한은 서버 정책을 따릅니다.
