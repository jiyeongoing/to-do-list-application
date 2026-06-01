# Swipe Todo Backend

로컬 계정 저장/동기화 프로토타입용 Spring Boot 서버입니다.

## 실행

```bash
./gradlew bootRun
```

서버 주소:

```text
http://localhost:8080
```

프론트 로컬 미리보기는 `http://localhost:4173` 기준으로 CORS를 허용합니다.

## 테스트

```bash
./gradlew test
```

## API

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/api/me` | 현재 저장 모드 조회 |
| POST | `/api/auth/google/prototype` | Google 로그인 프로토타입 |
| POST | `/api/sync/import-local` | 로컬 데이터를 계정 저장소로 가져오기 |
| GET | `/api/sync/export` | 계정 저장 데이터 조회 |

계정 식별은 실제 OAuth 전 단계라 `X-Prototype-Account-Id` 헤더로 처리합니다.
다음 단계에서 Spring Security OAuth2와 사용자 DB로 교체할 예정입니다.
