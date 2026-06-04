package com.swipetodo.sync;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Service
class AccountSyncService {

	private final AccountSyncRepository repository;
	private final ObjectMapper objectMapper;

	AccountSyncService(AccountSyncRepository repository, ObjectMapper objectMapper) {
		this.repository = repository;
		this.objectMapper = objectMapper;
	}

	@Transactional
	TodoState importLocal(String accountId, TodoState localState) {
		SyncSnapshot snapshot = repository.findByAccountId(accountId)
			.orElseGet(() -> new SyncSnapshot(accountId, serialize(TodoState.empty())));
		TodoState existing = deserialize(snapshot.payload());
		TodoState merged = existing.merge(localState);
		snapshot.updatePayload(serialize(merged));
		repository.save(snapshot);
		return merged;
	}

	@Transactional(readOnly = true)
	TodoState export(String accountId) {
		return repository.findByAccountId(accountId)
			.map((snapshot) -> deserialize(snapshot.payload()))
			.orElseGet(TodoState::empty);
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
