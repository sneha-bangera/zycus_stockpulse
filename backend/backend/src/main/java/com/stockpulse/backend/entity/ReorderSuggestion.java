package com.stockpulse.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import static com.stockpulse.backend.entity.Enums.*;

@Entity
@Table(name = "reorder_suggestions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReorderSuggestion {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "current_stock", nullable = false)
    private int currentStock;

    @Column(name = "recommended_quantity", nullable = false)
    private int recommendedQuantity;

    @Column(name = "suggested_lead_time_days", nullable = false)
    private int suggestedLeadTimeDays;

    @Column(nullable = false)
    private double confidence;

    @Column(nullable = false, length = 1200)
    private String reasoning;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 15)
    private SuggestionStatus status;

    @Enumerated(EnumType.STRING) @Column(name = "trigger_reason", nullable = false, length = 20)
    private TriggerReason triggerReason;
}
