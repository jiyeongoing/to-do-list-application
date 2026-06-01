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

@SpringBootTest
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
}
