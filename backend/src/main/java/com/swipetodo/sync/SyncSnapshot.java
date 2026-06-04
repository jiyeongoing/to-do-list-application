package com.swipetodo.sync;

import com.swipetodo.auth.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "sync_snapshots")
class SyncSnapshot {

	@Id
	@GeneratedValue
	private Long id;

	@Column(nullable = false, unique = true)
	private String accountId;

	@OneToOne
	@JoinColumn(name = "user_account_id")
	private UserAccount account;

	@Lob
	@Column(nullable = false)
	private String payload;

	protected SyncSnapshot() {
	}

	SyncSnapshot(UserAccount account, String payload) {
		this.accountId = account.providerId();
		this.account = account;
		this.payload = payload;
	}

	String accountId() {
		return accountId;
	}

	UserAccount account() {
		return account;
	}

	String payload() {
		return payload;
	}

	void attachAccount(UserAccount account) {
		this.account = account;
		this.accountId = account.providerId();
	}

	void updatePayload(String payload) {
		this.payload = payload;
	}
}
