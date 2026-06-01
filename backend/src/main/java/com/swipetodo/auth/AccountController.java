package com.swipetodo.auth;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
class AccountController {

	private static final AccountResponse GUEST = new AccountResponse("guest", null, null, null);
	private static final AccountResponse PROTOTYPE_GOOGLE_ACCOUNT = new AccountResponse(
		"account",
		"google",
		"prototype-google-user",
		"Google 사용자"
	);

	@GetMapping("/me")
	AccountResponse me() {
		return GUEST;
	}

	@PostMapping("/auth/google/prototype")
	AccountResponse prototypeGoogleLogin() {
		return PROTOTYPE_GOOGLE_ACCOUNT;
	}
}
