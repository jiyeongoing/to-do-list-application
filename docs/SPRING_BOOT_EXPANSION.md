# Swipe Todo - Spring Boot Expansion Plan

## 1. 목적

현재 `Swipe Todo`는 제품 흐름을 검증하기 위한 정적 PWA 프로토타입입니다.
다음 단계에서는 Java/Spring Boot 기반으로 확장해 백엔드 설계 역량까지
보여주는 것을 목표로 합니다.

## 2. 확장 방향

| 단계 | 목표 | 저장 방식 |
| --- | --- | --- |
| Phase 1 | 정적 PWA + 로컬 저장 검증 | LocalStorage |
| Phase 2 | Spring Boot로 화면 제공 | IndexedDB 유지 |
| Phase 3 | REST API와 DB 도입 | H2/PostgreSQL |
| Phase 4 | 로그인/동기화 선택 도입 | Spring Security + DB |

초기 정책은 로그인 없는 단일 기기 저장입니다. 따라서 Spring Boot 도입 직후에도
무리하게 서버 DB를 넣기보다, 화면 제공과 API 설계를 분리해 단계적으로 확장합니다.

## 3. 추천 패키지 구조

```text
src/main/java/com/swipetodo
├── SwipeTodoApplication.java
├── todo
│   ├── domain
│   │   ├── TodoItem.java
│   │   ├── DailyRoutine.java
│   │   ├── PlannedItem.java
│   │   └── PurposeList.java
│   ├── application
│   │   ├── TodoCommandService.java
│   │   └── TodayRollupService.java
│   ├── presentation
│   │   ├── TodoPageController.java
│   │   └── TodoApiController.java
│   └── persistence
│       └── TodoRepository.java
└── common
    └── TimeProvider.java
```

## 4. 도메인 모델 초안

| 모델 | 주요 필드 | 역할 |
| --- | --- | --- |
| TodoItem | id, title, completed, orderIndex, createdDate | 오늘 실행 항목 |
| DailyRoutine | id, title, active, orderIndex | 매일 오늘에 생성할 원본 |
| PlannedItem | id, title, plannedDate, orderIndex | 특정 날짜 예약 항목 |
| PurposeList | id, title, plannedDate, orderIndex, items | 날짜에 연결된 목적별 리스트 |
| PurposeListItem | id, title, completed, orderIndex | 리스트 내부 체크 항목 |

## 5. REST API 초안

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/api/today` | 오늘 할 일과 오늘 리스트 조회 |
| POST | `/api/today/items` | 오늘 할 일 추가 |
| PATCH | `/api/today/items/{id}/complete` | 오늘 할 일 완료 상태 변경 |
| PATCH | `/api/today/items/reorder` | 오늘 할 일 순서 변경 |
| GET | `/api/daily-routines` | 데일리 루틴 조회 |
| POST | `/api/daily-routines` | 데일리 루틴 추가 |
| PATCH | `/api/daily-routines/{id}` | 사용/미사용 변경 |
| GET | `/api/plans?date=YYYY-MM-DD` | 선택 날짜 계획 조회 |
| POST | `/api/plans/items` | 계획 할 일 추가 |
| POST | `/api/plans/lists` | 목적별 리스트 생성 |
| POST | `/api/plans/lists/{id}/copy` | 목적별 리스트 복사 |
| POST | `/api/plans/lists/paste` | 선택 날짜에 리스트 붙여넣기 |

## 6. 핵심 서비스 규칙

### TodayRollupService

앱 실행 시 오늘 화면을 만들기 전에 다음을 처리합니다.

- 오늘 날짜 기준 활성 데일리 루틴을 한 번만 오늘 할 일로 생성
- 새 데일리 루틴은 기본 미사용으로 생성하고, 사용자가 켠 항목만 오늘에 생성
- 오늘 이전 날짜의 미처리 계획 항목을 오늘 할 일로 이동
- 오늘 이전 날짜의 미완료 목적별 리스트를 오늘 카드로 노출

### 과거 날짜 읽기전용

`plannedDate < today`인 계획 화면은 조회만 허용합니다. 서버 API에서도 과거 날짜
수정 요청은 `400 Bad Request` 또는 도메인 예외로 막습니다.

### 리스트 복사

목적별 리스트 복사 시 제목과 항목 제목만 복사하고, 완료 상태는 모두 `false`로
초기화합니다.

## 7. 테스트 전략

| 테스트 | 예시 |
| --- | --- |
| 단위 테스트 | 날짜 롤업, 순서 변경, 리스트 복사 |
| WebMvcTest | API 요청/응답과 validation |
| Repository Test | 날짜별 조회, orderIndex 정렬 |
| E2E 후보 | 오늘 리스트 완료 수 갱신, 과거 날짜 읽기전용 |

우선순위 높은 테스트:

- 데일리 루틴은 같은 날짜에 중복 생성되지 않는다.
- 새 데일리 루틴의 기본 상태는 미사용이다.
- 계획 항목은 지정 날짜가 되면 오늘로 이동하고 계획에서 제거된다.
- 과거 날짜 계획은 수정할 수 없다.
- 리스트 복사는 완료 상태를 복사하지 않는다.
- 순서 변경은 같은 날짜/같은 목록 안에서만 동작한다.

## 8. 프로젝트 어필 포인트

- 사용자 문제를 화면 구조로 풀어낸 기획 과정
- PWA 프로토타입으로 빠르게 사용성 검증
- TDD 테스트로 핵심 동작 회귀 방지
- Java/Spring Boot 확장을 고려한 도메인/API 설계
- 로그인 없는 로컬 저장에서 서버 동기화로 확장 가능한 단계적 구조
