package com.lhospital.smartqnr.config;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

/** 잘못된 요청을 일관된 JSON 오류로 변환. */
@RestControllerAdvice
public class ApiExceptionHandler {

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, String>> badRequest(IllegalArgumentException e) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
  }

  /**
   * ResponseStatusException 의 사유(reason)를 응답 본문에 담는다.
   * 기본 처리에서는 본문이 {"error":"Bad Request"} 로만 내려가 화면에서 원인을 알 수 없다.
   */
  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<Map<String, String>> statusException(ResponseStatusException e) {
    String reason = e.getReason();
    return ResponseEntity.status(e.getStatusCode())
        .body(Map.of("error", reason == null || reason.isBlank() ? e.getMessage() : reason));
  }
}
