package com.lhospital.smartqnr.publicapi;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lhospital.smartqnr.form.FormService;
import com.lhospital.smartqnr.response.FormResponseEntity;
import com.lhospital.smartqnr.response.FormResponseRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * 환자(실사용자) 공개 API — 인증 불필요.
 * 테스트 대상(testFlag=true) 문진만 조회/제출.
 */
@RestController
@RequestMapping("/api/public")
public class PublicController {

  private final FormService formService;
  private final FormResponseRepository responseRepo;
  private final ObjectMapper mapper;

  public PublicController(
      FormService formService, FormResponseRepository responseRepo, ObjectMapper mapper) {
    this.formService = formService;
    this.responseRepo = responseRepo;
    this.mapper = mapper;
  }

  @GetMapping("/forms")
  public List<JsonNode> forms() {
    return formService.listTest();
  }

  @GetMapping("/forms/{id}")
  public JsonNode form(@PathVariable String id) {
    JsonNode f =
        formService
            .get(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "문진 없음"));
    // 테스트 대상이 아니면 노출하지 않음
    if (!f.path("testFlag").asBoolean(false)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "문진 없음");
    }
    return f;
  }

  @PostMapping("/responses")
  public JsonNode submit(@RequestBody JsonNode body) {
    ObjectNode node = (ObjectNode) body.deepCopy();
    String responseId = node.path("responseId").asText(null);
    if (responseId == null || responseId.isBlank()) {
      responseId = "RES_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
      node.put("responseId", responseId);
    }
    Instant now = Instant.now();
    node.put("submittedAt", now.toString());

    FormResponseEntity e = new FormResponseEntity();
    e.setResponseId(responseId);
    e.setFormId(node.path("formId").asText());
    e.setFormVersion(node.path("formVersion").asInt(1));
    e.setPatientId(node.path("patientId").isMissingNode() ? null : node.path("patientId").asText(null));
    JsonNode answers = node.get("answers");
    e.setAnswersJson(answers == null ? "{}" : answers.toString());
    e.setSubmittedAt(now);
    responseRepo.save(e);
    return node;
  }
}
