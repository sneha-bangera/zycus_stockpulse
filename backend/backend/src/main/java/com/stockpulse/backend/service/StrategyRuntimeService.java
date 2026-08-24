package com.stockpulse.backend.service;
import com.stockpulse.backend.strategy.*;
import org.springframework.stereotype.Service;
import java.util.concurrent.atomic.AtomicReference;

@Service
public class StrategyRuntimeService {
    private final RuleBasedAdvisorStrategy rule;
    private final AiAdvisorStrategy ai;
    private final AtomicReference<String> active = new AtomicReference<>("RULE_BASED");
    public StrategyRuntimeService(RuleBasedAdvisorStrategy rule, AiAdvisorStrategy ai, @org.springframework.beans.factory.annotation.Value("${stockpulse.strategy:RULE_BASED}") String initial) { this.rule = rule; this.ai = ai; set(initial); }
    public CommerceAdvisorStrategy current() { return "AI".equalsIgnoreCase(active.get()) ? ai : rule; }
    public String name() { return current().name(); }
    public String set(String value) {
        String v = value.trim().toUpperCase();
        if (!v.equals("AI") && !v.equals("RULE_BASED")) throw new IllegalArgumentException("strategy must be AI or RULE_BASED");
        active.set(v); return v;
    }
}
