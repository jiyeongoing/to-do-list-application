package com.swipetodo.auth;

record AccountResponse(
	String mode,
	String provider,
	String providerId,
	String displayName
) {
}
