package com.swipetodo.auth;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
	name = "user_accounts",
	uniqueConstraints = @UniqueConstraint(columnNames = { "provider", "provider_id" })
)
public class UserAccount {

	@Id
	@GeneratedValue
	private Long id;

	@Column(nullable = false)
	private String provider;

	@Column(name = "provider_id", nullable = false)
	private String providerId;

	@Column(nullable = false)
	private String displayName;

	@Column(nullable = false)
	private Instant createdAt;

	protected UserAccount() {
	}

	UserAccount(String provider, String providerId, String displayName) {
		this.provider = provider;
		this.providerId = providerId;
		this.displayName = displayName;
		this.createdAt = Instant.now();
	}

	public Long id() {
		return id;
	}

	public String provider() {
		return provider;
	}

	public String providerId() {
		return providerId;
	}

	public String displayName() {
		return displayName;
	}
}
