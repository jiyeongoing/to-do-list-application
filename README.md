# Swipe Todo

> 오늘, 이번 주, 매일 반복되는 할 일을 빠르게 정리하고 다음 주를 미리 준비하는
> 모바일 PWA 투두리스트

## Project Status

- Role: Product Planner
- Stage: MVP planning
- Platform: iPhone-first PWA web application
- Constraint: No login in the first release

## Background

기존 투두리스트는 할 일을 모두 한 목록에 넣거나, 날짜를 매번 지정해야 해서
짧게 확인하고 실행하기에는 번거롭습니다. `Swipe Todo`는 사용자의 할 일을
실행 시점에 따라 분리하고, 다음 주 계획은 필요할 때만 스와이프로 꺼내 보도록
설계한 서비스입니다.

## Core Concept

앱을 실행하면 자주 쓰는 세 가지 목록을 먼저 보여줍니다.

| 기본 목록 | 목적 |
| --- | --- |
| 오늘 | 지금 처리할 일에 집중 |
| 이번 주 | 이번 주 안에 할 일을 보관하고 오늘로 이동 |
| 데일리 | 매일 반복할 루틴 관리 |

기본 화면에서 오른쪽으로 스와이프하면 `다음 주` 목록이 나타납니다.
사용자는 다음 주 할 일을 미리 적어둘 수 있고, 주가 바뀌면 해당 할 일은
자동으로 `이번 주` 목록으로 이동합니다.

## Why PWA

- iPhone 홈 화면에 추가해 앱처럼 빠르게 실행할 수 있습니다.
- App Store 심사 없이 배포하고 테스트할 수 있습니다.
- Java/Spring Boot 기반 웹 프로젝트로 확장할 수 있습니다.

PWA는 iPhone의 네이티브 홈 화면 위젯을 제공하지 않습니다. 이번 MVP에서는
위젯 대신 홈 화면에서 빠르게 접근하는 모바일 경험을 검증합니다.

## MVP Scope

- 오늘, 이번 주, 데일리, 다음 주 목록
- 할 일 추가, 완료, 삭제
- `이번 주` 할 일을 `오늘`로 이동
- `데일리` 항목을 매일 `오늘`에 자동 반영
- 주가 바뀔 때 `다음 주` 항목을 `이번 주`로 자동 이동
- 로그인 없는 기기 내부 저장
- PWA 홈 화면 설치 및 오프라인 재실행

## Wireframe

![Swipe Todo MVP Wireframe](docs/assets/wireframe-overview.svg)

## Deliverables

- [Product Brief](docs/PRODUCT_BRIEF.md)
- [User Flow & Screen Definition](docs/USER_FLOW.md)
- [Wireframe](docs/WIREFRAME.md)
- [Feature Policy](docs/FEATURE_POLICY.md)
- [MVP Backlog](docs/MVP_BACKLOG.md)

## Future Opportunities

- 로그인 및 여러 기기 동기화
- 알림과 마감 시간
- 완료 기록 및 루틴 달성률
- 네이티브 iOS 앱/위젯 확장 검토
