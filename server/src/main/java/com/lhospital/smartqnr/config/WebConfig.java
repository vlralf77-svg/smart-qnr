package com.lhospital.smartqnr.config;

import com.lhospital.smartqnr.auth.AuthProperties;
import java.util.Arrays;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** CORS 허용 출처를 환경변수(CORS_ALLOWED_ORIGINS)로 제한 + 설정 프로퍼티 활성화. */
@Configuration
@EnableConfigurationProperties(AuthProperties.class)
public class WebConfig implements WebMvcConfigurer {

  private static final Logger log = LoggerFactory.getLogger(WebConfig.class);

  /** 콤마로 구분된 허용 출처. 기본 "*"(개발). 운영에서는 실제 도메인 지정. */
  @Value("${app.security.allowed-origins:*}")
  private String allowedOrigins;

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    String[] origins =
        Arrays.stream(allowedOrigins.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .toArray(String[]::new);
    if (origins.length == 0) origins = new String[] {"*"};
    if (origins.length == 1 && "*".equals(origins[0])) {
      log.warn("[보안] CORS 가 전체 허용(*)입니다. 운영에서는 CORS_ALLOWED_ORIGINS 로 도메인을 제한하세요.");
    }
    registry
        .addMapping("/api/**")
        .allowedOriginPatterns(origins)
        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
        .allowedHeaders("*")
        .maxAge(3600);
  }
}
