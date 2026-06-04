# Swipe Todo Backend

로컬 회원가입/로그인/동기화용 Spring Boot 서버입니다.
회원 비밀번호는 BCrypt 해시로 저장하고, 계정별 할 일 스냅샷은 H2 파일 DB와 JPA로 저장합니다.

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
| GET | `/api/auth/email-check?email=` | 이메일 중복 확인 |
| POST | `/api/auth/signup` | 이메일/비밀번호 회원가입 |
| POST | `/api/auth/login` | 이메일/비밀번호 로그인 |
| POST | `/api/auth/profile` | 로그인 사용자 별명 변경 |
| POST | `/api/logout` | 서버 세션 로그아웃 |
| POST | `/api/sync/import-local` | 로컬 데이터를 계정 저장소로 가져오기 |
| GET | `/api/sync/export` | 계정 저장 데이터 조회 |

로그인 사용자는 서버 세션으로 식별합니다. 게스트/구버전 흐름은
`X-Prototype-Account-Id` 헤더를 보조 식별자로 사용할 수 있습니다.

## 저장 구조

- `UserAccount`: 이메일, BCrypt 비밀번호 해시, 별명 저장
- `SyncSnapshot`: 계정과 연결된 투두 JSON 스냅샷 저장
- `AccountSyncRepository`: 계정별 스냅샷 조회
- `AccountSyncService`: 로컬 데이터 가져오기, 병합, 서버 저장 데이터 내려받기
