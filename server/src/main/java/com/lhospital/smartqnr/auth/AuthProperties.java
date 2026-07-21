package com.lhospital.smartqnr.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** 로그인/토큰 설정 (application.yml 의 app.auth.*). */
@ConfigurationProperties(prefix = "app.auth")
public class AuthProperties {

  /** 고정 관리자 계정 (초기값: admin) */
  private String username = "admin";

  /**
   * (개발용) 평문 비밀번호. passwordHash 가 설정되면 무시된다.
   * 운영에서는 passwordHash(BCrypt)를 쓰고 이 값은 비워 둘 것.
   */
  private String password = "lit123qwe!";

  /**
   * 관리자 비밀번호 BCrypt 해시. 설정되면 평문(password) 대신 이 값으로 검증한다.
   * 환경변수 AUTH_PASSWORD_HASH. 생성법은 docs/SECURITY.md 참고.
   */
  private String passwordHash = "";

  /** JWT 서명 비밀키. 운영에서는 반드시 환경변수로 강력한 값 지정. */
  private String jwtSecret = "change-this-smartqnr-dev-secret";

  /** 토큰 만료(시간). */
  private long expiryHours = 12;

  /** 로그인 실패 허용 횟수(초과 시 잠금). */
  private int loginMaxAttempts = 5;

  /** 로그인 잠금 시간(분). */
  private int loginLockMinutes = 10;

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

  public String getPasswordHash() {
    return passwordHash;
  }

  public void setPasswordHash(String passwordHash) {
    this.passwordHash = passwordHash;
  }

  public int getLoginMaxAttempts() {
    return loginMaxAttempts;
  }

  public void setLoginMaxAttempts(int loginMaxAttempts) {
    this.loginMaxAttempts = loginMaxAttempts;
  }

  public int getLoginLockMinutes() {
    return loginLockMinutes;
  }

  public void setLoginLockMinutes(int loginLockMinutes) {
    this.loginLockMinutes = loginLockMinutes;
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
