package com.stockpulse.backend.service;

import com.stockpulse.backend.entity.*;
import com.stockpulse.backend.entity.Enums.*;
import com.stockpulse.backend.event.ProductSignalEvent;
import com.stockpulse.backend.repository.*;
import com.stockpulse.backend.strategy.CommerceAdvisorStrategy.CommerceRecommendation;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.*;

@Service
public class SuggestionService {
    private final ProductRepository products; private final PricingSuggestionRepository pricing; private final ReorderSuggestionRepository reorder;
    private final StrategyRuntimeService strategies; private final ApplicationEventPublisher events;
    public SuggestionService(ProductRepository products, PricingSuggestionRepository pricing, ReorderSuggestionRepository reorder,
            StrategyRuntimeService strategies, ApplicationEventPublisher events) { this.products=products; this.pricing=pricing; this.reorder=reorder; this.strategies=strategies; this.events=events; }

    @Transactional(readOnly = true)
    public Product product(String id) { return products.findById(id).orElseThrow(() -> new NoSuchElementException("Product not found: " + id)); }

    @Transactional
    public Product updateStock(String id, int stock) {
        Product p=product(id); int old=p.getStockLevel(); p.setStockLevelAndStatus(stock); Product saved=products.save(p); publishSignals(saved, old); return saved;
    }
    @Transactional
    public Product order(String id) {
        Product p=product(id); int old=p.getStockLevel(); p.setDemandVelocity(p.getDemandVelocity()+1); p.setStockLevelAndStatus(Math.max(0, p.getStockLevel()-1)); Product saved=products.save(p); publishSignals(saved, old); return saved;
    }
    private void publishSignals(Product p, int oldStock) {
        if (p.getStockLevel() < p.getReorderThreshold()) events.publishEvent(new ProductSignalEvent(p.getId(), TriggerReason.INVENTORY_LOW));
        double avg=products.averageVelocity(p.getCategory());
        if (avg > 0 && p.getDemandVelocity() > 3.0*avg) events.publishEvent(new ProductSignalEvent(p.getId(), TriggerReason.DEMAND_SPIKE));
    }

    @Transactional
    public void generate(String id, TriggerReason trigger) {
        Product p=product(id); double avg=products.averageVelocity(p.getCategory()); CommerceRecommendation r=strategies.current().recommend(p,avg,trigger);
        if (!pricing.existsByProduct_IdAndTriggerReasonAndStatus(id, trigger, SuggestionStatus.PENDING)) {
            pricing.save(PricingSuggestion.builder().product(p).currentPrice(p.getCurrentPrice()).recommendedPrice(r.recommendedPrice())
                .direction(ChangeDirection.valueOf(r.direction())).confidence(r.pricingConfidence()).reasoning(r.pricingReasoning()).status(SuggestionStatus.PENDING).triggerReason(trigger).build());
        }
        if (!reorder.existsByProduct_IdAndTriggerReasonAndStatus(id, trigger, SuggestionStatus.PENDING)) {
            reorder.save(ReorderSuggestion.builder().product(p).currentStock(p.getStockLevel()).recommendedQuantity(r.recommendedQuantity())
                .suggestedLeadTimeDays(r.leadTimeDays()).confidence(r.reorderConfidence()).reasoning(r.reorderReasoning()).status(SuggestionStatus.PENDING).triggerReason(trigger).build());
        }
        if (p.getStatus()!=ProductStatus.OUT_OF_STOCK) { p.setStatus(ProductStatus.PRICE_REVIEW_PENDING); products.save(p); }
    }

    @Transactional
    public PricingSuggestion decidePricing(Long id, SuggestionStatus status) {
        PricingSuggestion s=pricing.findById(id).orElseThrow();
        if (s.getStatus()!=SuggestionStatus.PENDING) return s;
        s.setStatus(status);
        if (status==SuggestionStatus.ACCEPTED) { Product p=product(s.getProduct().getId()); p.setCurrentPrice(s.getRecommendedPrice()); if(p.getStockLevel()>=p.getReorderThreshold()) p.setStatus(ProductStatus.ACTIVE); products.saveAndFlush(p); }
        return pricing.save(s);
    }
    @Transactional
    public ReorderSuggestion decideReorder(Long id, SuggestionStatus status) {
        ReorderSuggestion s=reorder.findById(id).orElseThrow();
        if (s.getStatus()!=SuggestionStatus.PENDING) return s;
        s.setStatus(status);
        if (status==SuggestionStatus.ACCEPTED) { Product p=product(s.getProduct().getId()); p.setStockLevelAndStatus(p.getStockLevel()+s.getRecommendedQuantity()); products.saveAndFlush(p); }
        return reorder.save(s);
    }
    public List<PricingSuggestion> pendingPricing(){return pricing.findByStatusOrderByIdDesc(SuggestionStatus.PENDING);}
    public List<ReorderSuggestion> pendingReorder(){return reorder.findByStatusOrderByIdDesc(SuggestionStatus.PENDING);}
}
