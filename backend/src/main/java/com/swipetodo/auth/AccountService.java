package com.swipetodo.auth;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService {

	private static final String PROTOTYPE_PROVIDER = "google";
	private static final String PROTOTYPE_PROVIDER_ID = "prototype-google-user";
	private static final String PROTOTYPE_DISPLAY_NAME = "Google 사용자";

	private final UserAccountRepository repository;

	AccountService(UserAccountRepository repository) {
		this.repository = repository;
	}

	@Transactional(readOnly = true)
	AccountResponse guest() {
		return new AccountResponse("guest", null, null, null);
	}

	@Transactional
	AccountResponse loginPrototypeGoogle() {
		UserAccount account = findOrCreate(PROTOTYPE_PROVIDER, PROTOTYPE_PROVIDER_ID, PROTOTYPE_DISPLAY_NAME);
		return AccountResponse.from(account);
	}

	@Transactional
	public UserAccount findOrCreatePrototypeAccount(String providerId) {
		return findOrCreate(PROTOTYPE_PROVIDER, providerId, PROTOTYPE_DISPLAY_NAME);
	}

	private UserAccount findOrCreate(String provider, String providerId, String displayName) {
		return repository.findByProviderAndProviderId(provider, providerId)
			.orElseGet(() -> repository.save(new UserAccount(provider, providerId, displayName)));
	}
}
