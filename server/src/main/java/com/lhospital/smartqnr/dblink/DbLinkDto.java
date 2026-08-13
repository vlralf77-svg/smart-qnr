package com.lhospital.smartqnr.dblink;

import java.util.List;
import java.util.Map;

/** DB 쿼리 연동 테스트 요청/응답 DTO. */
public final class DbLinkDto {

  private DbLinkDto() {}

  /** 바인드 파라미터(:key = value). value 가 비면 실행 시 입력값(runtime)으로 채운다. */
  public record BindParam(String key, String value) {}

  /**
   * 접속 정보 + 쿼리 + 파라미터. 프론트의 DbLinkConfig 와 같은 모양이며,
   * 비밀번호는 저장하지 않고 이 요청에서만 사용한다.
   */
  public record TestRequest(
      /** 접속 방식: ezconnect | tns | jdbc */
      String mode,
      String host,
      String port,
      String serviceName,
      String tnsAlias,
      /** tnsnames.ora 위치(TNS_ADMIN) — tns 모드에서 사용 */
      String tnsAdmin,
      String jdbcUrl,
      String user,
      String password,
      String query,
      List<BindParam> params,
      /** 실행 시 입력한 파라미터 값(키=값) — params 의 빈 값을 채운다 */
      Map<String, String> runtime,
      /** 최대 조회 행 수(기본 50, 최대 500) */
      Integer limit) {}

  /** 프론트 시뮬레이션(SimResult)과 동일한 모양 — 화면을 그대로 재사용한다. */
  public record TestResult(
      List<String> columns,
      List<Map<String, Object>> rows,
      int matched,
      Map<String, String> effective,
      String note) {}
}
