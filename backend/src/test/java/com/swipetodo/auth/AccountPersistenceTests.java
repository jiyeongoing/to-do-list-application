package com.swipetodo.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

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
	void prototypeGoogleLoginCreatesReusableAccount() {
		AccountResponse firstLogin = service.loginPrototypeGoogle();
		AccountResponse secondLogin = service.loginPrototypeGoogle();

		assertThat(firstLogin.mode()).isEqualTo("account");
		assertThat(firstLogin.provider()).isEqualTo("google");
		assertThat(firstLogin.providerId()).isEqualTo("prototype-google-user");
		assertThat(firstLogin.displayName()).isEqualTo("Google 사용자");
		assertThat(secondLogin.providerId()).isEqualTo(firstLogin.providerId());
		assertThat(repository.findAll()).hasSize(1);
	}
}
