package com.swipetodo.sync;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;

@Entity
@Table(name = "sync_snapshots")
class SyncSnapshot {

	@Id
	@GeneratedValue
	private Long id;

	@Column(nullable = false, unique = true)
	private String accountId;

	@Lob
	@Column(nullable = false)
	private String payload;

	protected SyncSnapshot() {
	}

	SyncSnapshot(String accountId, String payload) {
		this.accountId = accountId;
		this.payload = payload;
	}

	String accountId() {
		return accountId;
	}

	String payload() {
		return payload;
	}

	void updatePayload(String payload) {
		this.payload = payload;
	}
}
