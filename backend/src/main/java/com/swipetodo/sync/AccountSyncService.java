package com.swipetodo.sync;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

@Service
class AccountSyncService {

	private final Map<String, TodoState> states = new ConcurrentHashMap<>();

	TodoState importLocal(String accountId, TodoState localState) {
		TodoState existing = states.getOrDefault(accountId, TodoState.empty());
		TodoState merged = existing.merge(localState);
		states.put(accountId, merged);
		return merged;
	}

	TodoState export(String accountId) {
		return states.getOrDefault(accountId, TodoState.empty());
	}
}
