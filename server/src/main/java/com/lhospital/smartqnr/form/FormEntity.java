package com.lhospital.smartqnr.form;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * 문진(양식) 1건. 전체 FormSchema JSON 은 schemaJson(jsonb) 에 통째로 저장하고,
 * 목록/검색에 필요한 값(title/status/version)만 별도 컬럼으로 둔다.
 */
@Entity
@Table(name = "forms")
public class FormEntity {

  @Id
  @Column(length = 64)
  private String id;

  @Column(nullable = false)
  private String title;

  @Column(nullable = false, length = 20)
  private String status;

  @Column(nullable = false)
  private int version;

  /** 프론트 FormSchema 전체(JSON). PostgreSQL jsonb 컬럼. */
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "schema_json", nullable = false, columnDefinition = "jsonb")
  private String schemaJson;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public int getVersion() {
    return version;
  }

  public void setVersion(int version) {
    this.version = version;
  }

  public String getSchemaJson() {
    return schemaJson;
  }

  public void setSchemaJson(String schemaJson) {
    this.schemaJson = schemaJson;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(Instant updatedAt) {
    this.updatedAt = updatedAt;
  }
}
