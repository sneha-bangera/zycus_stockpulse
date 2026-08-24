package com.stockpulse.backend.repository;

import com.stockpulse.backend.entity.Product;
import com.stockpulse.backend.entity.Enums.Category;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface ProductRepository extends JpaRepository<Product, String> {
    List<Product> findAllByOrderByNameAsc();
    List<Product> findByCategoryOrderByNameAsc(Category category);
    @Query("select coalesce(avg(p.demandVelocity), 0) from Product p where p.category = :category")
    double averageVelocity(@Param("category") Category category);
}
