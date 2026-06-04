package com.swipetodo.sync;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

interface AccountSyncRepository extends JpaRepository<SyncSnapshot, Long> {

	Optional<SyncSnapshot> findByAccountId(String accountId);
}
