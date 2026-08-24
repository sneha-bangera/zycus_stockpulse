// package com.stockpulse.backend.controller;

// public class StrategyController {
    
// }
package com.stockpulse.backend.controller;
import com.stockpulse.backend.dto.StrategyRequest;
import com.stockpulse.backend.service.StrategyRuntimeService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController @RequestMapping("/api/strategy") @CrossOrigin(origins="*")
public class StrategyController {
    private final StrategyRuntimeService service;
    public StrategyController(StrategyRuntimeService service){this.service=service;}
    @GetMapping public Map<String,String> current(){return Map.of("strategy",service.name());}
    @PutMapping public Map<String,String> set(@Valid @RequestBody StrategyRequest r){return Map.of("strategy",service.set(r.strategy()));}
}



