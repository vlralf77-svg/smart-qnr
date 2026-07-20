package com.lhospital.smartqnr.form;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FormRepository extends JpaRepository<FormEntity, String> {
  List<FormEntity> findAllByOrderByUpdatedAtDesc();

  List<FormEntity> findByStatusOrderByUpdatedAtDesc(String status);

  List<FormEntity> findByTestFlagTrueOrderByUpdatedAtDesc();
}
