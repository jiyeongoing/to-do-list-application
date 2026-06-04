package com.swipetodo.auth;

record EmailCheckResponse(
	String email,
	boolean available
) {
}
