package com.swipetodo.sync;

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

	AccountSyncController(AccountSyncService accountSyncService) {
		this.accountSyncService = accountSyncService;
	}

	@PostMapping("/import-local")
	TodoState importLocal(
		@RequestHeader(name = "X-Prototype-Account-Id", defaultValue = "prototype-google-user") String accountId,
		@RequestBody TodoState localState
	) {
		return accountSyncService.importLocal(accountId, localState);
	}

	@GetMapping("/export")
	TodoState export(
		@RequestHeader(name = "X-Prototype-Account-Id", defaultValue = "prototype-google-user") String accountId
	) {
		return accountSyncService.export(accountId);
	}
}
