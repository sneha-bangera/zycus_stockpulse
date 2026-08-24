package com.stockpulse.backend.strategy;

import com.stockpulse.backend.entity.Enums.TriggerReason;
import com.stockpulse.backend.entity.Product;
import java.math.BigDecimal;

public interface CommerceAdvisorStrategy {
    String name();
    CommerceRecommendation recommend(Product product, double categoryAverageVelocity, TriggerReason triggerReason);

    record CommerceRecommendation(
        BigDecimal recommendedPrice,
        String direction,
        double pricingConfidence,
        String pricingReasoning,
        int recommendedQuantity,
        int leadTimeDays,
        double reorderConfidence,
        String reorderReasoning) {}
}
