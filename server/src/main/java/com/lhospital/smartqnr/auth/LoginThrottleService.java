package com.lhospital.smartqnr.auth;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

/**
 * 로그인 무차별 대입(brute-force) 방지 — 인메모리 실패 카운트 + 계정 잠금.
 *  key(사용자/IP)별로 실패 횟수를 세고, 임계치 초과 시 일정 시간 잠근다.
 *  단일 인스턴스 기준. 다중 인스턴스 운영 시 Redis 등 공유 저장소로 전환 권장.
 */
@Service
public class LoginThrottleService {

  private final int maxAttempts;
  private final long lockMillis;

  private static final class Attempt {
    int count;
    Instant lockedUntil;
  }

  private final ConcurrentHashMap<String, Attempt> attempts = new ConcurrentHashMap<>();

  public LoginThrottleService(AuthProperties props) {
    this.maxAttempts = Math.max(1, props.getLoginMaxAttempts());
    this.lockMillis = Math.max(1, props.getLoginLockMinutes()) * 60_000L;
  }

  /** 현재 잠겨있으면 남은 시간(초), 아니면 0. */
  public long lockedSeconds(String key) {
    Attempt a = attempts.get(key);
    if (a == null || a.lockedUntil == null) return 0;
    long remain = a.lockedUntil.toEpochMilli() - Instant.now().toEpochMilli();
    return remain > 0 ? (remain + 999) / 1000 : 0;
  }

  /** 로그인 실패 기록. 임계치 도달 시 잠금. */
  public synchronized void recordFailure(String key) {
    Attempt a = attempts.computeIfAbsent(key, k -> new Attempt());
    // 잠금 만료됐으면 초기화
    if (a.lockedUntil != null && a.lockedUntil.isBefore(Instant.now())) {
      a.count = 0;
      a.lockedUntil = null;
    }
    a.count++;
    if (a.count >= maxAttempts) {
      a.lockedUntil = Instant.now().plusMillis(lockMillis);
    }
  }

  /** 로그인 성공 시 카운트 리셋. */
  public void recordSuccess(String key) {
    attempts.remove(key);
  }
}
