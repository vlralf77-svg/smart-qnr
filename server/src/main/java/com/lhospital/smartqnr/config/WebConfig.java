package com.lhospital.smartqnr.config;

import com.lhospital.smartqnr.auth.AuthProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** CORS 허용(개발/데스크톱 앱) + 설정 프로퍼티 활성화. */
@Configuration
@EnableConfigurationProperties(AuthProperties.class)
public class WebConfig implements WebMvcConfigurer {

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    // 개발 서버(vite) 및 Electron(file://) 등에서의 호출 허용.
    // 운영에서는 allowedOriginPatterns 를 실제 도메인으로 제한할 것.
    registry
        .addMapping("/api/**")
        .allowedOriginPatterns("*")
        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
        .allowedHeaders("*")
        .maxAge(3600);
  }
}
