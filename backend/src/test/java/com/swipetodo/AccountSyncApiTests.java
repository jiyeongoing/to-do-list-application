package com.swipetodo;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
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
	void prototypeGoogleLoginReturnsAccount() throws Exception {
		mockMvc.perform(post("/api/auth/google/prototype"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.mode").value("account"))
			.andExpect(jsonPath("$.provider").value("google"))
			.andExpect(jsonPath("$.providerId").value("prototype-google-user"));
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
