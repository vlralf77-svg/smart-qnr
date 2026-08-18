package com.lhospital.smartqnr.emr;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * EMR/외부 API 대리 호출(프록시).
 *
 * <p>브라우저에서 다른 출처의 API 를 직접 부르면 그 서버가 CORS 를 허용해야만 응답을 읽을 수 있다.
 * 서버끼리의 호출에는 그 제약이 없으므로, 연동 관리 화면의 '서버 경유로 호출' 옵션이 켜지면
 * 이 엔드포인트가 대신 호출하고 결과만 그대로 돌려준다.
 *
 * <p>JwtAuthFilter 가 /api/** 에 Bearer 토큰을 요구하므로 로그인한 관리자만 사용할 수 있다.
 * 응답 본문은 파싱하지 않고 문자열 그대로 전달하며(화면에서 JSON 파싱), 과도한 응답은 잘라낸다.
 */
@RestController
@RequestMapping("/api/emr-proxy")
public class EmrProxyController {

  private static final Logger log = LoggerFactory.getLogger(EmrProxyController.class);

  /** 응답 본문 최대 길이(자) — 그 이상은 잘라서 돌려준다. */
  private static final int MAX_BODY = 512 * 1024;

  /** HttpClient 가 직접 관리하므로 요청자가 지정할 수 없는 헤더. */
  private static final Set<String> BLOCKED_HEADERS =
      Set.of(
          "host",
          "connection",
          "content-length",
          "expect",
          "upgrade",
          "via",
          "date",
          "transfer-encoding");

  private final HttpClient http =
      HttpClient.newBuilder()
          .connectTimeout(Duration.ofSeconds(5))
          .followRedirects(HttpClient.Redirect.NORMAL)
          .build();

  /** 화면이 보내는 호출 정보. */
  public record ProxyRequest(String url, String method, Map<String, String> headers, String body) {}

  /** 대리 호출 결과 — 화면의 직접 호출 결과와 같은 모양. */
  public record ProxyResponse(boolean ok, int status, String body, String error) {}

  @PostMapping
  public ProxyResponse call(@RequestBody ProxyRequest req) {
    if (req == null || req.url() == null || req.url().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "호출할 URL이 없습니다.");
    }
    URI uri;
    try {
      uri = new URI(req.url().trim());
    } catch (URISyntaxException e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "URL 형식이 올바르지 않습니다.");
    }
    String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
    if (!scheme.equals("http") && !scheme.equals("https")) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "http/https 주소만 호출할 수 있습니다.");
    }

    String method = req.method() == null ? "GET" : req.method().trim().toUpperCase(Locale.ROOT);
    if (!method.equals("GET") && !method.equals("POST")) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "GET/POST 만 지원합니다.");
    }

    HttpRequest.Builder b = HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(20));
    if (req.headers() != null) {
      for (Map.Entry<String, String> h : req.headers().entrySet()) {
        String name = h.getKey() == null ? "" : h.getKey().trim();
        if (name.isEmpty() || BLOCKED_HEADERS.contains(name.toLowerCase(Locale.ROOT))) continue;
        try {
          b.header(name, h.getValue() == null ? "" : h.getValue());
        } catch (IllegalArgumentException ignored) {
          // HttpClient 가 거부하는 헤더는 건너뛴다
        }
      }
    }
    String body = req.body() == null ? "" : req.body();
    b.method(method, method.equals("POST") ? HttpRequest.BodyPublishers.ofString(body) : HttpRequest.BodyPublishers.noBody());

    try {
      HttpResponse<String> res = http.send(b.build(), HttpResponse.BodyHandlers.ofString());
      String text = res.body() == null ? "" : res.body();
      if (text.length() > MAX_BODY) text = text.substring(0, MAX_BODY);
      boolean ok = res.statusCode() >= 200 && res.statusCode() < 300;
      log.info("[연동] 대리 호출 {} {} → {}", method, uri.getHost(), res.statusCode());
      return new ProxyResponse(ok, res.statusCode(), text, null);
    } catch (IOException e) {
      log.warn("[연동] 대리 호출 실패 {} {} — {}", method, uri.getHost(), e.toString());
      return new ProxyResponse(false, 0, null, "대상 서버에 연결할 수 없습니다: " + e.getMessage());
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      return new ProxyResponse(false, 0, null, "호출이 중단되었습니다.");
    }
  }
}
