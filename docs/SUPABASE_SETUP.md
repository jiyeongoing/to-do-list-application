# Supabase 무료 클라우드 연결

## 1. 프로젝트 생성

1. [Supabase Dashboard](https://supabase.com/dashboard)에서 무료 프로젝트를 생성합니다.
2. `SQL Editor`에서 [supabase/schema.sql](../supabase/schema.sql)을 실행합니다.

## 2. 인증 설정

`Authentication > Providers > Email`에서 이메일 로그인을 활성화합니다.

현재 데모는 가입 즉시 사용할 수 있도록 `Confirm email`을 끕니다. 이메일 소유 확인이
필요한 운영 단계에서는 다시 켜고 SMTP 설정을 추가합니다.

`Authentication > URL Configuration`에 아래 주소를 추가합니다.

```text
Site URL: https://jiyeongoing.github.io/to-do-list-application/
Redirect URL: https://jiyeongoing.github.io/to-do-list-application/
```

## 3. 프론트 설정

`Project Settings > API`에서 Project URL과 Publishable/anon key를 확인하고
[supabase-config.js](../supabase-config.js)에 입력합니다.

```js
window.SWIPE_TODO_SUPABASE = {
  url: "https://PROJECT_ID.supabase.co",
  anonKey: "PUBLISHABLE_OR_ANON_KEY",
  redirectUrl: "https://jiyeongoing.github.io/to-do-list-application/"
};
```

anon key는 브라우저에 공개되는 키입니다. 데이터 보호는
[supabase/schema.sql](../supabase/schema.sql)의 RLS 정책이 담당합니다.
