package com.lhospital.smartqnr.auth;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

/** JWT 발급/검증 (HS256). */
@Service
public class JwtService {

  private final SecretKey key;
  private final long expirySeconds;

  public JwtService(AuthProperties props) {
    // 설정된 비밀키를 SHA-256 으로 정규화해 항상 256bit 키를 만든다.
    this.key = Keys.hmacShaKeyFor(sha256(props.getJwtSecret()));
    this.expirySeconds = props.getExpiryHours() * 3600;
  }

  public String issue(String subject) {
    Instant now = Instant.now();
    return Jwts.builder()
        .subject(subject)
        .issuedAt(Date.from(now))
        .expiration(Date.from(now.plusSeconds(expirySeconds)))
        .signWith(key)
        .compact();
  }

  /** 유효하면 subject 반환, 아니면 null. */
  public String verify(String token) {
    try {
      return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().getSubject();
    } catch (Exception e) {
      return null;
    }
  }

  public long getExpirySeconds() {
    return expirySeconds;
  }

  private static byte[] sha256(String s) {
    try {
      return MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }
}
