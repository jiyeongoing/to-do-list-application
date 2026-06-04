package com.swipetodo.auth;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
class AccountController {

	private final AccountService accountService;
	private final ObjectProvider<ClientRegistrationRepository> clientRegistrationRepository;

	AccountController(
		AccountService accountService,
		ObjectProvider<ClientRegistrationRepository> clientRegistrationRepository
	) {
		this.accountService = accountService;
		this.clientRegistrationRepository = clientRegistrationRepository;
	}

	@GetMapping("/me")
	AccountResponse me(Authentication authentication) {
		if (authentication instanceof OAuth2AuthenticationToken oauth) {
			return accountService.loginOAuth(
				oauth.getAuthorizedClientRegistrationId(),
				oauth.getPrincipal().getAttributes()
			);
		}
		return accountService.guest();
	}

	@GetMapping("/auth/google/status")
	OAuthLoginStatusResponse googleLoginStatus() {
		boolean oauthReady = hasGoogleRegistration();
		return new OAuthLoginStatusResponse(
			oauthReady,
			oauthReady ? "/oauth2/authorization/google" : null,
			"/api/auth/google/prototype"
		);
	}

	@PostMapping("/auth/google/prototype")
	AccountResponse prototypeGoogleLogin() {
		return accountService.loginPrototypeGoogle();
	}

	private boolean hasGoogleRegistration() {
		ClientRegistrationRepository repository = clientRegistrationRepository.getIfAvailable();
		return repository != null && repository.findByRegistrationId("google") != null;
	}
}
