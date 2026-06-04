package com.swipetodo.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;

@SpringBootTest(properties = {
	"spring.datasource.url=jdbc:h2:mem:account-test;DB_CLOSE_DELAY=-1",
	"spring.jpa.hibernate.ddl-auto=create-drop"
})
class AccountPersistenceTests {

	@Autowired
	AccountService service;

	@Autowired
	UserAccountRepository repository;

	@Test
	void signupStoresPasswordHashAndCreatesSession() {
		MockHttpSession session = new MockHttpSession();

		AccountResponse response = service.signup(
			new SignupRequest("member@example.com", "safe-password", "회원"),
			session
		);

		UserAccount account = repository.findByEmail("member@example.com").orElseThrow();
		assertThat(response.mode()).isEqualTo("account");
		assertThat(response.email()).isEqualTo("member@example.com");
		assertThat(account.passwordHash()).isNotBlank();
		assertThat(account.passwordHash()).isNotEqualTo("safe-password");
		assertThat(session.getAttribute(AccountService.SESSION_ACCOUNT_ID)).isEqualTo(account.id());
	}

	@Test
	void loginVerifiesPasswordAndCreatesSession() {
		service.signup(new SignupRequest("login@example.com", "right-password", "로그인"), new MockHttpSession());
		MockHttpSession session = new MockHttpSession();

		AccountResponse response = service.login(new LoginRequest("login@example.com", "right-password"), session);

		assertThat(response.email()).isEqualTo("login@example.com");
		assertThat(session.getAttribute(AccountService.SESSION_ACCOUNT_ID)).isNotNull();
	}

	@Test
	void emailCheckReturnsAvailability() {
		service.signup(new SignupRequest("used@example.com", "right-password", "회원"), new MockHttpSession());

		assertThat(service.checkEmail("used@example.com").available()).isFalse();
		assertThat(service.checkEmail("new@example.com").available()).isTrue();
	}
}
