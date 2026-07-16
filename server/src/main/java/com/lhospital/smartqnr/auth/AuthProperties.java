package com.lhospital.smartqnr.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** 로그인/토큰 설정 (application.yml 의 app.auth.*). */
@ConfigurationProperties(prefix = "app.auth")
public class AuthProperties {

  /** 고정 관리자 계정 (초기값: admin) */
  private String username = "admin";

  /** 고정 관리자 비밀번호 (초기값: lit123qwe!). 운영에서는 환경변수로 덮어쓸 것. */
  private String password = "lit123qwe!";

  /** JWT 서명 비밀키. 운영에서는 반드시 환경변수로 강력한 값 지정. */
  private String jwtSecret = "change-this-smartqnr-dev-secret";

  /** 토큰 만료(시간). */
  private long expiryHours = 12;

  public String getUsername() {
    return username;
  }

  public void setUsername(String username) {
    this.username = username;
  }

  public String getPassword() {
    return password;
  }

  public void setPassword(String password) {
    this.password = password;
  }

  public String getJwtSecret() {
    return jwtSecret;
  }

  public void setJwtSecret(String jwtSecret) {
    this.jwtSecret = jwtSecret;
  }

  public long getExpiryHours() {
    return expiryHours;
  }

  public void setExpiryHours(long expiryHours) {
    this.expiryHours = expiryHours;
  }
}
