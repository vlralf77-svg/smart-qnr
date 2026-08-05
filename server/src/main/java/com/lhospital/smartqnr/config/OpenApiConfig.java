package com.lhospital.smartqnr.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI 3.0 문서 설정 — 모든 REST 컨트롤러가 springdoc 로 자동 문서화된다.
 *
 * <ul>
 *   <li>OpenAPI JSON: {@code /v3/api-docs}
 *   <li>Swagger UI: {@code /swagger-ui.html}
 * </ul>
 *
 * JWT(Bearer) 인증 스킴을 함께 정의해 보호된 엔드포인트를 문서에 표시한다.
 */
@Configuration
public class OpenApiConfig {

  @Value("${app.version:0.1.0}")
  private String appVersion;

  private static final String BEARER = "bearerAuth";

  @Bean
  public OpenAPI smartQnrOpenAPI() {
    return new OpenAPI()
        .info(
            new Info()
                .title("SmartQnR API")
                .description("건국대학교병원 스마트 통합시스템 — 문진 관리/응답 REST API (OpenAPI 3.0)")
                .version(appVersion)
                .contact(new Contact().name("SmartQnR"))
                .license(new License().name("Proprietary")))
        .components(
            new Components()
                .addSecuritySchemes(
                    BEARER,
                    new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")
                        .description("관리자 API는 로그인(/api/auth/login) 후 발급된 JWT 를 Bearer 토큰으로 전달")))
        // 기본 보안 요구(공개 API는 컨트롤러에서 별도 표시 가능)
        .addSecurityItem(new SecurityRequirement().addList(BEARER));
  }
}
