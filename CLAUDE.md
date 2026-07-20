# widget-lab

현대 통합안전관제시스템(EHS) UI. React 19 + TypeScript + Vite + Tailwind v4 + Konva.

## 필수 사항

- **pnpm만 사용.** npm은 `Cannot read properties of null (reading 'matches')`로 깨진다.
- 검증: `pnpm exec tsc --noEmit` → `pnpm lint`. 화면 변경은 브라우저로 실제 확인까지.
- 백엔드: `http://localhost:8080/api` (Spring Boot). FE dev 서버는 5173 — **백엔드 CORS가 5173만 허용**하므로 다른 포트로 띄우면 인증이 안 된다.

## 아키텍처 (FSD)

의존 방향은 **한쪽으로만** 흐른다. 역방향 import 금지 (eslint가 차단):

```
shared → entities → features → widgets → pages → app
```

| 레이어     | 담는 것                                            |
| ---------- | -------------------------------------------------- |
| `shared`   | 도메인 무관 유틸·UI (`api.ts`, `cn`, DataTable 등) |
| `entities` | 도메인 타입·API·판정 로직 (line, ehs, collection…) |
| `features` | 사용자 액션 단위 (widget-personalize 등)           |
| `widgets`  | 합성 UI 블록 (diagram-map, dashboard-grid…)        |
| `pages`    | 라우트 단위 조립                                   |

- 같은 레이어끼리 참조는 허용. `shared`가 상위를 참조하면 안 된다 (`api.ts`의 인증 예외는 주석으로 명시됨).
- 새 코드 위치가 애매하면: **두 곳 이상에서 쓰이면 아래 레이어로, 한 화면 전용이면 그 페이지 폴더 안에.**

## 페이지 작성 규칙

**`index.tsx`는 JSX 조립만.** 상태·fetch·계산은 전부 `model/use<Name>.ts` 훅으로 뺀다.

```
pages/realtime/environment/
├── index.tsx                     # JSX만
├── model/useEnvironmentMonitor.ts  # 상태·폴링·집계
└── ui/CategoryCard.tsx            # 이 페이지 전용 컴포넌트
```

훅 하나에 성격이 다른 책임(데이터 fetch / UI 토글 / 폼 검증)을 섞지 말고 나눈다.

## 서버 상태는 React Query로

**새 코드에서 서버 데이터를 `useEffect` + `useState` + `setInterval`로 직접 가져오지 않는다.** 캐시·중복요청 제거·재시도는 React Query가 한다. (기존 수동 폴링 코드는 점진적으로 이관 중)

**쿼리 정의는 엔티티에 모은다.** 페이지에서 키를 직접 만들지 말고 `entities/*/api/*Queries.ts`의 `queryOptions()` 팩토리를 쓴다 — 키가 한 곳에만 존재해야 무효화가 안 샌다.

```ts
// entities/collection/api/collectionQueries.ts
export const collectionQueries = {
  sensors: () =>
    queryOptions({
      queryKey: ['collection', 'sensors'],
      queryFn: () => api.get<SensorMaster[]>('/collection/sensors?activeOnly=true'),
    }),
  allLatest: () =>
    queryOptions({
      queryKey: ['collection', 'latest'],
      queryFn: () => api.get<LatestRow[]>('/collection/data/all-latest'),
      refetchInterval: REALTIME_POLL_MS,
      staleTime: 0,
    }),
}

// 사용처
const { data: masters = [] } = useQuery(collectionQueries.sensors())
```

- **쿼리 키**: `[도메인, 리소스, ...파라미터]` (`['collection','latest']`, `['line', lineId, 'diagram']`)
- **마스터 데이터**(공장·공정·라인·설비 목록, 센서 마스터): 기본 `staleTime`(5분) 유지. 여러 화면이 같은 목록을 받아도 요청은 1번.
- **실시간 값**(latest·trend·알람): `refetchInterval` + `staleTime: 0`. 폴링 주기는 이름 있는 상수로.
- **쓰기는 `useMutation`** + 성공 시 `invalidateQueries`. 저장 후 수동 `loadRows()` 재호출하지 않는다.
- 서버 상태를 `useState`로 복제하지 않는다. 파생값은 `useMemo`로 계산한다.
- React Query로 감쌀 대상이 **아닌 것**: localStorage, Konva rAF 애니메이션, 순수 UI 상태.

## React 주의사항

- `useEffect` 안에서 동기 `setState` 금지 (ESLint 경고). 초기화는 이벤트 핸들러에서.
- `react-grid-layout`의 `onLayoutChange`는 무한 루프를 유발하니 쓰지 않는다.
- 아직 남아있는 수동 폴링은 `active` 플래그 + cleanup으로 언마운트 후 setState를 막는다.

## 코드 스타일

핵심 4원칙: **가독성 · 예측가능성 · 응집도 · 결합도**. 자주 어기는 것만 여기 적는다:

- **매직넘버 금지** — `POLL_MS`, `STALE_MS`처럼 이름 있는 상수로. 여러 파일에서 쓰면 한 곳에 정의.
- **복잡한 조건엔 이름을 붙인다** — `if (a && b.some(...))` 대신 `const isPriceInRange = ...`.
- **중첩 삼항 금지** — 조기 반환 함수로 푼다.
- **비슷한 훅은 반환 형태를 통일**한다 (하나는 `query`, 하나는 `query.data`처럼 섞지 않기).
- **숨은 부수효과 금지** — 함수 이름에 없는 로깅·네비게이션을 안에 숨기지 않는다.
- 성급한 추상화보다 **약간의 중복이 낫다.** 3번 반복될 때 추출한다.

전문: [docs/frontend-guidelines.md](docs/frontend-guidelines.md)

## 도메인 메모

- **도면(diagram)**: `diagram_json.nodes`(위치)는 `PUT /master/{scope}/{id}/diagram`, **엣지(flow)는 `PUT /api/flow-edges/bulk`** 로 따로 저장된다. diagram PUT은 edges를 버린다.
- 노드 id ↔ 엔티티: `eq_{id}`=EQUIPMENT, `sensor_{id}`=SENSOR, `line_{id}`/`line_bg_{id}`=LINE, `process_{id}`=PROCESS.
- **서비스정보관리**(`/service/*`)는 위치·배치 편집용. **실시간 값 표출은 실시간 모니터링**(`/realtime/*`)에서 한다.
- 수집항목 임계값은 **오름차순 밴드**(정상→경고→위험). `reversed=true`면 낮을수록 위험. 판정은 `entities/collection/model/classifyRisk.ts` 한 곳에서만.
