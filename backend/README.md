# Swipe Todo Backend

로컬 계정 저장/동기화 프로토타입용 Spring Boot 서버입니다.
계정별 할 일 스냅샷은 H2 파일 DB와 JPA로 저장합니다.

## 실행

```bash
./gradlew bootRun
```

서버 주소:

```text
http://localhost:8080
```

프론트 로컬 미리보기는 `http://localhost:4173` 기준으로 CORS를 허용합니다.

저장 파일은 `backend/data` 아래에 생성됩니다. 이 폴더는 개인 실행 데이터라
Git에는 포함하지 않습니다.

## 테스트

```bash
./gradlew test
```

## API

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/api/me` | 현재 저장 모드 조회 |
| GET | `/api/auth/google/status` | 실제 Google OAuth 설정 여부 조회 |
| POST | `/api/auth/google/prototype` | Google 로그인 프로토타입 |
| POST | `/api/sync/import-local` | 로컬 데이터를 계정 저장소로 가져오기 |
| GET | `/api/sync/export` | 계정 저장 데이터 조회 |

계정 식별은 실제 OAuth 전 단계라 `X-Prototype-Account-Id` 헤더로 처리합니다.
다음 단계에서 Spring Security OAuth2의 실제 로그인 사용자 정보로 교체할 예정입니다.

## Google OAuth 설정

Google Cloud Console에서 OAuth client를 만든 뒤 아래 값을 환경 변수나
`application.properties`로 넣으면 실제 OAuth 로그인 경로를 사용할 수 있습니다.

```properties
spring.security.oauth2.client.registration.google.client-id=${GOOGLE_CLIENT_ID}
spring.security.oauth2.client.registration.google.client-secret=${GOOGLE_CLIENT_SECRET}
spring.security.oauth2.client.registration.google.scope=openid,email,profile
```

OAuth 설정이 있으면 `/oauth2/authorization/google`로 로그인하고, 성공 후
프론트 로컬 주소(`http://localhost:4173`)로 돌아옵니다. 설정이 없으면 기존
프로토타입 로그인을 유지합니다.

## 저장 구조

- `UserAccount`: 로그인 제공자와 제공자별 사용자 ID 저장
- `SyncSnapshot`: 계정과 연결된 투두 JSON 스냅샷 저장
- `AccountSyncRepository`: 계정별 스냅샷 조회
- `AccountSyncService`: 로컬 데이터 가져오기, 병합, 서버 저장 데이터 내려받기
