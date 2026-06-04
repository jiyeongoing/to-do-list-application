package com.swipetodo.sync;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public record TodoState(
	List<Map<String, Object>> today,
	List<Map<String, Object>> daily,
	List<Map<String, Object>> planned,
	List<Map<String, Object>> lists
) {

	public TodoState {
		today = copyOrEmpty(today);
		daily = copyOrEmpty(daily);
		planned = copyOrEmpty(planned);
		lists = copyOrEmpty(lists);
	}

	static TodoState empty() {
		return new TodoState(List.of(), List.of(), List.of(), List.of());
	}

	TodoState merge(TodoState incoming) {
		return new TodoState(
			mergeById(today, incoming.today),
			mergeById(daily, incoming.daily),
			mergeById(planned, incoming.planned),
			mergeById(lists, incoming.lists)
		);
	}

	private static List<Map<String, Object>> copyOrEmpty(List<Map<String, Object>> items) {
		return items == null ? new ArrayList<>() : new ArrayList<>(items);
	}

	private static List<Map<String, Object>> mergeById(
		List<Map<String, Object>> existing,
		List<Map<String, Object>> incoming
	) {
		List<Map<String, Object>> merged = new ArrayList<>(existing);
		for (Map<String, Object> item : incoming) {
			if (item == null || containsId(merged, item.get("id"))) {
				continue;
			}
			merged.add(item);
		}
		return merged;
	}

	private static boolean containsId(List<Map<String, Object>> items, Object id) {
		return items.stream().anyMatch((item) -> item != null && id != null && id.equals(item.get("id")));
	}
}
