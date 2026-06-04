package com.swipetodo.auth;

record AccountResponse(
	String mode,
	String provider,
	String providerId,
	String displayName
) {

	static AccountResponse from(UserAccount account) {
		return new AccountResponse("account", account.provider(), account.providerId(), account.displayName());
	}
}
