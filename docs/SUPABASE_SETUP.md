# Supabase 무료 클라우드 연결

## 1. 프로젝트 생성

1. [Supabase Dashboard](https://supabase.com/dashboard)에서 무료 프로젝트를 생성합니다.
2. `SQL Editor`에서 [supabase/schema.sql](../supabase/schema.sql)을 실행합니다.

## 2. 인증 설정

`Authentication > Providers > Email`에서 이메일 로그인을 활성화합니다.

빠른 데모가 필요하면 `Confirm email`을 끌 수 있습니다. 실제 운영에서는 이메일 확인을
켜는 편이 안전합니다.

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
  anonKey: "PUBLISHABLE_OR_ANON_KEY"
};
```

anon key는 브라우저에 공개되는 키입니다. 데이터 보호는
[supabase/schema.sql](../supabase/schema.sql)의 RLS 정책이 담당합니다.
