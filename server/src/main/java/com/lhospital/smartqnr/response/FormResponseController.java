package com.lhospital.smartqnr.response;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 문진 응답 제출/조회. 본문은 프론트 FormResponse JSON 그대로. */
@RestController
@RequestMapping("/api")
public class FormResponseController {

  private final FormResponseRepository repo;
  private final ObjectMapper mapper;

  public FormResponseController(FormResponseRepository repo, ObjectMapper mapper) {
    this.repo = repo;
    this.mapper = mapper;
  }

  /** 응답 제출. responseId 가 없으면 서버가 발급. */
  @PostMapping("/responses")
  public JsonNode submit(@RequestBody JsonNode body) {
    ObjectNode node = (ObjectNode) body.deepCopy();
    String responseId = node.path("responseId").asText(null);
    if (responseId == null || responseId.isBlank()) {
      responseId = "RES_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
      node.put("responseId", responseId);
    }
    Instant now = Instant.now();
    if (!node.hasNonNull("submittedAt")) {
      node.put("submittedAt", now.toString());
    }

    FormResponseEntity e = new FormResponseEntity();
    e.setResponseId(responseId);
    e.setFormId(node.path("formId").asText());
    e.setFormVersion(node.path("formVersion").asInt(1));
    e.setPatientId(node.path("patientId").isMissingNode() ? null : node.path("patientId").asText(null));
    JsonNode answers = node.get("answers");
    e.setAnswersJson(answers == null ? "{}" : answers.toString());
    e.setSubmittedAt(now);
    repo.save(e);
    return node;
  }

  @GetMapping("/forms/{formId}/responses")
  public List<JsonNode> byForm(@PathVariable String formId) {
    return repo.findByFormIdOrderBySubmittedAtDesc(formId).stream().map(this::toJson).toList();
  }

  private JsonNode toJson(FormResponseEntity e) {
    ObjectNode node = mapper.createObjectNode();
    node.put("responseId", e.getResponseId());
    node.put("formId", e.getFormId());
    node.put("formVersion", e.getFormVersion());
    if (e.getPatientId() != null) {
      node.put("patientId", e.getPatientId());
    }
    node.put("submittedAt", e.getSubmittedAt().toString());
    try {
      node.set("answers", mapper.readTree(e.getAnswersJson()));
    } catch (Exception ex) {
      node.putObject("answers");
    }
    return node;
  }
}
