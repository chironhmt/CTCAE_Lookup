# CTCAE Lookup 웹앱 — 프로젝트 계획

- 상태: **pending approval** (실행 승인 전)
- 작성일: 2026-10-18
- 근거 문서: `PRD.md`

## 1. 요구사항 요약

| 항목 | 결정 | 근거 |
|---|---|---|
| 목적 | 혈액질환 항암치료 환자의 부작용을 빠르게 grading | PRD.md:1-3 |
| 사용자 | 혈액종양내과 전문의, 전담 간호사, 연구 간호사 | PRD.md:5-8 |
| 기준 버전 | **CTCAE v6.0**, NCI 공식 XLSX | 인터뷰 결정 |
| 기본 목록 | 아래 12개 항목 | 인터뷰 결정 |
| 검색 언어 | **영어만** (CTCAE 용어, 동의어, 약어) | 인터뷰 결정 |
| UI 언어 | **영어만** (모든 화면 문구·안내·오류 메시지) | 인터뷰 결정 |
| 배포 | 공개 정적 웹(Vercel), 로그인·서버·환자정보 없음 | 인터뷰 결정 |
| 저장 | 즐겨찾기와 최근 검색어는 브라우저 `localStorage` | 인터뷰 결정 |

**기본 목록 (12개):** Anemia, Neutrophil count decreased, Platelet count decreased, White blood cell decreased, Febrile neutropenia, Nausea, Vomiting, Diarrhea, Oral mucositis, Fatigue, Peripheral sensory neuropathy, Infusion related reaction
> v6.0에서 이름이 바뀌거나 합쳐진 용어가 있을 수 있습니다. 2단계에서 v6.0 원본과 하나씩 대조해 확정합니다.

**범위**
- P0 (MVP): 기본 목록의 정의와 Grade 1–5 표시, 영어 검색 후 정의와 Grade 표시
- P1: 기본 목록 추가·삭제, 최근 검색어 표시
- P2 (이번 범위 밖, 설계만 대비): 개정판 파일을 불러와 데이터 갱신

## 2. 기술 선택

| 영역 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | Vite + React + TypeScript | 서버가 필요 없는 정적 SPA에 맞고 빌드가 단순합니다 |
| 데이터 | 빌드 시 XLSX를 JSON으로 변환해 번들에 포함 | 런타임 파싱이 없고 오프라인에서도 동작합니다 |
| XLSX 파싱 | SheetJS (`xlsx`), 빌드 스크립트에서만 사용 | 앱 번들에는 포함하지 않습니다 |
| 검색 | 메모리 내 검색: 접두어·부분일치 우선, 오타 허용(Fuse.js) 보조 | 약 800~900개 용어 규모라 서버 검색이 필요 없습니다 |
| 스타일 | Tailwind CSS | 반응형 레이아웃을 빠르게 만들 수 있습니다 |
| 테스트 | Vitest + Testing Library, Playwright(e2e) | |
| 배포 | Vercel 정적 호스팅 | |

**대안 검토:** Next.js는 SSR과 API가 필요 없어 과합니다. 서버 DB 방식은 로그인이 없다는 결정과 맞지 않아 제외했습니다.

## 3. 데이터 모델

```ts
// src/data/types.ts
interface CtcaeTerm {
  id: string;            // MedDRA code (안정적인 키)
  term: string;          // "Neutrophil count decreased"
  soc: string;           // System Organ Class
  definition: string;
  grades: { 1?: string; 2?: string; 3?: string; 4?: string; 5?: string }; // "-" 는 해당 없음
  navigationalNote?: string;
}
interface CtcaeDataset { version: "6.0"; source: string; generatedAt: string; terms: CtcaeTerm[] }
```

- 즐겨찾기는 `id` 배열로 저장합니다(`localStorage["ctcae.favorites.v1"]`). 버전이 바뀌어도 MedDRA 코드로 다시 연결할 수 있어 P2에 대비됩니다.
- 최근 검색어는 최대 10개, 중복을 없애고 최신순으로 저장합니다(`localStorage["ctcae.recent.v1"]`).

## 4. 구현 단계

| # | 단계 | 산출물 | 완료 기준 |
|---|---|---|---|
| 1 | 프로젝트 골격 | `package.json`, `vite.config.ts`, `src/main.tsx`, lint/test 설정 | `npm run dev`, `npm test`, `npm run build` 성공 |
| 2 | 데이터 변환 | `data/raw/CTCAE_v6.0.xlsx`(원본), `scripts/build-data.ts`, `src/data/ctcae-v6.json`, `src/data/defaults.ts` | 원본의 모든 용어 행이 JSON에 들어가고 행 수가 일치합니다. 12개 기본 항목이 모두 v6.0 용어로 매핑됩니다 |
| 3 | 용어 카드 UI | `src/components/TermCard.tsx` | 정의와 Grade 1–5를 한 화면에 표시하고, 해당 없는 Grade는 "—"로 표시합니다 |
| 3a | UI 문구 | `src/strings.ts` (영어 문구를 한곳에 모음) | 화면에 한글 문구가 하나도 없습니다 |
| 4 | 첫 화면 기본 목록 (P0) | `src/components/FavoritesGrid.tsx` | 첫 진입 시 12개 카드가 보입니다 |
| 5 | 검색 (P0) | `src/lib/search.ts`, `src/components/SearchBar.tsx` | 정확일치 > 접두어 > 부분일치 > 오타 허용 순으로 결과를 보여주고, 입력 후 100ms 안에 결과가 나옵니다 |
| 6 | 즐겨찾기 편집 (P1) | `src/lib/storage.ts`, 카드의 ☆ 토글, "Reset to defaults" 버튼 | 추가·삭제가 새로고침 후에도 유지되고, `localStorage`를 쓸 수 없어도 앱이 기본 목록으로 동작합니다 |
| 7 | 최근 검색어 (P1) | `SearchBar`의 최근 검색 드롭다운과 지우기 버튼 | 최대 10개, 최신순, 중복 없음 |
| 8 | 반응형·접근성 | | 360px 모바일부터 데스크톱까지 가로 스크롤이 없고, 키보드만으로 검색과 선택이 가능합니다 |
| 9 | 배포 | Vercel 프로젝트 | 공개 URL에서 e2e 스모크 테스트 통과 |

## 5. 수용 기준 (테스트 가능)

1. 첫 화면에 기본 12개 항목이 각각 정의와 Grade 1–5와 함께 표시된다.
2. `neutrophil`을 입력하면 첫 결과가 "Neutrophil count decreased"다.
3. 오타 `neutropenai`를 입력해도 결과 상위 3개 안에 "Febrile neutropenia"가 나온다.
4. 결과가 없으면 "No results found" 안내가 나온다.
5. 항목을 즐겨찾기에 추가하거나 삭제한 뒤 새로고침해도 상태가 유지된다.
6. 최근 검색어는 최대 10개, 최신순이며 같은 검색어는 한 번만 남는다.
7. 화면의 모든 문구(버튼, 안내, 오류)가 영어다.
8. 모든 화면에 데이터 출처 "CTCAE v6.0 (NCI)"와 버전이 표시된다.
9. JSON의 용어 수가 원본 XLSX의 용어 행 수와 같다(빌드 스크립트가 검사).
10. 첫 화면 로딩이 Lighthouse 모바일 기준 LCP 2.5초 이하이고 접근성 점수가 90 이상이다.

## 6. 위험과 대응

| 위험 | 대응 |
|---|---|
| v6.0 XLSX의 열 구조가 예상과 다름 | 2단계 시작 시 시트 이름과 헤더를 확인하고, 스크립트가 필수 열이 없으면 빌드를 실패시킵니다 |
| 기본 목록 용어가 v6.0에서 바뀜 | v5.0 대비 비교 탭으로 대조하고, 매핑되지 않는 항목이 있으면 빌드를 실패시킵니다 |
| 변환 과정에서 grade 문구가 틀려짐(임상 오류) | 무작위 20개 용어를 원본과 직접 대조하는 검수를 하고, 스냅샷 테스트로 고정합니다 |
| NCI 데이터의 재배포 조건 | 확인 완료: 별도 표시가 없는 NCI 문서 텍스트는 허가 없이 재사용 가능하며, 디지털 재사용 시 NCI 출처 표기와 원본 링크를 요청합니다. 하단에 출처와 NCI CTCAE 페이지 링크를 표시합니다 |
| 의료 판단 도구로 오인 | 화면 하단에 "For reference only. Refer to the official CTCAE document." 안내를 둡니다 |

## 7. 검증 절차

- `npm test`: 검색 순위, 저장소(최근 검색·즐겨찾기), 데이터 무결성 단위 테스트
- `npm run test:e2e`: 첫 화면 → 검색 → 즐겨찾기 추가 → 새로고침 흐름
- 임상 사용자 1명이 기본 12개 항목과 검색 결과 10건을 원본 PDF와 대조
- 배포 URL에서 Lighthouse 모바일 측정

## 8. P2 대비 설계

- 변환 스크립트에 버전 인자를 받도록 만들어 `ctcae-v6.json` 외에 새 버전 파일을 추가하기만 하면 되게 합니다.
- 즐겨찾기를 MedDRA 코드로 저장해 버전이 바뀌어도 연결이 유지되게 합니다.
- 브라우저에서 사용자가 직접 XLSX를 올리는 기능은 P2 단계에서 따로 설계합니다.

## 9. 진행 전 필요한 것

- NCI CTEP 사이트에서 CTCAE v6.0 XLSX를 받아 `data/raw/`에 두기(사용자 또는 실행 단계에서 다운로드)
