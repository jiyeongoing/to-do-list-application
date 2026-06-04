package com.swipetodo.sync;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;

import com.swipetodo.auth.AccountService;
import com.swipetodo.auth.UserAccount;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
	"spring.datasource.url=jdbc:h2:mem:sync-test;DB_CLOSE_DELAY=-1",
	"spring.jpa.hibernate.ddl-auto=create-drop"
})
class AccountSyncPersistenceTests {

	@Autowired
	AccountSyncRepository repository;

	@Autowired
	AccountService accountService;

	@Autowired
	AccountSyncService service;

	@Test
	void importLocalPersistsSnapshotByAccount() {
		TodoState localState = new TodoState(
			List.of(Map.of(
				"id", "today-1",
				"date", "2026-06-04",
				"title", "서버 저장 확인",
				"completed", false
			)),
			List.of(),
			List.of(),
			List.of()
		);

		service.importLocal("prototype-google-user", localState);

		UserAccount account = accountService.findOrCreatePrototypeAccount("prototype-google-user");
		SyncSnapshot snapshot = repository.findByAccount(account).orElseThrow();
		assertThat(snapshot.account().providerId()).isEqualTo("prototype-google-user");
		assertThat(snapshot.payload()).contains("서버 저장 확인");
		assertThat(service.export("prototype-google-user").today()).hasSize(1);
	}
}
