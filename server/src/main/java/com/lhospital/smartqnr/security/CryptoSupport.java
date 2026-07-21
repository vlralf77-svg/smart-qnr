package com.lhospital.smartqnr.security;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * 민감 컬럼 암호화 지원 — AES-256-GCM.
 *  키: 환경변수 DATA_ENCRYPTION_KEY (Base64 인코딩된 32바이트).
 *  키가 없으면 암호화하지 않고 평문 저장(개발). 운영에서는 반드시 키를 지정할 것.
 *  형식: "enc:v1:" + Base64(IV(12) || ciphertext||tag)  — 접두어로 암호문/평문 구분.
 */
public final class CryptoSupport {

  private static final String PREFIX = "enc:v1:";
  private static final int IV_LEN = 12;
  private static final int TAG_BITS = 128;
  private static final SecureRandom RANDOM = new SecureRandom();

  private static final SecretKeySpec KEY = loadKey();
  private static boolean warned = false;

  private CryptoSupport() {}

  private static SecretKeySpec loadKey() {
    String b64 = System.getenv("DATA_ENCRYPTION_KEY");
    if (b64 == null || b64.isBlank()) {
      b64 = System.getProperty("DATA_ENCRYPTION_KEY", "");
    }
    if (b64 == null || b64.isBlank()) return null;
    try {
      byte[] raw = Base64.getDecoder().decode(b64.trim());
      if (raw.length != 32) {
        System.err.println("[보안] DATA_ENCRYPTION_KEY 는 Base64(32바이트)여야 합니다. 암호화 비활성화.");
        return null;
      }
      return new SecretKeySpec(raw, "AES");
    } catch (IllegalArgumentException e) {
      System.err.println("[보안] DATA_ENCRYPTION_KEY Base64 디코딩 실패. 암호화 비활성화.");
      return null;
    }
  }

  /** 암호화가 활성(키 존재)인지. */
  public static boolean enabled() {
    if (KEY == null && !warned) {
      warned = true;
      System.err.println("[보안] DATA_ENCRYPTION_KEY 미설정 — 응답 데이터가 평문 저장됩니다(개발). 운영 전 반드시 설정하세요.");
    }
    return KEY != null;
  }

  /** 평문 → 저장용 문자열(키 있으면 암호문, 없으면 원문). */
  public static String encrypt(String plain) {
    if (plain == null) return null;
    if (!enabled()) return plain;
    try {
      byte[] iv = new byte[IV_LEN];
      RANDOM.nextBytes(iv);
      Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(Cipher.ENCRYPT_MODE, KEY, new GCMParameterSpec(TAG_BITS, iv));
      byte[] ct = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));
      byte[] out = new byte[iv.length + ct.length];
      System.arraycopy(iv, 0, out, 0, iv.length);
      System.arraycopy(ct, 0, out, iv.length, ct.length);
      return PREFIX + Base64.getEncoder().encodeToString(out);
    } catch (Exception e) {
      throw new IllegalStateException("암호화 실패", e);
    }
  }

  /** 저장값 → 평문(암호문이면 복호화, 접두어 없으면 그대로). */
  public static String decrypt(String stored) {
    if (stored == null) return null;
    if (!stored.startsWith(PREFIX)) return stored; // 평문(레거시/미암호화)
    if (KEY == null) {
      throw new IllegalStateException("암호문을 읽으려면 DATA_ENCRYPTION_KEY 가 필요합니다.");
    }
    try {
      byte[] all = Base64.getDecoder().decode(stored.substring(PREFIX.length()));
      byte[] iv = new byte[IV_LEN];
      System.arraycopy(all, 0, iv, 0, IV_LEN);
      byte[] ct = new byte[all.length - IV_LEN];
      System.arraycopy(all, IV_LEN, ct, 0, ct.length);
      Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(Cipher.DECRYPT_MODE, KEY, new GCMParameterSpec(TAG_BITS, iv));
      return new String(cipher.doFinal(ct), StandardCharsets.UTF_8);
    } catch (Exception e) {
      throw new IllegalStateException("복호화 실패", e);
    }
  }
}
