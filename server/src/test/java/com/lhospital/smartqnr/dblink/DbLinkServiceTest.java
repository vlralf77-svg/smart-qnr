package com.lhospital.smartqnr.dblink;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.lhospital.smartqnr.dblink.DbLinkDto.BindParam;
import com.lhospital.smartqnr.dblink.DbLinkDto.TestRequest;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

/** DB 쿼리 연동 — 쿼리 검증·바인드 파싱·URL 생성(DB 접속 없이 검증 가능한 부분). */
class DbLinkServiceTest {

  private static TestRequest req(String mode, String host, String svc, String alias, String url) {
    return new TestRequest(
        mode, host, "1521", svc, alias, "", url, "u", "p", "SELECT 1", List.of(), Map.of(), 10);
  }

  @Test
  @DisplayName("조회(SELECT/WITH) 쿼리는 허용된다")
  void allowsSelect() {
    DbLinkService.validateSelectOnly("SELECT a FROM t WHERE x = :x");
    DbLinkService.validateSelectOnly("  with c as (select 1) select * from c ");
    DbLinkService.validateSelectOnly("SELECT a FROM t; "); // 끝의 세미콜론은 허용
  }

  @Test
  @DisplayName("조회 외 구문(INSERT/UPDATE/DELETE/DROP 등)은 차단한다")
  void blocksNonSelect() {
    for (String sql :
        List.of(
            "UPDATE t SET a=1",
            "DELETE FROM t",
            "INSERT INTO t VALUES (1)",
            "DROP TABLE t",
            "TRUNCATE TABLE t",
            "CALL proc()",
            "GRANT SELECT ON t TO u")) {
      assertThrows(ResponseStatusException.class, () -> DbLinkService.validateSelectOnly(sql), sql);
    }
  }

  @Test
  @DisplayName("다중 문장(세미콜론으로 이어붙인 SQL 인젝션)은 차단한다")
  void blocksMultipleStatements() {
    assertThrows(
        ResponseStatusException.class,
        () -> DbLinkService.validateSelectOnly("SELECT 1; DROP TABLE t"));
    // 주석 뒤에 붙인 경우도 차단
    assertThrows(
        ResponseStatusException.class,
        () -> DbLinkService.validateSelectOnly("SELECT 1 -- ok\n; DELETE FROM t"));
  }

  @Test
  @DisplayName("문자열 리터럴 안의 금지어·세미콜론은 오탐하지 않는다")
  void ignoresLiterals() {
    DbLinkService.validateSelectOnly("SELECT 'delete; drop' AS memo FROM t");
  }

  @Test
  @DisplayName(":name 은 ? 로 치환되고 이름이 순서대로 수집된다")
  void parsesNamedParams() {
    var p = DbLinkService.parseNamedParams("SELECT * FROM t WHERE a = :aa AND b = :bb");
    assertEquals(List.of("aa", "bb"), p.names());
    assertTrue(p.sql().endsWith("a = ? AND b = ?"));
  }

  @Test
  @DisplayName("PostgreSQL 캐스팅(::type)은 바인드 변수로 오인하지 않는다")
  void keepsPgCast() {
    var p = DbLinkService.parseNamedParams("SELECT no::text FROM t WHERE no = :no");
    assertEquals(List.of("no"), p.names());
    assertTrue(p.sql().contains("no::text"));
  }

  @Test
  @DisplayName("문자열·주석 안의 :word 는 바인드 변수가 아니다")
  void ignoresColonInLiteralsAndComments() {
    var p = DbLinkService.parseNamedParams("SELECT 'a:b' /* :c */ -- :d\n FROM t WHERE x = :x");
    assertEquals(List.of("x"), p.names());
  }

  @Test
  @DisplayName("고정값과 실행 시 입력값을 합치고, 실행 입력이 우선한다")
  void mergesParams() {
    var r =
        new TestRequest(
            "jdbc", "", "", "", "", "", "jdbc:postgresql://h/db", "u", "p",
            "SELECT 1",
            List.of(new BindParam("a", "1"), new BindParam("b", " ")),
            Map.of("b", "2", "a", "9"),
            10);
    assertEquals(Map.of("a", "9", "b", "2"), DbLinkService.effectiveParams(r));
  }

  @Test
  @DisplayName("바인드 값은 항상 문자열로 넘긴다(앞자리 0 유지, 문자 컬럼 비교 오류 방지)")
  void bindsAsText() {
    assertEquals("10001", DbLinkService.coerce("10001"));
    assertEquals("000000128", DbLinkService.coerce("000000128")); // 앞자리 0 이 살아 있어야 한다
    assertEquals("1.5", DbLinkService.coerce(" 1.5 "));
    assertEquals("10001A", DbLinkService.coerce("10001A"));
  }

  @Test
  @DisplayName("접속 방식별 JDBC URL 을 생성한다")
  void buildsUrl() {
    assertEquals(
        "jdbc:oracle:thin:@//db.local:1521/ORCLPDB1",
        DbLinkService.buildUrl(req("ezconnect", "db.local", "ORCLPDB1", "", "")));
    assertEquals(
        "jdbc:oracle:thin:@EMRDB", DbLinkService.buildUrl(req("tns", "", "", "EMRDB", "")));
    assertEquals(
        "jdbc:postgresql://h:5432/db",
        DbLinkService.buildUrl(req("jdbc", "", "", "", "jdbc:postgresql://h:5432/db")));
    // 정보가 부족하면 빈 문자열(호출부에서 400 안내)
    assertEquals("", DbLinkService.buildUrl(req("ezconnect", "", "", "", "")));
  }

  @Test
  @DisplayName("URL 의 비밀번호는 로그·응답에서 가린다")
  void masksPassword() {
    assertTrue(DbLinkService.maskUrl("jdbc:x://h/db?password=secret").contains("password=***"));
  }
}
