// package com.stockpulse.backend.controller;

// public class SuggestionController {
    
// }

package com.stockpulse.backend.controller;
import com.stockpulse.backend.dto.DecisionRequest;
import com.stockpulse.backend.entity.*;
import com.stockpulse.backend.entity.Enums.SuggestionStatus;
import com.stockpulse.backend.service.SuggestionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api") @CrossOrigin(origins="*")
public class SuggestionController {
    private final SuggestionService service;
    public SuggestionController(SuggestionService service){this.service=service;}
    @GetMapping("/pricing-suggestions") public List<PricingSuggestion> pricing(){return service.pendingPricing();}
    @GetMapping("/reorder-suggestions") public List<ReorderSuggestion> reorder(){return service.pendingReorder();}
    @PatchMapping("/pricing-suggestions/{id}") public PricingSuggestion pricingDecision(@PathVariable Long id,@Valid @RequestBody DecisionRequest r){return service.decidePricing(id,SuggestionStatus.valueOf(r.decision().name()));}
    @PatchMapping("/reorder-suggestions/{id}") public ReorderSuggestion reorderDecision(@PathVariable Long id,@Valid @RequestBody DecisionRequest r){return service.decideReorder(id,SuggestionStatus.valueOf(r.decision().name()));}
}

