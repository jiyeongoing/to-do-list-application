package com.swipetodo.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

record SignupRequest(
	@Email @NotBlank String email,
	@Size(min = 8) String password,
	@NotBlank String nickname
) {
}
