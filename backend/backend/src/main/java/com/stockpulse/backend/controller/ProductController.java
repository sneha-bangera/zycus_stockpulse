package com.stockpulse.backend.controller;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.stockpulse.backend.entity.Enums.Category;
import com.stockpulse.backend.entity.Enums.ProductStatus;
import com.stockpulse.backend.entity.Enums.TriggerReason;
import com.stockpulse.backend.entity.Product;
import com.stockpulse.backend.repository.ProductRepository;
import com.stockpulse.backend.service.SuggestionService;

import jakarta.validation.constraints.Min;

@RestController 
@RequestMapping("/api/products") 
@CrossOrigin(origins="*")
public class ProductController {
    private final ProductRepository products; private final SuggestionService suggestions;
    public ProductController(ProductRepository products,SuggestionService suggestions){this.products=products;this.suggestions=suggestions;}
    @GetMapping public List<Product> all(@RequestParam(required=false) ProductStatus status,@RequestParam(required=false) Category category){
        List<Product> list=products.findAllByOrderByNameAsc(); return list.stream().filter(p->status==null||p.getStatus()==status).filter(p->category==null||p.getCategory()==category).toList(); }
    @PatchMapping("/{id}/stock") public Product stock(@PathVariable String id,@jakarta.validation.Valid @RequestBody StockRequest body){return suggestions.updateStock(id,body.stock());}
    @PostMapping("/{id}/orders") public Product order(@PathVariable String id){return suggestions.order(id);}
    @PostMapping("/{id}/suggest-pricing") public ResponseEntity<Void> pricing(@PathVariable String id){suggestions.generate(id,TriggerReason.MANUAL);return ResponseEntity.accepted().build();}
    @PostMapping("/{id}/suggest-reorder") public ResponseEntity<Void> reorder(@PathVariable String id){suggestions.generate(id,TriggerReason.MANUAL);return ResponseEntity.accepted().build();}
    public record StockRequest(@Min(0) int stock) {}
}
