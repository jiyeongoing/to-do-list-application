package com.swipetodo.sync;

import java.util.Optional;

import com.swipetodo.auth.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

interface AccountSyncRepository extends JpaRepository<SyncSnapshot, Long> {

	Optional<SyncSnapshot> findByAccount(UserAccount account);

	Optional<SyncSnapshot> findByAccountId(String accountId);
}
