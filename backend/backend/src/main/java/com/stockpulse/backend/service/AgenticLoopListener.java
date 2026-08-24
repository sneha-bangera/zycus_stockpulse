package com.stockpulse.backend.service;
import com.stockpulse.backend.event.ProductSignalEvent;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.context.event.EventListener;

@Component
public class AgenticLoopListener {
    private final SuggestionService suggestions;
    public AgenticLoopListener(SuggestionService suggestions) { this.suggestions=suggestions; }
    @Async
    @EventListener
    public void onSignal(ProductSignalEvent event) {
        try { suggestions.generate(event.productId(), event.triggerReason()); }
        catch (Exception ignored) { /* AI strategy itself falls back; never fail the originating HTTP request. */ }
    }
}
