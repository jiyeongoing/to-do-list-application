package com.swipetodo.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

record LoginRequest(
	@Email @NotBlank String email,
	@NotBlank String password
) {
}
