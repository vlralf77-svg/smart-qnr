package com.lhospital.smartqnr.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

/** 서버 렌더링(Thymeleaf) 뷰 컨트롤러 — 서버 상태·API 문서 안내 콘솔 페이지. */
@Controller
@Tag(name = "View", description = "서버 렌더링(Thymeleaf) 뷰 컨트롤러")
public class ConsoleViewController {

  @Value("${app.version:0.1.0}")
  private String appVersion;

  @Value("${spring.application.name:smartqnr-server}")
  private String appName;

  @Operation(summary = "서버 콘솔 뷰", description = "Thymeleaf 로 렌더링되는 서버 상태·API 문서 안내 페이지")
  @GetMapping("/console")
  public String console(Model model) {
    model.addAttribute("appName", appName);
    model.addAttribute("appVersion", appVersion);
    return "console";
  }
}
