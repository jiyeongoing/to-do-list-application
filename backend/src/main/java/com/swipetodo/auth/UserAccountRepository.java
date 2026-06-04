package com.swipetodo.auth;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

interface UserAccountRepository extends JpaRepository<UserAccount, Long> {

	Optional<UserAccount> findByProviderAndProviderId(String provider, String providerId);
}
