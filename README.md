# SmartQnR — 병원 문진(問診) 디지털 솔루션

병원 문진표를 손쉽게 제작·배포·수집하는 솔루션. 종이/한글(HWP) 양식을 업로드하면
자동으로 디지털 문진 초안으로 변환하고, 담당자가 검수·수정하여 즉시 배포한다.

> 본 저장소는 **프론트엔드(문진 에디터/렌더러) 우선** 단계입니다. Oracle 저장 등
> 백엔드(Java/Spring Boot)는 후속 Phase에서 연결합니다.
> **관리용 프로그램은 Windows `.exe`(Electron)로 패키징**됩니다.

## 구성

| 화면 | 경로 | 설명 |
|------|------|------|
| QNR001 문진 목록 | `/#/` | 양식 리스트·상태·검색, 새 문진/문서 변환 진입 |
| QNR002 문서 변환 | `/#/upload` | PDF/DOCX → 로컬 규칙 기반 자동 변환(오픈소스, 외부 API 미사용) / JSON 임포트 / 빈 문진 시작 |
| QNR003 문진 에디터 | `/#/editor/:id` | 섹션 추가·삭제, 문항 자유 배치(드래그 이동·모서리 리사이즈), 선택지·조건부 로직, 실시간 미리보기, 발행 |
| QNR004 응답 화면 | `/#/respond/:id` | 발행 문진 응답·제출 (웹/모바일 공용) |

## 문서 자동 변환 (모두 로컬·오픈소스, 외부 API 미사용)

두 가지 변환 경로가 있다.

### PDF → 원본 그대로 + 입력필드 오버레이 (권장)
- [`src/utils/pdfImport.ts`](src/utils/pdfImport.ts)가 `pdfjs`로 각 페이지를 **이미지로 렌더해
  배경으로** 쓰고, 텍스트 좌표에서 체크박스(□○)·빈칸(밑줄)을 감지해 그 위에 입력필드를 자동 배치한다.
- 결과가 **원본 PDF와 시각적으로 동일**하며 표·레이아웃이 그대로 유지된다(병원 문진표처럼 표 중심
  양식에 적합).
- 자동 배치는 근사이므로, 오버레이 에디터([`OverlayEditor`](src/components/editor/OverlayEditor.tsx))에서
  필드를 **드래그로 이동·리사이즈**해 미세 조정한다. 렌더러는 [`OverlayRenderer`](src/components/renderer/OverlayRenderer.tsx).
- **웹/데스크톱 모두** 동작한다(pdfjs가 브라우저에서 실행).

### DOCX → 규칙 기반 텍스트 변환 (데스크톱 전용)
- [`electron/ruleParser.cjs`](electron/ruleParser.cjs)가 정규식·휴리스틱으로 텍스트를 문항으로 추론한다.
  텍스트 추출은 `mammoth`. 표 중심 양식은 정확도가 낮아 PDF 변환을 권장한다.

HWP/HWPX·구 `.doc`는 아직 미지원 — PDF로 저장 후 업로드하면 변환 가능하다. 모든 변환은 외부 API 없이
로컬에서만 처리된다.

> ⚠️ PDF 배경 이미지는 현재 폼과 함께 브라우저 `localStorage`에 저장되므로, 페이지가 매우 많은 대형
> PDF는 저장 용량 한계를 넘을 수 있다. 백엔드 연동 시 이미지·응답은 서버 저장으로 전환한다.

## 문항 자유 배치(캔버스)

- QNR003 에디터는 섹션마다 [`react-grid-layout`](https://github.com/react-grid-layout/react-grid-layout)
  기반 캔버스([`LayoutCanvas`](src/components/editor/LayoutCanvas.tsx))로 문항을 렌더링한다.
  드래그로 위치 이동, 모서리로 크기 조절이 가능하며 12열 그리드 단위(`Question.layout`)로 저장된다.
- 응답 화면([`SectionQuestions`](src/components/renderer/SectionQuestions.tsx))은 데스크톱(≥600px)에서는
  저장된 좌표대로 CSS Grid 로 렌더링하고, 모바일 좁은 화면에서는 좌표를 무시하고 읽기 순서(위→아래,
  좌→우)로 세로 스택 렌더링한다 — 자유 배치가 모바일 문진 응답성을 해치지 않도록 하는 폴백이다.
- `layout` 이 없는 문항(구버전 데이터·JSON 임포트)은 배열 순서대로 자동 스택 배치된다(하위 호환).

## 핵심 계약(스키마)

프론트/백엔드/변환기가 공유하는 단일 문진 스키마는 [`src/types/schema.ts`](src/types/schema.ts)
에 정의되어 있다. 임의 입력(자동 변환 결과·JSON 임포트)은
[`src/utils/schemaValidator.ts`](src/utils/schemaValidator.ts) 가 안전한 스키마로 정규화한다.

지원 문항 유형: `radio` `checkbox` `select` `text` `textarea` `number` `date`
`boolean` `scale` `info` (`signature` 는 Phase3).

## 기술 스택

- React 18 + Vite + TypeScript
- MUI v5 · Zustand(에디터/저장 상태) · @dnd-kit(드래그 정렬) · react-hook-form(응답 검증)
- 관리 프로그램 패키징: **Electron + electron-builder (Windows NSIS `.exe`)**
- 데이터 영속화: 현재는 브라우저 `localStorage`(프로토타입). 백엔드 연동 시 REST API 로 대체.

## 개발

```bash
npm install            # (설치)  ※ 아래 Electron 설치 참고
npm run dev            # 웹 개발 서버 (http://localhost:5173)
npm run build          # 타입체크 + 프로덕션 번들(dist/)
npm run electron:dev   # Electron 창으로 개발 실행
```

### Windows `.exe` 빌드

`.exe` 패키징은 **Windows 환경**에서 수행한다(로컬 Windows 또는 CI).

```bash
npm run electron:build      # dist 빌드 후 electron-builder --win nsis → release/*.exe
```

- GitHub Actions [`build-exe.yml`](.github/workflows/build-exe.yml) 워크플로가
  `windows-latest` 러너에서 자동으로 `.exe` 아티팩트를 생성한다
  (수동 실행 또는 `v*` 태그 푸시 시).
- 리눅스/맥에서는 Electron 바이너리 다운로드가 필요하므로 설치 시
  `ELECTRON_SKIP_BINARY_DOWNLOAD=1` 로 스킵하고, 실제 실행/패키징은 Windows 에서 한다.

## 로드맵

- **현재(프론트+로컬 변환)**: 에디터/렌더러/목록, 스키마 계약·검증, 로컬 규칙 기반 문서 변환,
  `.exe` 패키징 + 자동 업데이트
- **백엔드 Phase**: HWP/HWPX 파서, Oracle 저장/버전, REST API
- **Phase 2+**: 조건부 로직 고도화, 버전 비교/복원, 응답 관리·CSV/Excel 내보내기, EMR 연동
