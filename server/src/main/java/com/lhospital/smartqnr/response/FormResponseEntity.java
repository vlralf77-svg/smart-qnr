package com.lhospital.smartqnr.response;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** 환자가 제출한 문진 응답 1건. answers(문항 id→값)는 jsonb 로 저장. */
@Entity
@Table(name = "form_responses")
public class FormResponseEntity {

  @Id
  @Column(name = "response_id", length = 64)
  private String responseId;

  @Column(name = "form_id", nullable = false, length = 64)
  private String formId;

  @Column(name = "form_version", nullable = false)
  private int formVersion;

  @Column(name = "patient_id")
  private String patientId;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "answers_json", nullable = false, columnDefinition = "jsonb")
  private String answersJson;

  @Column(name = "submitted_at", nullable = false)
  private Instant submittedAt;

  public String getResponseId() {
    return responseId;
  }

  public void setResponseId(String responseId) {
    this.responseId = responseId;
  }

  public String getFormId() {
    return formId;
  }

  public void setFormId(String formId) {
    this.formId = formId;
  }

  public int getFormVersion() {
    return formVersion;
  }

  public void setFormVersion(int formVersion) {
    this.formVersion = formVersion;
  }

  public String getPatientId() {
    return patientId;
  }

  public void setPatientId(String patientId) {
    this.patientId = patientId;
  }

  public String getAnswersJson() {
    return answersJson;
  }

  public void setAnswersJson(String answersJson) {
    this.answersJson = answersJson;
  }

  public Instant getSubmittedAt() {
    return submittedAt;
  }

  public void setSubmittedAt(Instant submittedAt) {
    this.submittedAt = submittedAt;
  }
}
