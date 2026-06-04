package com.swipetodo.sync;

import com.swipetodo.auth.AccountService;
import com.swipetodo.auth.UserAccount;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sync")
class AccountSyncController {

	private final AccountSyncService accountSyncService;
	private final AccountService accountService;

	AccountSyncController(AccountSyncService accountSyncService, AccountService accountService) {
		this.accountSyncService = accountSyncService;
		this.accountService = accountService;
	}

	@PostMapping("/import-local")
	TodoState importLocal(
		@RequestHeader(name = "X-Prototype-Account-Id", defaultValue = "prototype-google-user") String accountId,
		@RequestBody TodoState localState,
		HttpSession session
	) {
		return currentOrPrototype(accountId, session)
			.map((account) -> accountSyncService.importLocal(account, localState))
			.orElseGet(() -> accountSyncService.importLocal(accountId, localState));
	}

	@GetMapping("/export")
	TodoState export(
		@RequestHeader(name = "X-Prototype-Account-Id", defaultValue = "prototype-google-user") String accountId,
		HttpSession session
	) {
		return currentOrPrototype(accountId, session)
			.map(accountSyncService::export)
			.orElseGet(() -> accountSyncService.export(accountId));
	}

	private java.util.Optional<UserAccount> currentOrPrototype(String accountId, HttpSession session) {
		return accountService.currentAccount(session);
	}
}
