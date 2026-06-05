# widget-lab

위젯 개인화 및 대용량 데이터 렌더링 테스트 프로젝트

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | React 19 + TypeScript 6 |
| 빌드 | Vite 8 |
| 패키지 매니저 | pnpm |
| 라우팅 | React Router v7 |
| 서버 상태 | TanStack Query v5 |
| 클라이언트 상태 | Zustand v5 |
| 가상화 | TanStack Virtual v3 |
| 린팅 | ESLint 10 + Prettier 3 |

## 프로젝트 목표

1. **위젯 개인화** — 사용자별 위젯 레이아웃 저장/복원, 드래그&리사이즈
2. **대용량 데이터 렌더링** — 가상화(TanStack Virtual) 기반 테이블로 수만 건 빠르게 렌더링

## 폴더 구조 (FSD)

```
src/
├── app/
│   ├── providers/       # QueryProvider, 전역 Provider 조합
│   └── styles/          # 전역 CSS
├── pages/
│   ├── home/            # 홈 페이지
│   └── dashboard/       # 대시보드 페이지 (공통코드관리 화면)
├── entities/
│   ├── widget/          # 위젯 도메인 모델
│   └── user/            # 유저 도메인 모델
├── features/
│   ├── widget-personalize/  # 위젯 개인화 기능
│   └── data-table/          # 대용량 데이터 테이블 기능
└── shared/
    ├── ui/              # 공통 UI 컴포넌트 (Header, Sidebar, Layout)
    ├── lib/             # 유틸리티 함수
    ├── api/             # API 클라이언트
    ├── config/          # 환경 설정
    └── types/           # 공통 타입
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

| 경로 | 페이지 |
|------|--------|
| `/` | 홈 |
| `/dashboard` | 시스템관리 · 공통코드 |
