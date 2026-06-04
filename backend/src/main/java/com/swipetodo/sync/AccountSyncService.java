package com.swipetodo.sync;

import com.swipetodo.auth.AccountService;
import com.swipetodo.auth.UserAccount;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Service
class AccountSyncService {

	private final AccountSyncRepository repository;
	private final AccountService accountService;
	private final ObjectMapper objectMapper;

	AccountSyncService(
		AccountSyncRepository repository,
		AccountService accountService,
		ObjectMapper objectMapper
	) {
		this.repository = repository;
		this.accountService = accountService;
		this.objectMapper = objectMapper;
	}

	@Transactional
	TodoState importLocal(String accountId, TodoState localState) {
		UserAccount account = accountService.findOrCreatePrototypeAccount(accountId);
		return importLocal(account, localState);
	}

	@Transactional
	TodoState importLocal(UserAccount account, TodoState localState) {
		SyncSnapshot snapshot = findSnapshot(account);
		TodoState existing = deserialize(snapshot.payload());
		TodoState merged = existing.merge(localState);
		snapshot.updatePayload(serialize(merged));
		repository.save(snapshot);
		return merged;
	}

	@Transactional
	TodoState export(String accountId) {
		UserAccount account = accountService.findOrCreatePrototypeAccount(accountId);
		return export(account);
	}

	@Transactional
	TodoState export(UserAccount account) {
		return repository.findByAccount(account)
			.map((snapshot) -> deserialize(snapshot.payload()))
			.orElseGet(TodoState::empty);
	}

	private SyncSnapshot findSnapshot(UserAccount account) {
		return repository.findByAccount(account)
			.or(() -> repository.findByAccountId(account.providerId()).map((snapshot) -> {
				snapshot.attachAccount(account);
				return snapshot;
			}))
			.orElseGet(() -> new SyncSnapshot(account, serialize(TodoState.empty())));
	}

	private String serialize(TodoState state) {
		try {
			return objectMapper.writeValueAsString(state);
		} catch (JacksonException exception) {
			throw new IllegalStateException("Unable to serialize todo state", exception);
		}
	}

	private TodoState deserialize(String payload) {
		try {
			return objectMapper.readValue(payload, TodoState.class);
		} catch (JacksonException exception) {
			throw new IllegalStateException("Unable to deserialize todo state", exception);
		}
	}
}
