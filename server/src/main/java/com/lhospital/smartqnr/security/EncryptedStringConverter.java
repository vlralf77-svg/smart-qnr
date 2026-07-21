package com.lhospital.smartqnr.security;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * 문자열 컬럼을 AES-256-GCM 으로 암호화해 저장하는 JPA 컨버터.
 *  엔티티 필드에는 평문(JSON 등)이 오가고, DB 에는 암호문이 저장된다.
 *  DATA_ENCRYPTION_KEY 미설정 시에는 평문 저장(개발).
 */
@Converter
public class EncryptedStringConverter implements AttributeConverter<String, String> {

  @Override
  public String convertToDatabaseColumn(String attribute) {
    return CryptoSupport.encrypt(attribute);
  }

  @Override
  public String convertToEntityAttribute(String dbData) {
    return CryptoSupport.decrypt(dbData);
  }
}
