package com.swipetodo.auth;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
class AccountController {

	private final AccountService accountService;

	AccountController(AccountService accountService) {
		this.accountService = accountService;
	}

	@GetMapping("/me")
	AccountResponse me() {
		return accountService.guest();
	}

	@PostMapping("/auth/google/prototype")
	AccountResponse prototypeGoogleLogin() {
		return accountService.loginPrototypeGoogle();
	}
}
