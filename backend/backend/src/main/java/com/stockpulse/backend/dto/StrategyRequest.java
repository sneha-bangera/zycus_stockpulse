// package com.stockpulse.backend.dto;

// public class StrategyRequest {
    
// }
package com.stockpulse.backend.dto;
import jakarta.validation.constraints.NotBlank;
public record StrategyRequest(@NotBlank String strategy) {}
