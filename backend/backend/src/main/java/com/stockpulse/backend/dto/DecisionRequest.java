// package com.stockpulse.backend.dto;

// public class DecisionRequest {
    
// }

package com.stockpulse.backend.dto;
import jakarta.validation.constraints.NotNull;
public record DecisionRequest(@NotNull Decision decision) {
    public enum Decision { ACCEPTED, REJECTED }
}

