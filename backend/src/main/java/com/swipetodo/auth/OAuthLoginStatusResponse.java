package com.swipetodo.auth;

record OAuthLoginStatusResponse(
	boolean oauthReady,
	String loginUrl,
	String prototypeUrl
) {
}
