package com.swipetodo.auth;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
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
	AccountResponse me(Authentication authentication, HttpSession session) {
		if (authentication instanceof OAuth2AuthenticationToken oauth) {
			return accountService.loginOAuth(
				oauth.getAuthorizedClientRegistrationId(),
				oauth.getPrincipal().getAttributes(),
				session
			);
		}
		return accountService.current(session);
	}

	@PostMapping("/auth/signup")
	AccountResponse signup(@Valid @RequestBody SignupRequest request, HttpSession session) {
		return accountService.signup(request, session);
	}

	@PostMapping("/auth/login")
	AccountResponse login(@Valid @RequestBody LoginRequest request, HttpSession session) {
		return accountService.login(request, session);
	}

	@GetMapping("/auth/email-check")
	EmailCheckResponse checkEmail(@RequestParam String email) {
		return accountService.checkEmail(email);
	}

	@GetMapping("/auth/google/status")
	OAuthLoginStatusResponse googleLoginStatus() {
		boolean oauthReady = hasGoogleRegistration();
		return new OAuthLoginStatusResponse(
			oauthReady,
			oauthReady ? "/oauth2/authorization/google" : null
		);
	}

	private boolean hasGoogleRegistration() {
		ClientRegistrationRepository repository = clientRegistrationRepository.getIfAvailable();
		return repository != null && repository.findByRegistrationId("google") != null;
	}
}
