package com.swipetodo;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oauth2Login;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
	"spring.datasource.url=jdbc:h2:mem:api-test;DB_CLOSE_DELAY=-1",
	"spring.jpa.hibernate.ddl-auto=create-drop"
})
@AutoConfigureMockMvc
class AccountSyncApiTests {

	@Autowired
	MockMvc mockMvc;

	@Test
	void meReturnsGuestByDefault() throws Exception {
		mockMvc.perform(get("/api/me"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.mode").value("guest"));
	}

	@Test
	void googleLoginStatusFallsBackToPrototypeWithoutOAuthRegistration() throws Exception {
		mockMvc.perform(get("/api/auth/google/status"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.oauthReady").value(false));
	}

	@Test
	void signupAndLoginCreateAuthenticatedSession() throws Exception {
		String signupPayload = """
			{ "email": "real@example.com", "password": "real-password", "nickname": "진짜회원" }
			""";
		String loginPayload = """
			{ "email": "real@example.com", "password": "real-password" }
			""";

		MockHttpSession signupSession = (MockHttpSession) mockMvc.perform(post("/api/auth/signup")
				.contentType(MediaType.APPLICATION_JSON)
				.content(signupPayload))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.mode").value("account"))
			.andExpect(jsonPath("$.provider").value("local"))
			.andExpect(jsonPath("$.email").value("real@example.com"))
			.andReturn()
			.getRequest()
			.getSession(false);

		mockMvc.perform(get("/api/me").session(signupSession))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.email").value("real@example.com"));

		MockHttpSession loginSession = (MockHttpSession) mockMvc.perform(post("/api/auth/login")
				.contentType(MediaType.APPLICATION_JSON)
				.content(loginPayload))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.displayName").value("진짜회원"))
			.andReturn()
			.getRequest()
			.getSession(false);

		mockMvc.perform(get("/api/me").session(loginSession))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.email").value("real@example.com"));
	}

	@Test
	void invalidPasswordIsRejected() throws Exception {
		mockMvc.perform(post("/api/auth/signup")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"wrong@example.com\",\"password\":\"right-password\",\"nickname\":\"회원\"}"))
			.andExpect(status().isOk());

		mockMvc.perform(post("/api/auth/login")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"wrong@example.com\",\"password\":\"wrong-password\"}"))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void emailAvailabilityCanBeChecked() throws Exception {
		mockMvc.perform(post("/api/auth/signup")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"check@example.com\",\"password\":\"right-password\",\"nickname\":\"회원\"}"))
			.andExpect(status().isOk());

		mockMvc.perform(get("/api/auth/email-check")
				.param("email", "check@example.com"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.available").value(false));

		mockMvc.perform(get("/api/auth/email-check")
				.param("email", "unused@example.com"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.available").value(true));
	}

	@Test
	void meReturnsOAuthAccountWhenAuthenticated() throws Exception {
		mockMvc.perform(get("/api/me")
				.with(oauth2Login()
					.attributes((attributes) -> {
						attributes.put("sub", "google-oauth-user");
						attributes.put("email", "oauth@example.com");
						attributes.put("name", "OAuth 사용자");
					})))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.mode").value("account"))
			.andExpect(jsonPath("$.provider").value("google"))
			.andExpect(jsonPath("$.providerId").value("google-oauth-user"))
			.andExpect(jsonPath("$.email").value("oauth@example.com"))
			.andExpect(jsonPath("$.displayName").value("OAuth 사용자"));
	}

	@Test
	void googleOAuthLinksToExistingLocalAccountByEmail() throws Exception {
		mockMvc.perform(post("/api/auth/signup")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"link@example.com\",\"password\":\"local-password\",\"nickname\":\"로컬회원\"}"))
			.andExpect(status().isOk());

		mockMvc.perform(get("/api/me")
				.with(oauth2Login()
					.attributes((attributes) -> {
						attributes.put("sub", "google-linked-user");
						attributes.put("email", "link@example.com");
						attributes.put("name", "구글회원");
					})))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.mode").value("account"))
			.andExpect(jsonPath("$.provider").value("google"))
			.andExpect(jsonPath("$.providerId").value("google-linked-user"))
			.andExpect(jsonPath("$.email").value("link@example.com"));
	}

	@Test
	void localDataCanBeImportedAndExportedByAccount() throws Exception {
		String payload = """
			{
			  "today": [
			    { "id": "today-1", "date": "2026-06-01", "title": "로컬 할 일", "completed": false }
			  ],
			  "daily": [
			    { "id": "daily-1", "title": "물 마시기", "active": true }
			  ],
			  "planned": [],
			  "lists": []
			}
			""";

		mockMvc.perform(post("/api/sync/import-local")
				.header("X-Prototype-Account-Id", "prototype-google-user")
				.contentType(MediaType.APPLICATION_JSON)
				.content(payload))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.today", hasSize(1)))
			.andExpect(jsonPath("$.today[0].title").value("로컬 할 일"))
			.andExpect(jsonPath("$.daily[0].title").value("물 마시기"));

		mockMvc.perform(get("/api/sync/export")
				.header("X-Prototype-Account-Id", "prototype-google-user"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.today[0].title").value("로컬 할 일"))
			.andExpect(jsonPath("$.daily[0].title").value("물 마시기"));
	}

	@Test
	void accountDataIsSeparatedByPrototypeAccountId() throws Exception {
		String firstAccountPayload = """
			{
			  "today": [
			    { "id": "first-today", "date": "2026-06-04", "title": "첫 계정 할 일", "completed": false }
			  ],
			  "daily": [],
			  "planned": [],
			  "lists": []
			}
			""";
		String secondAccountPayload = """
			{
			  "today": [
			    { "id": "second-today", "date": "2026-06-04", "title": "두 번째 계정 할 일", "completed": false }
			  ],
			  "daily": [],
			  "planned": [],
			  "lists": []
			}
			""";

		mockMvc.perform(post("/api/sync/import-local")
				.header("X-Prototype-Account-Id", "prototype-first-user")
				.contentType(MediaType.APPLICATION_JSON)
				.content(firstAccountPayload))
			.andExpect(status().isOk());

		mockMvc.perform(post("/api/sync/import-local")
				.header("X-Prototype-Account-Id", "prototype-second-user")
				.contentType(MediaType.APPLICATION_JSON)
				.content(secondAccountPayload))
			.andExpect(status().isOk());

		mockMvc.perform(get("/api/sync/export")
				.header("X-Prototype-Account-Id", "prototype-first-user"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.today", hasSize(1)))
			.andExpect(jsonPath("$.today[0].title").value("첫 계정 할 일"));

		mockMvc.perform(get("/api/sync/export")
				.header("X-Prototype-Account-Id", "prototype-second-user"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.today", hasSize(1)))
			.andExpect(jsonPath("$.today[0].title").value("두 번째 계정 할 일"));
	}
}
