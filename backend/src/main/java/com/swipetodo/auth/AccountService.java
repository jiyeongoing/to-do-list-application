package com.swipetodo.auth;

import java.util.Map;
import java.util.Optional;

import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccountService {

	public static final String SESSION_ACCOUNT_ID = "swipeTodoAccountId";

	private static final String PROTOTYPE_PROVIDER = "google";
	private static final String PROTOTYPE_PROVIDER_ID = "prototype-google-user";
	private final UserAccountRepository repository;
	private final PasswordEncoder passwordEncoder;

	AccountService(UserAccountRepository repository, PasswordEncoder passwordEncoder) {
		this.repository = repository;
		this.passwordEncoder = passwordEncoder;
	}

	@Transactional(readOnly = true)
	AccountResponse current(HttpSession session) {
		return currentAccount(session)
			.map(AccountResponse::from)
			.orElseGet(this::guest);
	}

	AccountResponse guest() {
		return new AccountResponse("guest", null, null, null, null);
	}

	@Transactional
	AccountResponse signup(SignupRequest request, HttpSession session) {
		String email = normalizeEmail(request.email());
		if (repository.findByEmail(email).isPresent()) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 가입된 이메일입니다.");
		}
		UserAccount account = repository.save(UserAccount.local(
			email,
			passwordEncoder.encode(request.password()),
			request.nickname().trim()
		));
		signIn(session, account);
		return AccountResponse.from(account);
	}

	@Transactional(readOnly = true)
	EmailCheckResponse checkEmail(String email) {
		String normalizedEmail = normalizeEmail(email);
		return new EmailCheckResponse(normalizedEmail, !repository.existsByEmail(normalizedEmail));
	}

	@Transactional(readOnly = true)
	AccountResponse login(LoginRequest request, HttpSession session) {
		UserAccount account = repository.findByEmail(normalizeEmail(request.email()))
			.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호를 확인해 주세요."));
		if (account.passwordHash() == null || !passwordEncoder.matches(request.password(), account.passwordHash())) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호를 확인해 주세요.");
		}
		signIn(session, account);
		return AccountResponse.from(account);
	}

	@Transactional
	AccountResponse updateProfile(ProfileRequest request, HttpSession session) {
		UserAccount account = currentAccount(session)
			.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."));
		account.updateDisplayName(request.nickname().trim());
		return AccountResponse.from(account);
	}

	@Transactional
	AccountResponse loginOAuth(String provider, Map<String, Object> attributes, HttpSession session) {
		String normalizedProvider = normalizeProvider(provider);
		String providerId = firstPresent(attributes, "sub", "id", "email");
		String email = normalizeEmail(stringValue(attributes.get("email")));
		String displayName = firstPresent(attributes, "name", "given_name", "email");
		UserAccount account = repository.findByGoogleProviderId(providerId)
			.or(() -> repository.findByEmail(email))
			.map((existing) -> {
				existing.linkGoogle(providerId, email, displayName);
				return existing;
			})
			.orElseGet(() -> {
				UserAccount created = new UserAccount(normalizedProvider, providerId, email, displayName);
				created.linkGoogle(providerId, email, displayName);
				return repository.save(created);
			});
		signIn(session, account);
		return AccountResponse.from(account);
	}

	@Transactional
	public UserAccount findOrCreatePrototypeAccount(String providerId) {
		String fallbackEmail = providerId + "@prototype.local";
		return findOrCreate(PROTOTYPE_PROVIDER, providerId, fallbackEmail, "프로토타입 사용자");
	}

	private UserAccount findOrCreate(String provider, String providerId, String email, String displayName) {
		return repository.findByProviderAndProviderId(provider, providerId)
			.map((account) -> {
				account.updateProfile(email, displayName);
				return account;
			})
			.orElseGet(() -> repository.save(new UserAccount(provider, providerId, email, displayName)));
	}

	@Transactional(readOnly = true)
	public Optional<UserAccount> currentAccount(HttpSession session) {
		Object accountId = session.getAttribute(SESSION_ACCOUNT_ID);
		if (accountId instanceof Long id) {
			return repository.findById(id);
		}
		if (accountId instanceof Number number) {
			return repository.findById(number.longValue());
		}
		return Optional.empty();
	}

	void signIn(HttpSession session, UserAccount account) {
		session.setAttribute(SESSION_ACCOUNT_ID, account.id());
	}

	private String normalizeProvider(String provider) {
		if (provider == null || provider.isBlank() || "test".equals(provider)) {
			return PROTOTYPE_PROVIDER;
		}
		return provider;
	}

	private String firstPresent(Map<String, Object> attributes, String... names) {
		for (String name : names) {
			String value = stringValue(attributes.get(name));
			if (!value.isBlank()) {
				return value;
			}
		}
		return "unknown-oauth-user";
	}

	private String stringValue(Object value) {
		return value == null ? "" : value.toString();
	}

	String normalizeEmail(String email) {
		return email == null ? "" : email.trim().toLowerCase();
	}
}
