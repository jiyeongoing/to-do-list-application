package com.swipetodo.auth;

record AccountResponse(
	String mode,
	String provider,
	String providerId,
	String email,
	String displayName
) {

	static AccountResponse from(UserAccount account) {
		return new AccountResponse(
			"account",
			account.provider(),
			account.providerId(),
			account.email(),
			account.displayName()
		);
	}
}
