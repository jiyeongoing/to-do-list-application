package com.swipetodo.auth;

import jakarta.validation.constraints.NotBlank;

record ProfileRequest(
	@NotBlank String nickname
) {
}
