package com.lhospital.smartqnr.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * /api/** 요청에 유효한 Bearer 토큰을 요구한다. 단, 로그인 엔드포인트와
 * CORS preflight(OPTIONS)는 통과시킨다.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

  private final JwtService jwt;

  public JwtAuthFilter(JwtService jwt) {
    this.jwt = jwt;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getRequestURI();
    // 인증 불필요: 로그인, CORS preflight, 비 API 경로
    return "OPTIONS".equalsIgnoreCase(request.getMethod())
        || path.startsWith("/api/auth/")
        || !path.startsWith("/api/");
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String header = request.getHeader("Authorization");
    String subject = null;
    if (header != null && header.startsWith("Bearer ")) {
      subject = jwt.verify(header.substring(7));
    }
    if (subject == null) {
      response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
      response.setContentType("application/json;charset=UTF-8");
      response.getWriter().write("{\"error\":\"인증이 필요합니다.\"}");
      return;
    }
    request.setAttribute("authUser", subject);
    chain.doFilter(request, response);
  }
}
