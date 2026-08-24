package com.stockpulse.backend.repository;
import com.stockpulse.backend.entity.*;
import com.stockpulse.backend.entity.Enums.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface PricingSuggestionRepository extends JpaRepository<PricingSuggestion, Long> {
    List<PricingSuggestion> findByStatusOrderByIdDesc(SuggestionStatus status);
    boolean existsByProduct_IdAndTriggerReasonAndStatus(String productId, TriggerReason reason, SuggestionStatus status);
}
