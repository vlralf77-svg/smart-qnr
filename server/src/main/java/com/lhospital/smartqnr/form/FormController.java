package com.lhospital.smartqnr.form;

import tools.jackson.databind.JsonNode;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** 문진 CRUD/발행 REST API. 요청/응답 본문은 프론트 FormSchema JSON 그대로. */
@RestController
@RequestMapping("/api/forms")
public class FormController {

  private final FormService service;

  public FormController(FormService service) {
    this.service = service;
  }

  /** 전체 목록. published=true 이면 발행본만(응답 화면용). */
  @GetMapping
  public List<JsonNode> list(@RequestParam(value = "published", required = false) Boolean published) {
    return Boolean.TRUE.equals(published) ? service.listPublished() : service.listAll();
  }

  @GetMapping("/{id}")
  public JsonNode get(@PathVariable String id) {
    return service
        .get(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "문진을 찾을 수 없습니다."));
  }

  @PostMapping
  public JsonNode create(@RequestBody JsonNode form) {
    return service.save(form);
  }

  @PutMapping("/{id}")
  public JsonNode update(@PathVariable String id, @RequestBody JsonNode form) {
    if (!id.equals(form.path("id").asText())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "경로 id 와 본문 id 가 다릅니다.");
    }
    return service.save(form);
  }

  @PostMapping("/{id}/publish")
  public JsonNode publish(@PathVariable String id) {
    return service.publish(id);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable String id) {
    return service.delete(id) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
  }
}
