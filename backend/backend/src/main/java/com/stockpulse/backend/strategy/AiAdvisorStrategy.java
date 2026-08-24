// package com.stockpulse.backend.strategy;

// import com.fasterxml.jackson.databind.JsonNode;
// import com.fasterxml.jackson.databind.ObjectMapper;
// import com.stockpulse.backend.entity.Enums.*;
// import com.stockpulse.backend.entity.Product;
// import org.springframework.beans.factory.annotation.Value;
// import org.springframework.stereotype.Component;
// import org.springframework.web.client.RestClient;
// import java.math.*;
// import java.time.Duration;
// import java.util.Map;

// @Component
// public class AiAdvisorStrategy implements CommerceAdvisorStrategy {
//     private final RestClient http;
//     private final ObjectMapper mapper;
//     private final RuleBasedAdvisorStrategy fallback;
//     private final String url, apiKey, model, productHeader, cookie;

//     public AiAdvisorStrategy(ObjectMapper mapper, RuleBasedAdvisorStrategy fallback,
//             @Value("${llm.endpoint}") String url,
//             @Value("${llm.api-key:}") String apiKey,
//             @Value("${llm.model:qwen-cursor}") String model,
//             @Value("${llm.product-header:PC1}") String productHeader,
//             @Value("${llm.cookie:}") String cookie) {
//         this.http = RestClient.builder().build(); this.mapper = mapper; this.fallback = fallback;
//         this.url = url; this.apiKey = apiKey; this.model = model; this.productHeader = productHeader; this.cookie = cookie;
//     }
//     @Override public String name() { return "AI"; }

//     @Override
//     public CommerceRecommendation recommend(Product p, double avg, TriggerReason trigger) {
//         try {
//             String prompt = buildPrompt(p, avg, trigger);
//             String raw = http.post().uri(url).header("Authorization", "Bearer " + apiKey)
//                 .header("Content-Type", "application/json").header("product", productHeader)
//                 .header("Cookie", cookie == null ? "" : cookie)
//                 .body(Map.of("model", model, "messages", new Object[]{
//                     Map.of("role", "system", "content", "You are an AI commerce pricing and reorder advisor. Return ONLY raw JSON without markdown formatting."),
//                     Map.of("role", "user", "content", prompt)})).retrieve().body(String.class);
//             JsonNode root = mapper.readTree(raw);
//             String content = root.path("choices").path(0).path("message").path("content").asText();
//             JsonNode out = mapper.readTree(stripFences(content));
//             BigDecimal price = new BigDecimal(out.path("recommendedPrice").asText());
//             int qty = out.path("recommendedQuantity").asInt();
//             double pc = out.path("pricingConfidence").asDouble(out.path("confidence").asDouble());
//             double rc = out.path("reorderConfidence").asDouble(pc);
//             String dir = out.path("direction").asText("HOLD").toUpperCase();
//             String pr = out.path("pricingReasoning").asText(out.path("reasoning").asText("AI recommendation based on current commerce signals."));
//             String rr = out.path("reorderReasoning").asText(pr);
//             validate(p, price, qty, pc, rc, dir);
//             return new CommerceRecommendation(price, dir, clamp(pc), pr, qty, Math.max(1, out.path("leadTimeDays").asInt(7)), clamp(rc), rr);
//         } catch (Exception ex) {
//             return fallback.recommend(p, avg, trigger);
//         }
//     }

//     private String buildPrompt(Product p, double avg, TriggerReason trigger) {
//         String triggerInstruction = switch (trigger) {
//             case INVENTORY_LOW -> "Inventory is below threshold. Consider protecting scarce stock versus clearing it; explain the tradeoff.";
//             case DEMAND_SPIKE -> "Demand has spiked. Consider a modest increase that captures demand without overreacting.";
//             default -> "This is a manual or initial review. Balance inventory health and demand.";
//         };
//         return "TRIGGER: " + trigger + "\n" + triggerInstruction + "\n" +
//             "Product=" + p.getName() + ", category=" + p.getCategory() + ", currentPrice=" + p.getCurrentPrice() +
//             ", stock=" + p.getStockLevel() + ", reorderThreshold=" + p.getReorderThreshold() +
//             ", demandVelocity24h=" + p.getDemandVelocity() + ", categoryAverageVelocity=" + avg +
//             "\nReturn JSON with recommendedPrice, direction (INCREASE/DECREASE/HOLD), pricingConfidence, pricingReasoning, " +
//             "recommendedQuantity, leadTimeDays, reorderConfidence, reorderReasoning.";
//     }
//     private void validate(Product p, BigDecimal price, int qty, double pc, double rc, String dir) {
//         if (price.signum() <= 0 || price.compareTo(p.getCurrentPrice().multiply(BigDecimal.TEN)) > 0 ||
//             price.compareTo(p.getCurrentPrice().multiply(new BigDecimal("0.10"))) < 0 || qty < 1 ||
//             pc < 0 || pc > 1 || rc < 0 || rc > 1 || !(dir.equals("INCREASE") || dir.equals("DECREASE") || dir.equals("HOLD")))
//             throw new IllegalArgumentException("Invalid AI recommendation");
//     }
//     private static double clamp(double x) { return Math.max(0, Math.min(1, x)); }
//     private static String stripFences(String s) { return s.replace("```json", "").replace("```", "").trim(); }
// }

package com.stockpulse.backend.strategy;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stockpulse.backend.entity.Enums.TriggerReason;
import com.stockpulse.backend.entity.Product;

@Component
public class AiAdvisorStrategy implements CommerceAdvisorStrategy {

    private final RestClient http;
    private final ObjectMapper mapper;
    private final RuleBasedAdvisorStrategy fallback;
    private final String url, apiKey, model, productHeader, cookie;

    public AiAdvisorStrategy(
            RuleBasedAdvisorStrategy fallback,
            @Value("${llm.endpoint}") String url,
            @Value("${llm.api-key:}") String apiKey,
            @Value("${llm.model:qwen-cursor}") String model,
            @Value("${llm.product-header:PC1}") String productHeader,
            @Value("${llm.cookie:}") String cookie) {

        // Configure RestClient with 5-second timeouts so it doesn't freeze the app on LLM delay
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout((int) Duration.ofSeconds(5).toMillis());
        requestFactory.setReadTimeout((int) Duration.ofSeconds(5).toMillis());

        this.http = RestClient.builder()
                .requestFactory(requestFactory)
                .build();

        // Instantiate ObjectMapper directly to prevent Spring autowiring crashes
        this.mapper = new ObjectMapper()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

        this.fallback = fallback;
        this.url = url;
        this.apiKey = apiKey;
        this.model = model;
        this.productHeader = productHeader;
        this.cookie = cookie;
    }

    @Override
    public String name() {
        return "AI";
    }

    @Override
    public CommerceRecommendation recommend(Product p, double avg, TriggerReason trigger) {
        try {
            String prompt = buildPrompt(p, avg, trigger);

            // Construct RestClient request
            var requestSpec = http.post()
                    .uri(url)
                    .header("Content-Type", "application/json")
                    .header("product", productHeader);

            if (apiKey != null && !apiKey.isBlank()) {
                requestSpec.header("Authorization", "Bearer " + apiKey);
            }
            if (cookie != null && !cookie.isBlank()) {
                requestSpec.header("Cookie", cookie);
            }

            String raw = requestSpec.body(Map.of(
                    "model", model,
                    "messages", new Object[]{
                        Map.of("role", "system", "content", "You are an AI commerce pricing and reorder advisor. Return ONLY raw JSON without markdown formatting."),
                        Map.of("role", "user", "content", prompt)
                    }
            )).retrieve().body(String.class);

            JsonNode root = mapper.readTree(raw);
            String content = root.path("choices").path(0).path("message").path("content").asText();
            JsonNode out = mapper.readTree(stripFences(content));

            BigDecimal price = new BigDecimal(out.path("recommendedPrice").asText());
            int qty = out.path("recommendedQuantity").asInt();
            double pc = out.path("pricingConfidence").asDouble(out.path("confidence").asDouble());
            double rc = out.path("reorderConfidence").asDouble(pc);
            String dir = out.path("direction").asText("HOLD").toUpperCase();
            String pr = out.path("pricingReasoning").asText(out.path("reasoning").asText("AI recommendation based on current commerce signals."));
            String rr = out.path("reorderReasoning").asText(pr);

            validate(p, price, qty, pc, rc, dir);
            return new CommerceRecommendation(price, dir, clamp(pc), pr, qty, Math.max(1, out.path("leadTimeDays").asInt(7)), clamp(rc), rr);
        } catch (Exception ex) {
            // Log fallback trigger and return rule-based safety recommendation
            System.err.println("LLM Call failed, falling back to Rule-Based Strategy: " + ex.getMessage());
            return fallback.recommend(p, avg, trigger);
        }
    }

    private String buildPrompt(Product p, double avg, TriggerReason trigger) {
        String triggerInstruction = switch (trigger) {
            case INVENTORY_LOW -> "Inventory is below threshold. Consider protecting scarce stock versus clearing it; explain the tradeoff.";
            case DEMAND_SPIKE -> "Demand has spiked. Consider a modest increase that captures demand without overreacting.";
            default -> "This is a manual or initial review. Balance inventory health and demand.";
        };

        return "TRIGGER: " + trigger + "\n" + triggerInstruction + "\n" +
                "Product=" + p.getName() + ", category=" + p.getCategory() + ", currentPrice=" + p.getCurrentPrice() +
                ", stock=" + p.getStockLevel() + ", reorderThreshold=" + p.getReorderThreshold() +
                ", demandVelocity24h=" + p.getDemandVelocity() + ", categoryAverageVelocity=" + avg +
                "\nReturn JSON with recommendedPrice, direction (INCREASE/DECREASE/HOLD), pricingConfidence, pricingReasoning, " +
                "recommendedQuantity, leadTimeDays, reorderConfidence, reorderReasoning.";
    }

    private void validate(Product p, BigDecimal price, int qty, double pc, double rc, String dir) {
        if (price.signum() <= 0 || price.compareTo(p.getCurrentPrice().multiply(BigDecimal.TEN)) > 0 ||
                price.compareTo(p.getCurrentPrice().multiply(new BigDecimal("0.10"))) < 0 || qty < 1 ||
                pc < 0 || pc > 1 || rc < 0 || rc > 1 || !(dir.equals("INCREASE") || dir.equals("DECREASE") || dir.equals("HOLD")))
            throw new IllegalArgumentException("Invalid AI recommendation");
    }

    private static double clamp(double x) {
        return Math.max(0, Math.min(1, x));
    }

    private static String stripFences(String s) {
        return s.replace("```json", "").replace("```", "").trim();
    }
}