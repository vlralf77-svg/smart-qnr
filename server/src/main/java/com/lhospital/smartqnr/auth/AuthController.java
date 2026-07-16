package com.lhospital.smartqnr.auth;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** 로그인 → JWT 발급. 프론트 로그인 화면(admin/lit123qwe!)과 연동. */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AuthProperties props;
  private final JwtService jwt;

  public AuthController(AuthProperties props, JwtService jwt) {
    this.props = props;
    this.jwt = jwt;
  }

  public record LoginRequest(String username, String password) {}

  @PostMapping("/login")
  public Map<String, Object> login(@RequestBody LoginRequest req) {
    if (req == null
        || !props.getUsername().equals(req.username())
        || !props.getPassword().equals(req.password())) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다.");
    }
    String token = jwt.issue(req.username());
    return Map.of("token", token, "username", req.username(), "expiresIn", jwt.getExpirySeconds());
  }
}
