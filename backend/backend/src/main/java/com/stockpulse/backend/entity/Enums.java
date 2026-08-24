// package com.stockpulse.backend.entity;

// public class Enums {
    
// }
package com.stockpulse.backend.entity;

public final class Enums {
    private Enums() {}

    public enum Category { ELECTRONICS, APPAREL, HOME }
    public enum ProductStatus { ACTIVE, PRICE_REVIEW_PENDING, OUT_OF_STOCK }
    public enum SuggestionStatus { PENDING, ACCEPTED, REJECTED }
    public enum ChangeDirection { INCREASE, DECREASE, HOLD }
    public enum TriggerReason { INITIAL, INVENTORY_LOW, DEMAND_SPIKE, MANUAL }
}
