package com.stockpulse.backend.strategy;

import com.stockpulse.backend.entity.Enums.*;
import com.stockpulse.backend.entity.Product;
import org.springframework.stereotype.Component;
import java.math.*;

@Component
public class RuleBasedAdvisorStrategy implements CommerceAdvisorStrategy {
    @Override public String name() { return "RULE_BASED"; }

    @Override
    public CommerceRecommendation recommend(Product p, double avg, TriggerReason trigger) {
        boolean low = p.getStockLevel() < p.getReorderThreshold();
        boolean spike = avg > 0 && p.getDemandVelocity() > 2.0 * avg;
        double pct = low ? 0.10 : (spike ? 0.05 : 0.0);
        BigDecimal price = p.getCurrentPrice().multiply(BigDecimal.valueOf(1 + pct)).setScale(2, RoundingMode.HALF_UP);
        String direction = pct == 0 ? "HOLD" : "INCREASE";
        String reason = low
            ? "Stock is below the reorder threshold, so a 10% increase protects remaining inventory while replenishment is considered."
            : spike
            ? "Demand velocity is more than 2x the category average, so a modest 5% increase captures demand without overreacting."
            : "No strong inventory or demand signal is present, so the baseline strategy recommends holding price.";
        int qty = Math.max(1, (p.getReorderThreshold() * 3) - p.getStockLevel());
        return new CommerceRecommendation(price, direction, 0.78, reason, qty, 7, 0.76,
            "Baseline replenishment targets three reorder-threshold cycles and adjusts for current stock.");
    }
}
