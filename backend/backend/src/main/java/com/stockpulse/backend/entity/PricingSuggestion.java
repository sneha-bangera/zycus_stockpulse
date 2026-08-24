package com.stockpulse.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import static com.stockpulse.backend.entity.Enums.*;

@Entity
@Table(name = "pricing_suggestions")
@Getter 
@Setter 
@NoArgsConstructor 
@AllArgsConstructor 
@Builder

public class PricingSuggestion {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "current_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal currentPrice;

    @Column(name = "recommended_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal recommendedPrice;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 15)
    private ChangeDirection direction;

    @Column(nullable = false)
    private double confidence;

    @Column(nullable = false, length = 1200)
    private String reasoning;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 15)
    private SuggestionStatus status;

    @Enumerated(EnumType.STRING) @Column(name = "trigger_reason", nullable = false, length = 20)
    private TriggerReason triggerReason;
}
