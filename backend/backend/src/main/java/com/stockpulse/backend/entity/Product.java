package com.stockpulse.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

import static com.stockpulse.backend.entity.Enums.*;

@Entity
@Table(name = "products")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Product {
    @Id
    @Column(length = 40)
    private String id;

    @Column(nullable = false, unique = true, length = 60)
    private String sku;

    @Column(nullable = false, length = 160)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Category category;

    @Column(name = "current_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal currentPrice;

    @Column(name = "stock_level", nullable = false)
    private int stockLevel;

    @Column(name = "reorder_threshold", nullable = false)
    private int reorderThreshold;

    @Column(name = "demand_velocity", nullable = false)
    private int demandVelocity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ProductStatus status;

    // Sprint-2 seam: margin floor / supplier integration can be added without changing strategy contracts.
    @Column(name = "cost_price", precision = 12, scale = 2)
    private BigDecimal costPrice;

    @Version
    private long version;

    public void setStockLevelAndStatus(int stock) {
        this.stockLevel = Math.max(0, stock);
        this.status = this.stockLevel == 0 ? ProductStatus.OUT_OF_STOCK :
                (this.stockLevel < this.reorderThreshold ? ProductStatus.PRICE_REVIEW_PENDING : ProductStatus.ACTIVE);
    }
}
