package com.lhospital.smartqnr.auth;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** 로그인 → JWT 발급. 비밀번호 BCrypt 해시 검증(설정 시) + 무차별 대입 방지. */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private static final Logger log = LoggerFactory.getLogger(AuthController.class);

  private final AuthProperties props;
  private final JwtService jwt;
  private final LoginThrottleService throttle;
  private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

  public AuthController(AuthProperties props, JwtService jwt, LoginThrottleService throttle) {
    this.props = props;
    this.jwt = jwt;
    this.throttle = throttle;
    if (props.getPasswordHash() == null || props.getPasswordHash().isBlank()) {
      log.warn("[보안] 관리자 비밀번호가 평문입니다. 운영에서는 AUTH_PASSWORD_HASH(BCrypt)로 교체하세요.");
    }
  }

  public record LoginRequest(String username, String password) {}

  private boolean passwordMatches(String raw) {
    String hash = props.getPasswordHash();
    if (hash != null && !hash.isBlank()) {
      try {
        return encoder.matches(raw, hash);
      } catch (IllegalArgumentException e) {
        log.error("[보안] AUTH_PASSWORD_HASH 형식 오류(BCrypt 필요).");
        return false;
      }
    }
    return props.getPassword() != null && props.getPassword().equals(raw); // 개발 폴백
  }

  @PostMapping("/login")
  public Map<String, Object> login(@RequestBody LoginRequest req, HttpServletRequest http) {
    final String key = (req != null ? String.valueOf(req.username()) : "?") + "|" + clientIp(http);

    long locked = throttle.lockedSeconds(key);
    if (locked > 0) {
      throw new ResponseStatusException(
          HttpStatus.TOO_MANY_REQUESTS, "로그인 시도가 너무 많습니다. " + locked + "초 후 다시 시도하세요.");
    }

    boolean ok =
        req != null
            && props.getUsername().equals(req.username())
            && req.password() != null
            && passwordMatches(req.password());

    if (!ok) {
      throttle.recordFailure(key);
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다.");
    }

    throttle.recordSuccess(key);
    String token = jwt.issue(req.username());
    return Map.of("token", token, "username", req.username(), "expiresIn", jwt.getExpirySeconds());
  }

  private static String clientIp(HttpServletRequest http) {
    if (http == null) return "?";
    String xff = http.getHeader("X-Forwarded-For");
    if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
    return http.getRemoteAddr();
  }
}
