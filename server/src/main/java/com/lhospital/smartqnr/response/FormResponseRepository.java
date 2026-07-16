package com.lhospital.smartqnr.response;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FormResponseRepository extends JpaRepository<FormResponseEntity, String> {
  List<FormResponseEntity> findByFormIdOrderBySubmittedAtDesc(String formId);
}
