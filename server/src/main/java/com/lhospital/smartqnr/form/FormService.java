package com.lhospital.smartqnr.form;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;

/**
 * 문진 CRUD/발행. 프론트에서 넘어온 FormSchema JSON 을 그대로 저장하고,
 * 조회 시 저장된 JSON 을 그대로 돌려준다(프론트 계약과 1:1).
 */
@Service
public class FormService {

  private final FormRepository repo;
  private final ObjectMapper mapper;

  public FormService(FormRepository repo, ObjectMapper mapper) {
    this.repo = repo;
    this.mapper = mapper;
  }

  public List<JsonNode> listAll() {
    return repo.findAllByOrderByUpdatedAtDesc().stream().map(this::toJson).toList();
  }

  public List<JsonNode> listPublished() {
    return repo.findByStatusOrderByUpdatedAtDesc("published").stream().map(this::toJson).toList();
  }

  public Optional<JsonNode> get(String id) {
    return repo.findById(id).map(this::toJson);
  }

  /** 신규/수정 upsert. 넘어온 JSON 의 id/title/status/version 을 기준으로 저장. */
  public JsonNode save(JsonNode form) {
    String id = text(form, "id");
    if (id == null || id.isBlank()) {
      throw new IllegalArgumentException("form.id 가 필요합니다.");
    }
    Instant now = Instant.now();
    FormEntity e = repo.findById(id).orElseGet(FormEntity::new);
    boolean isNew = e.getCreatedAt() == null;

    // updatedAt 은 서버 기준으로 갱신해 JSON 에도 반영
    ObjectNode node = (ObjectNode) form.deepCopy();
    node.put("updatedAt", now.toString());
    if (isNew && !node.hasNonNull("createdAt")) {
      node.put("createdAt", now.toString());
    }

    e.setId(id);
    e.setTitle(textOr(node, "title", "제목 없는 문진"));
    e.setStatus(textOr(node, "status", "draft"));
    e.setVersion(node.path("version").asInt(1));
    e.setSchemaJson(node.toString());
    e.setCreatedAt(isNew ? now : e.getCreatedAt());
    e.setUpdatedAt(now);
    repo.save(e);
    return toJson(e);
  }

  public JsonNode publish(String id) {
    FormEntity e = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("문진을 찾을 수 없습니다: " + id));
    ObjectNode node = (ObjectNode) toJson(e);
    node.put("status", "published");
    node.put("updatedAt", Instant.now().toString());
    e.setStatus("published");
    e.setUpdatedAt(Instant.now());
    e.setSchemaJson(node.toString());
    repo.save(e);
    return node;
  }

  public boolean delete(String id) {
    if (!repo.existsById(id)) {
      return false;
    }
    repo.deleteById(id);
    return true;
  }

  private JsonNode toJson(FormEntity e) {
    try {
      return mapper.readTree(e.getSchemaJson());
    } catch (Exception ex) {
      throw new IllegalStateException("저장된 문진 JSON 파싱 실패: " + e.getId(), ex);
    }
  }

  private static String text(JsonNode n, String field) {
    JsonNode v = n.get(field);
    return v == null || v.isNull() ? null : v.asText();
  }

  private static String textOr(JsonNode n, String field, String fallback) {
    String v = text(n, field);
    return v == null || v.isBlank() ? fallback : v;
  }
}
