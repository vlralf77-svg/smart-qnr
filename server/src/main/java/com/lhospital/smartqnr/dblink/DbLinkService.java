package com.lhospital.smartqnr.dblink;

import com.lhospital.smartqnr.dblink.DbLinkDto.BindParam;
import com.lhospital.smartqnr.dblink.DbLinkDto.TestRequest;
import com.lhospital.smartqnr.dblink.DbLinkDto.TestResult;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * 병원 DB 로 직접 쿼리해 결과를 돌려준다(브라우저는 DB 접속이 불가하므로 서버가 대행).
 *
 * <p>안전장치: 조회(SELECT/WITH)만 허용, 단일 문장만 허용, 읽기 전용 커넥션,
 * 접속·쿼리 타임아웃, 최대 행 수 제한. 비밀번호는 저장하지 않고 요청 처리 중에만 사용한다.
 */
@Service
public class DbLinkService {

  private static final Logger log = LoggerFactory.getLogger(DbLinkService.class);

  private static final int LOGIN_TIMEOUT_SEC = 5;
  private static final int QUERY_TIMEOUT_SEC = 15;
  private static final int DEFAULT_LIMIT = 50;
  private static final int MAX_LIMIT = 500;

  /** 조회 외 구문 차단(주석·문자열 제거 후 단어 단위로 검사) */
  private static final Pattern FORBIDDEN =
      Pattern.compile(
          "\\b(INSERT|UPDATE|DELETE|MERGE|UPSERT|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|"
              + "COMMIT|ROLLBACK|SAVEPOINT|EXEC|EXECUTE|CALL|LOCK|SET|VACUUM|COPY|DO)\\b");

  /** 파싱 결과 — ? 로 치환된 SQL + 순서대로의 바인드 변수명 */
  record Parsed(String sql, List<String> names) {}

  public TestResult run(TestRequest req) {
    if (req == null) throw bad("요청이 비어 있습니다.");
    final String url = buildUrl(req);
    if (url.isBlank()) throw bad("접속 정보(JDBC URL)를 확인하세요. 호스트·서비스명 또는 URL 이 필요합니다.");

    final String rawSql = req.query() == null ? "" : req.query().trim();
    if (rawSql.isBlank()) throw bad("실행할 쿼리를 입력하세요.");
    validateSelectOnly(rawSql);

    final Parsed parsed = parseNamedParams(rawSql);
    final Map<String, String> effective = effectiveParams(req);

    // 쿼리에 쓰인 바인드 변수는 모두 값이 있어야 한다
    for (String n : parsed.names()) {
      if (!effective.containsKey(n)) throw bad("바인드 변수 :" + n + " 의 값이 없습니다.");
    }

    final int limit = clampLimit(req.limit());
    ensureDriver(url);

    final Properties props = new Properties();
    if (req.user() != null && !req.user().isBlank()) props.setProperty("user", req.user());
    if (req.password() != null && !req.password().isEmpty()) {
      props.setProperty("password", req.password());
    }
    // TNS 별칭 모드: tnsnames.ora 위치 전달
    if (req.tnsAdmin() != null && !req.tnsAdmin().isBlank()) {
      props.setProperty("oracle.net.tns_admin", req.tnsAdmin().trim());
    }

    DriverManager.setLoginTimeout(LOGIN_TIMEOUT_SEC);
    long started = System.currentTimeMillis();

    try (Connection conn = DriverManager.getConnection(url, props)) {
      try {
        conn.setReadOnly(true); // 지원하지 않는 드라이버는 무시
      } catch (SQLException ignore) {
        /* 무시 */
      }
      try (PreparedStatement ps = conn.prepareStatement(parsed.sql())) {
        ps.setQueryTimeout(QUERY_TIMEOUT_SEC);
        ps.setMaxRows(limit);
        for (int i = 0; i < parsed.names().size(); i++) {
          ps.setObject(i + 1, coerce(effective.get(parsed.names().get(i))));
        }
        try (ResultSet rs = ps.executeQuery()) {
          ResultSetMetaData md = rs.getMetaData();
          int n = md.getColumnCount();
          List<String> columns = new ArrayList<>(n);
          for (int i = 1; i <= n; i++) {
            String label = md.getColumnLabel(i);
            columns.add(label == null || label.isBlank() ? md.getColumnName(i) : label);
          }
          List<Map<String, Object>> rows = new ArrayList<>();
          while (rs.next() && rows.size() < limit) {
            Map<String, Object> row = new LinkedHashMap<>();
            for (int i = 1; i <= n; i++) row.put(columns.get(i - 1), jsonSafe(rs.getObject(i)));
            rows.add(row);
          }
          long ms = System.currentTimeMillis() - started;
          String note =
              "실제 DB 실행 · " + maskUrl(url) + " · " + ms + "ms · 최대 " + limit + "행"
                  + (rows.size() >= limit ? " (상한에 도달해 일부만 표시)" : "");
          return new TestResult(columns, rows, rows.size(), effective, note);
        }
      }
    } catch (SQLException e) {
      log.warn("[DB연동] 실행 실패 url={} state={} code={}", maskUrl(url), e.getSQLState(), e.getErrorCode());
      throw bad("DB 실행 실패: " + rootMessage(e));
    }
  }

  // ───────────────────────── 접속 URL ─────────────────────────

  /** 설정 모드에 따라 JDBC URL 생성(프론트 buildJdbcUrl 과 동일 규칙) */
  static String buildUrl(TestRequest r) {
    String mode = r.mode() == null ? "ezconnect" : r.mode();
    switch (mode) {
      case "jdbc":
        return nz(r.jdbcUrl());
      case "tns": {
        String alias = nz(r.tnsAlias());
        return alias.isBlank() ? "" : "jdbc:oracle:thin:@" + alias;
      }
      default: {
        String host = nz(r.host());
        String port = nz(r.port()).isBlank() ? "1521" : nz(r.port());
        String svc = nz(r.serviceName());
        return host.isBlank() || svc.isBlank()
            ? ""
            : "jdbc:oracle:thin:@//" + host + ":" + port + "/" + svc;
      }
    }
  }

  /** 드라이버 존재 확인 — Oracle 은 라이선스 때문에 기본 빌드에 포함되지 않는다. */
  private static void ensureDriver(String url) {
    if (url.startsWith("jdbc:oracle:")) {
      if (!classPresent("oracle.jdbc.OracleDriver")) {
        throw bad(
            "Oracle JDBC 드라이버가 없습니다. 서버를 -P oracle 프로파일로 빌드하거나"
                + " ojdbc11 을 클래스패스에 추가하세요. (PostgreSQL 은 기본 포함)");
      }
      return;
    }
    if (url.startsWith("jdbc:postgresql:")) {
      if (!classPresent("org.postgresql.Driver")) throw bad("PostgreSQL JDBC 드라이버가 없습니다.");
      return;
    }
    // 그 외 드라이버는 SPI 자동 등록에 맡긴다(없으면 실행 시 오류 메시지로 안내)
  }

  private static boolean classPresent(String fqcn) {
    try {
      Class.forName(fqcn);
      return true;
    } catch (ClassNotFoundException e) {
      return false;
    }
  }

  // ───────────────────────── 쿼리 검증·파싱 ─────────────────────────

  /** 조회 전용 검증 — 주석·문자열을 제거한 뒤 판단한다. */
  static void validateSelectOnly(String sql) {
    String bare = stripLiterals(sql).trim();
    // 끝의 세미콜론은 허용, 중간에 있으면 다중 문장으로 간주
    String body = bare.endsWith(";") ? bare.substring(0, bare.length() - 1) : bare;
    if (body.contains(";")) throw bad("한 번에 하나의 SELECT 문만 실행할 수 있습니다.");
    String upper = body.toUpperCase(Locale.ROOT).trim();
    if (!(upper.startsWith("SELECT") || upper.startsWith("WITH"))) {
      throw bad("조회(SELECT) 쿼리만 실행할 수 있습니다.");
    }
    var m = FORBIDDEN.matcher(upper);
    if (m.find()) throw bad("허용되지 않는 구문이 포함되어 있습니다: " + m.group(1));
  }

  /** 문자열 리터럴·주석을 공백으로 치환(검증용) */
  static String stripLiterals(String sql) {
    StringBuilder out = new StringBuilder(sql.length());
    for (int i = 0; i < sql.length(); i++) {
      char ch = sql.charAt(i);
      if (ch == '\'' || ch == '"') { // 리터럴/식별자
        char q = ch;
        i++;
        while (i < sql.length()) {
          if (sql.charAt(i) == q) {
            if (i + 1 < sql.length() && sql.charAt(i + 1) == q) i++; // 이스케이프('')
            else break;
          }
          i++;
        }
        out.append(' ');
      } else if (ch == '-' && i + 1 < sql.length() && sql.charAt(i + 1) == '-') {
        while (i < sql.length() && sql.charAt(i) != '\n') i++;
        out.append(' ');
      } else if (ch == '/' && i + 1 < sql.length() && sql.charAt(i + 1) == '*') {
        i += 2;
        while (i + 1 < sql.length() && !(sql.charAt(i) == '*' && sql.charAt(i + 1) == '/')) i++;
        i++;
        out.append(' ');
      } else {
        out.append(ch);
      }
    }
    return out.toString();
  }

  /**
   * :name 형태의 바인드 변수를 ? 로 바꾸고 이름을 순서대로 모은다.
   * 문자열·주석 안의 : 는 무시하고, PostgreSQL 의 캐스팅(::type)도 건너뛴다.
   */
  static Parsed parseNamedParams(String sql) {
    StringBuilder out = new StringBuilder(sql.length());
    List<String> names = new ArrayList<>();
    for (int i = 0; i < sql.length(); i++) {
      char ch = sql.charAt(i);
      if (ch == '\'' || ch == '"') { // 리터럴은 그대로 복사
        char q = ch;
        out.append(ch);
        i++;
        while (i < sql.length()) {
          out.append(sql.charAt(i));
          if (sql.charAt(i) == q) {
            if (i + 1 < sql.length() && sql.charAt(i + 1) == q) {
              out.append(sql.charAt(++i));
            } else break;
          }
          i++;
        }
        continue;
      }
      if (ch == '-' && i + 1 < sql.length() && sql.charAt(i + 1) == '-') { // 한 줄 주석
        while (i < sql.length() && sql.charAt(i) != '\n') out.append(sql.charAt(i++));
        if (i < sql.length()) out.append(sql.charAt(i));
        continue;
      }
      if (ch == '/' && i + 1 < sql.length() && sql.charAt(i + 1) == '*') { // 블록 주석
        out.append("/*");
        i += 2;
        while (i < sql.length() && !(sql.charAt(i) == '*' && i + 1 < sql.length() && sql.charAt(i + 1) == '/')) {
          out.append(sql.charAt(i++));
        }
        out.append("*/");
        i++;
        continue;
      }
      if (ch == ':') {
        if (i + 1 < sql.length() && sql.charAt(i + 1) == ':') { // PostgreSQL 캐스팅
          out.append("::");
          i++;
          continue;
        }
        int j = i + 1;
        while (j < sql.length() && (Character.isLetterOrDigit(sql.charAt(j)) || sql.charAt(j) == '_')) j++;
        if (j > i + 1 && Character.isLetter(sql.charAt(i + 1))) {
          names.add(sql.substring(i + 1, j));
          out.append('?');
          i = j - 1;
          continue;
        }
      }
      out.append(ch);
    }
    return new Parsed(out.toString(), names);
  }

  // ───────────────────────── 파라미터 ─────────────────────────

  /** 고정값 + 실행 시 입력값을 합쳐 실제 사용할 파라미터를 만든다(실행 입력이 우선). */
  static Map<String, String> effectiveParams(TestRequest r) {
    Map<String, String> out = new LinkedHashMap<>();
    if (r.params() != null) {
      for (BindParam p : r.params()) {
        if (p == null || p.key() == null || p.key().isBlank()) continue;
        String v = p.value() == null ? "" : p.value().trim();
        if (!v.isEmpty()) out.put(p.key().trim(), v);
      }
    }
    if (r.runtime() != null) {
      r.runtime()
          .forEach(
              (k, v) -> {
                if (k != null && !k.isBlank() && v != null && !v.trim().isEmpty()) {
                  out.put(k.trim(), v.trim());
                }
              });
    }
    return out;
  }

  /**
   * 바인드 값은 항상 문자열로 넘긴다.
   *
   * <p>숫자로 보인다고 숫자 타입으로 바꾸면 환자번호처럼 앞자리 0 이 있는 값이 깨지고
   * ('000000128' → 128), 문자 컬럼(VARCHAR2)과 숫자를 비교하게 되어 오류가 나거나
   * 인덱스를 못 쓴다. 숫자 컬럼과 비교해야 하면 쿼리에서 캐스팅한다
   * (Oracle 은 문자→숫자 자동 변환, PostgreSQL 은 <code>:param::int</code>).
   */
  static Object coerce(String v) {
    return v == null ? null : v.trim();
  }

  /** JSON 으로 안전하게 직렬화되는 값으로 변환 */
  static Object jsonSafe(Object v) {
    if (v == null) return "";
    if (v instanceof Number || v instanceof Boolean || v instanceof String) return v;
    // 배열 타입 패턴(instanceof byte[] b)은 일부 javac 에서 거부되므로 캐스팅으로 처리
    if (v instanceof byte[]) return "(binary " + ((byte[]) v).length + "B)";
    return String.valueOf(v);
  }

  // ───────────────────────── 기타 ─────────────────────────

  private static int clampLimit(Integer limit) {
    int n = limit == null ? DEFAULT_LIMIT : limit;
    return Math.max(1, Math.min(MAX_LIMIT, n));
  }

  /** URL 에 자격증명이 섞여 있을 수 있으므로 로그·응답에서 가린다. */
  static String maskUrl(String url) {
    return url.replaceAll("(?i)(password|pwd)=([^&;]*)", "$1=***");
  }

  private static String rootMessage(Throwable e) {
    Throwable t = e;
    while (t.getCause() != null && t.getCause() != t) t = t.getCause();
    String m = t.getMessage();
    return m == null || m.isBlank() ? t.getClass().getSimpleName() : maskUrl(m);
  }

  private static String nz(String s) {
    return s == null ? "" : s.trim();
  }

  private static ResponseStatusException bad(String msg) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
  }
}
