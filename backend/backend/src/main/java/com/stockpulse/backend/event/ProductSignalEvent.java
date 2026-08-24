package com.stockpulse.backend.event;
import com.stockpulse.backend.entity.Enums.TriggerReason;
public record ProductSignalEvent(String productId, TriggerReason triggerReason) {}
