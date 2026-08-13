package com.lhospital.smartqnr.dblink;

import com.lhospital.smartqnr.dblink.DbLinkDto.TestRequest;
import com.lhospital.smartqnr.dblink.DbLinkDto.TestResult;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * DB 쿼리 연동 — 서버가 병원 DB 에 접속해 SELECT 를 실행하고 결과를 돌려준다.
 * (/api/** 이므로 JwtAuthFilter 가 인증을 요구한다)
 */
@RestController
@RequestMapping("/api/db-link")
public class DbLinkController {

  private final DbLinkService service;

  public DbLinkController(DbLinkService service) {
    this.service = service;
  }

  /** 접속·쿼리 테스트(실제 실행). 결과는 프론트 시뮬레이션과 같은 모양. */
  @PostMapping("/test")
  public TestResult test(@RequestBody TestRequest req) {
    return service.run(req);
  }
}
