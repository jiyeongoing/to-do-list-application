package com.swipetodo.auth;

import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService {

	private static final String PROTOTYPE_PROVIDER = "google";
	private static final String PROTOTYPE_PROVIDER_ID = "prototype-google-user";
	private static final String PROTOTYPE_EMAIL = "google-user@example.com";
	private static final String PROTOTYPE_DISPLAY_NAME = "Google 사용자";

	private final UserAccountRepository repository;

	AccountService(UserAccountRepository repository) {
		this.repository = repository;
	}

	@Transactional(readOnly = true)
	AccountResponse guest() {
		return new AccountResponse("guest", null, null, null, null);
	}

	@Transactional
	AccountResponse loginPrototypeGoogle() {
		UserAccount account = findOrCreate(
			PROTOTYPE_PROVIDER,
			PROTOTYPE_PROVIDER_ID,
			PROTOTYPE_EMAIL,
			PROTOTYPE_DISPLAY_NAME
		);
		return AccountResponse.from(account);
	}

	@Transactional
	AccountResponse loginOAuth(String provider, Map<String, Object> attributes) {
		String normalizedProvider = normalizeProvider(provider);
		String providerId = firstPresent(attributes, "sub", "id", "email");
		String email = stringValue(attributes.get("email"));
		String displayName = firstPresent(attributes, "name", "given_name", "email");
		UserAccount account = findOrCreate(normalizedProvider, providerId, email, displayName);
		return AccountResponse.from(account);
	}

	@Transactional
	public UserAccount findOrCreatePrototypeAccount(String providerId) {
		return findOrCreate(PROTOTYPE_PROVIDER, providerId, PROTOTYPE_EMAIL, PROTOTYPE_DISPLAY_NAME);
	}

	private UserAccount findOrCreate(String provider, String providerId, String email, String displayName) {
		return repository.findByProviderAndProviderId(provider, providerId)
			.map((account) -> {
				account.updateProfile(email, displayName);
				return account;
			})
			.orElseGet(() -> repository.save(new UserAccount(provider, providerId, email, displayName)));
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
}
