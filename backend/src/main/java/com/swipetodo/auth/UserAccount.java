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

	@Column(unique = true)
	private String email;

	@Column(name = "password_hash")
	private String passwordHash;

	@Column(name = "google_provider_id", unique = true)
	private String googleProviderId;

	@Column(nullable = false)
	private String displayName;

	@Column(nullable = false)
	private Instant createdAt;

	protected UserAccount() {
	}

	UserAccount(String provider, String providerId, String email, String displayName) {
		this.provider = provider;
		this.providerId = providerId;
		this.email = email;
		this.displayName = displayName;
		this.createdAt = Instant.now();
	}

	static UserAccount local(String email, String passwordHash, String displayName) {
		UserAccount account = new UserAccount("local", normalizeEmail(email), normalizeEmail(email), displayName);
		account.passwordHash = passwordHash;
		return account;
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

	public String email() {
		return email;
	}

	public String passwordHash() {
		return passwordHash;
	}

	public String googleProviderId() {
		return googleProviderId;
	}

	public String displayName() {
		return displayName;
	}

	void updateProfile(String email, String displayName) {
		this.email = normalizeEmail(email);
		this.displayName = displayName;
	}

	void linkGoogle(String googleProviderId, String email, String displayName) {
		this.provider = "google";
		this.providerId = googleProviderId;
		this.googleProviderId = googleProviderId;
		this.email = normalizeEmail(email);
		this.displayName = displayName;
	}

	private static String normalizeEmail(String email) {
		return email == null ? null : email.trim().toLowerCase();
	}
}
