# widget-lab

위젯 개인화 및 대용량 데이터 렌더링 테스트 프로젝트

## 기술 스택

| 분류            | 기술                    |
| --------------- | ----------------------- |
| 프레임워크      | React 19 + TypeScript 6 |
| 빌드            | Vite 8                  |
| 패키지 매니저   | pnpm                    |
| 라우팅          | React Router v7         |
| 서버 상태       | TanStack Query v5       |
| 클라이언트 상태 | Zustand v5              |
| 가상화          | TanStack Virtual v3     |
| 린팅            | ESLint 10 + Prettier 3  |

## 프로젝트 목표

1. **위젯 개인화** — 사용자별 위젯 레이아웃 저장/복원, 드래그&리사이즈
2. **대용량 데이터 렌더링** — 가상화(TanStack Virtual) 기반 테이블로 수만 건 빠르게 렌더링

## 폴더 구조 (FSD)

```
src/
├── app/
│   └── layouts/                  # 글로벌 레이아웃 및 프로바이더 조립
│       └── BaseLayout.tsx        # (구 shared/ui/Layout) Sidebar, Header, AlarmSnackbar 융합
├── pages/                        # 단순 라우팅 및 위젯/피처 조립 레이어 (비즈니스 로직 0%)
│   ├── realtime/                 # wbgt, gas, motion 등 9개 센서 페이지
│   ├── dashboard/                # 홈 및 개인화 대시보드
│   ├── situation/                # 알람 모니터링 및 처리 페이지
│   ├── service/                  # 공장, 공정, 라인, 설비 CRUD 및 맵 페이지
│   ├── statistics/               # 통계 분석 및 리포트 페이지
│   └── system/                   # 회사, 사업장 CRUD 및 맵 페이지
├── widgets/                      # 다중 엔티티가 결합된 거대 독립 스크린 조각
│   ├── diagram-map/              # 공정/라인/공장 다이어그램 시각화 (구 diagram-map/)
│   ├── layout-map/               # 지리 정보 기반 설비/공장 핀 배치 맵 (구 layout-map/)
│   ├── dashboard-grid/           # 대시보드 그리드 및 위젯 배치 시스템 (구 widgets/WidgetGrid)
│   └── statistics-panel/         # 통계 매트릭스 및 인사이트 카드 묶음
├── features/                     # 사용자의 행동/액션 단위 (비즈니스 로직 포함)
│   ├── alarm-action/             # 알람 인지(Acknowledge), 조치 시작, 해결 액션 단추 및 폼
│   ├── master-crud/              # 마스터 데이터의 등록, 수정, 삭제 모달 및 폼 로직
│   ├── map-pin-management/       # 맵 위의 핀 드래그 이동, 크기 조절, 도면 이미지 업로드/삭제 로직
│   └── telemetry-picker/         # 통계용 장비 및 메트릭 선택 모달 (구 AddSeriesModal)
├── entities/                     # 비즈니스 핵심 개념, 데이터 모델(DTO), 상태(Zustand), 단일 UI
│   ├── auth/                     # 로그인 유저 세션 관리 (auth.ts 스토어 포함)
│   ├── alarm/                    # 알람 DTO, 실시간 알람 피드 스토어, AlarmSnackbar(토스트 UI)
│   ├── master-tree/              # 공장/공정/라인/설비/회사/사업장 공통 DTO 및 관계 정의
│   ├── telemetry/                # 시계열 데이터(TrendPoint), 위젯 타입 정의 및 widgetApi (조회용 API)
│   ├── wbgt/                     # WBGT 지수 계산 공식 및 노동부 기준 위험도 매핑 로직 (wbgtRisk.ts)
│   └── analytics/                # 표준편차, 아웃라이어 감지 알고리즘 및 규칙 기반 인사이트 생성 (insights.ts)
└── shared/                       # 특정 도메인을 모르는 최하위 인프라 레이어
    ├── lib/                      # parsePosition 등 순수 유틸리티 함수
    └── ui/                       # DataTable, FormModal, ConfirmModal, Tabs 등 순수 UI 컴포넌트

```

## 시작하기

```bash
pnpm install
pnpm dev
```

## 주요 스크립트

```bash
pnpm dev       # 개발 서버 실행
pnpm build     # 프로덕션 빌드
pnpm lint      # ESLint 검사
pnpm format    # Prettier 포맷팅
```

## 라우트

| 경로         | 페이지                |
| ------------ | --------------------- |
| `/`          | 홈                    |
| `/dashboard` | 시스템관리 · 공통코드 |
