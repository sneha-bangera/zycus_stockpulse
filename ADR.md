# StockPulse 

**Frontend:** React 18 + Vite + Tailwind  
**Backend:** Java 17 + Spring Boot + JPA + H2

> The brief defines the core loop as inventory/demand signal → recommendation → human approval. It explicitly prioritizes clean domain contracts, runtime strategy switching, AI resilience, an event-driven async loop, and a visible merchandising checkpoint.

## System Architecture

StockPulse is a single-page React application backed by a Spring Boot REST service. In local development, the frontend runs on Vite at `http://localhost:5173` and calls the backend at `http://localhost:8080/api`. The backend is the owner of commerce rules, persistence, strategy selection, event handling, and suggestion state; the frontend is a presentation and human-approval client.

```mermaid
flowchart LR
	User[Merchandising user]
	UI["React + Vite SPA<br/>Dashboard, Catalog, Suggestions, Analytics"]
	API[Spring Boot REST API\nProductController\nSuggestionController\nStrategyController]
	Service[SuggestionService\napplication orchestration]
	Runtime[StrategyRuntimeService\nRULE_BASED or AI]
	Rule[RuleBasedAdvisorStrategy]
	AI[AiAdvisorStrategy]
	LLM[LiteLLM gateway\nexternal, optional]
	Events[ProductSignalEvent]
	Listener[AgenticLoopListener\n@Async event handler]
	Repo[Spring Data JPA repositories]
	DB[(H2 in-memory database\nproducts + suggestions)]

	User --> UI
	UI -->|REST /api| API
	API --> Service
	API --> Runtime
	Service --> Runtime
	Runtime --> Rule
	Runtime --> AI
	AI -->|HTTP JSON| LLM
	Service -->|publish after stock/order change| Events
	Events --> Listener
	Listener --> Service
	Service --> Repo
	Repo --> DB
	API -->|read pending suggestions| Repo
```

### Frontend

- `frontend/src/main.jsx` mounts the React application into `#root` and imports the global stylesheet.
- `frontend/src/App.jsx` contains the application shell, tab navigation, API client, polling refresh, product catalog, suggestion review actions, and analytics visualization.
- Axios uses `VITE_API_URL` when provided and otherwise defaults to `http://localhost:8080/api`.
- The UI polls products, pending pricing suggestions, pending reorder suggestions, and the current strategy every two seconds. It does not mutate commerce state locally; sale, suggestion, and approval actions call backend endpoints.
- The four views are Dashboard, Catalog, Suggestions, and Analytics. The approval buttons are the human checkpoint: accepting a pricing suggestion changes the product price, while accepting a reorder suggestion increases stock.

### Backend

- `BackendApplication` starts the Spring Boot application.
- `ProductController` exposes product reads, simulated orders, stock updates, and manual suggestion triggers under `/api/products`.
- `SuggestionController` exposes pending suggestions and pricing/reorder approval decisions under `/api`.
- `StrategyController` exposes runtime strategy selection under `/api/strategy`.
- `SuggestionService` is the application boundary. It loads products, calculates category averages, publishes product signals, requests recommendations, persists suggestions, enforces pending-suggestion idempotency, and applies accepted decisions.
- `StrategyRuntimeService` selects either `RuleBasedAdvisorStrategy` or `AiAdvisorStrategy` for each request and event.
- `AgenticLoopListener` consumes `ProductSignalEvent` asynchronously and delegates to `SuggestionService`, so stock changes do not block on recommendation generation.
- Spring Data repositories persist `Product`, `PricingSuggestion`, and `ReorderSuggestion` entities. H2 is configured as an in-memory database and initialized from `schema.sql` and `data.sql` on startup.

### Main API Surface

| Method | Endpoint | Responsibility |
| --- | --- | --- |
| `GET` | `/api/products` | List products, optionally filtered by status or category |
| `POST` | `/api/products/{id}/orders` | Simulate a sale and publish any resulting signals |
| `PATCH` | `/api/products/{id}/stock` | Update stock and publish any resulting signals |
| `POST` | `/api/products/{id}/suggest-pricing` | Manually request a pricing suggestion |
| `POST` | `/api/products/{id}/suggest-reorder` | Manually request a reorder suggestion |
| `GET` | `/api/pricing-suggestions` | List pending pricing suggestions |
| `GET` | `/api/reorder-suggestions` | List pending reorder suggestions |
| `PATCH` | `/api/pricing-suggestions/{id}` | Accept or reject a pricing suggestion |
| `PATCH` | `/api/reorder-suggestions/{id}` | Accept or reject a reorder suggestion |
| `GET` | `/api/strategy` | Read the active strategy |
| `PUT` | `/api/strategy` | Switch between `AI` and `RULE_BASED` at runtime |

### Runtime Flows

**Read and refresh:** The frontend requests products, suggestions, and strategy state in parallel. The API reads from repositories and returns JSON entities to the React state.

**Sale or stock update:** The frontend calls the product endpoint. `SuggestionService` updates stock and demand velocity, saves the product, then publishes `INVENTORY_LOW` when stock is below the reorder threshold or `DEMAND_SPIKE` when demand exceeds three times the category average.

**Recommendation:** `AgenticLoopListener` handles the signal asynchronously. It calls the active strategy, persists both pricing and reorder suggestions, and avoids duplicate pending suggestions for the same product, trigger, and type.

**AI failure:** `AiAdvisorStrategy` validates the gateway response and recommendation values. Timeout, transport, parsing, or validation failures return the deterministic `RuleBasedAdvisorStrategy` result so the workflow still reaches the human checkpoint.

**Approval:** The frontend sends `ACCEPTED` or `REJECTED`. Rejection only changes suggestion status. Acceptance applies the price or stock change through `SuggestionService`; no suggestion changes commerce state before approval.

### Deployment and Boundaries

The MVP is a two-process local deployment: Vite serves the frontend and Spring Boot serves the API. CORS is enabled on the REST controllers for the development frontend. H2 is intentionally process-local and non-durable, and Spring's in-memory async executor is used for events. The LiteLLM gateway is an external dependency configured through backend properties; its API key and cookie should be supplied through environment variables rather than committed configuration. Durable messaging, a production database, authentication, retries, SSE, and multi-node coordination remain outside the MVP boundary.

## ADR-1 — Commerce Logic Placement & Service Boundary

### Context
Pricing and replenishment decisions are business rules, but they also need persistence, trigger handling, and HTTP entry points. Putting all of this in controllers would make the HTTP API the architecture. Putting it in `Product` would couple the entity to AI, repositories, and infrastructure. The brief also expects the same commerce contract to work from both HTTP and async callers.

### Options
1. Put pricing/reorder logic in controllers.
2. Put all logic directly on `Product`.
3. Use a dedicated `CommerceAdvisorStrategy` contract, strategy implementations for decision logic, and `SuggestionService` for persistence/side effects.

### Decision
Use option 3. `CommerceAdvisorStrategy` owns the decision contract. `RuleBasedAdvisorStrategy` and `AiAdvisorStrategy` implement it. `SuggestionService` owns the application boundary around loading a product, calculating category context, persisting suggestions, and applying human approval side effects. Controllers and the async listener both call this same service/contract rather than duplicating commerce logic.

This creates a clean seam for Sprint 2: `CompetitorAwareStrategy` can implement the same interface without rewriting controllers or the agentic loop. Product also contains a nullable `costPrice` extension point for future margin-floor work.

### Tradeoffs
This introduces more classes than a controller-centric MVP, but the extra boundaries carry high evaluation value and make the system testable. `SuggestionService` still contains orchestration logic; if the domain grows substantially, it can later be split into a dedicated application service and domain policies.

---

## ADR-2 — Unified vs Split AI Prompt Strategy

### Context
Pricing and reorder recommendations are related: both depend on the same product, inventory, demand, category average, and trigger. The brief asks for two suggestion types but explicitly asks the ADR to justify one unified call versus separate calls.

### Options
1. Make two independent LLM calls: one for price and one for reorder.
2. Make one structured LLM call that returns both recommendations.

### Decision
Use one unified AI call through `CommerceAdvisorStrategy`, returning a `CommerceRecommendation` containing pricing and reorder outputs. However, the prompt has trigger-specific sections: `INVENTORY_LOW` explicitly asks the model to reason about protecting scarce stock versus clearance, while `DEMAND_SPIKE` explicitly asks it to capitalize on increased demand without overreacting.

This keeps the LLM request fast and consistent while still giving the model genuinely different merchandising context for the two triggers.

### Tradeoffs
A unified response couples the parsing of pricing and reorder results. A malformed response causes the whole recommendation to fall back to the deterministic strategy. The benefit is lower latency, lower request cost, and consistent reasoning across the two actions. If future requirements need independently optimized prompts/models, the contract can be split behind the same top-level advisor boundary.

---

## ADR-3 — Runtime Strategy Switching

### Context
The commerce engine must be switchable without changing code or restarting the application, and both HTTP requests and async events must use the active strategy.

### Options
1. Spring profile/configuration property selected only at application startup.
2. A factory/registry selected for every call, with mutable runtime state.
3. Hard-code AI and expose a separate endpoint for AI only.

### Decision
Use a `StrategyRuntimeService` with an `AtomicReference` containing `RULE_BASED` or `AI`. The service exposes the current `CommerceAdvisorStrategy` to every caller and a REST endpoint used by the React toggle:

- `GET /api/strategy`
- `PUT /api/strategy` with `{ "strategy": "AI" }` or `{ "strategy": "RULE_BASED" }`

The implementation starts in rule mode for deterministic local development, then the UI can switch to AI at runtime.

### Tradeoffs
Runtime state is process-local, so two backend replicas could disagree. That is acceptable for this H2 single-instance hackathon deployment. A production version would put strategy state in a shared configuration store or database and potentially use feature flags.

---

## ADR-4 — LLM Resilience & Fallback to Rule-Based Strategy

### Context
The LLM is an external dependency. The brief requires resilience to timeouts, quota failures, malformed JSON, and unreasonable values. An async trigger must not silently disappear because AI failed.

### Options
1. Fail the suggestion request when the LLM fails.
2. Retry aggressively until AI succeeds.
3. Treat AI as an enhancement and immediately fall back to deterministic rules on any transport, parsing, or validation failure.

### Decision
Use option 3. `AiAdvisorStrategy` performs the LiteLLM HTTP call, extracts the chat completion content, removes optional markdown fences, parses JSON, and validates:

- price is positive;
- price remains within a sane 0.1×–10× range of the current price;
- reorder quantity is at least 1;
- confidence values are between 0 and 1;
- direction is one of `INCREASE`, `DECREASE`, `HOLD`.

Any failure returns the `RuleBasedAdvisorStrategy` result. The API and async paths therefore continue to produce a useful suggestion even when the AI gateway is unavailable.

The LiteLLM API key is read from `LLM_API_KEY` and is never committed to the repository.

### Tradeoffs
The fallback can produce less sophisticated recommendations than AI. The benefit is availability and predictable behavior. The current MVP does not add a retry queue because retries can delay the human checkpoint and are unnecessary when a deterministic baseline is available.

---

## ADR-5 — Event-Driven Agentic Loop

### Context
The defining behavior is reactive: a stock/demand change should cause the system to observe a signal, reason about an action, queue suggestions, and wait for human approval. A scheduled poller would introduce delay and duplicate work.

### Options
1. Scheduled polling of all products.
2. Synchronous recommendation generation inside the stock/order controller.
3. Publish a domain/application event and handle it asynchronously with Spring `@EventListener` + `@Async`.

### Decision
Use option 3. `ProductSignalEvent` contains the product ID and trigger reason. Stock updates and simulated orders publish `INVENTORY_LOW` when stock is below threshold and `DEMAND_SPIKE` when velocity exceeds 3× category average. `AgenticLoopListener` handles the event asynchronously and calls the same `SuggestionService` used by manual endpoints.

The listener persists both pricing and reorder suggestions. Before inserting either type it checks for an existing `PENDING` suggestion for the same product + trigger + type, providing idempotency for repeated signals.

The human checkpoint is explicit: no recommendation changes the price or inventory until the corresponding suggestion is accepted.

### Tradeoffs
In-memory Spring async execution is intentionally simple and sufficient for a single-node MVP. Events are not durable if the process crashes. A production implementation would use a durable broker/outbox (for example Kafka/RabbitMQ/SQS) and idempotency keys. That is deliberately deferred because the hackathon evaluation is centered on demonstrating the architecture and behavior end-to-end.

---

## ADR-6 — Extensibility & Deliberate Exclusions

### Context
The brief reserves competitor prices, margin floors, supplier catalogs, automatic purchase orders, storefront pricing, and SSE for later work. The MVP must show that these can be added without rewriting the core loop.

### Decision
The strategy interface is the primary extension seam. A future `CompetitorAwareStrategy` can consume competitor data and implement `CommerceAdvisorStrategy`. `Product.costPrice` is nullable so a future `marginFloor` can be introduced with minimal migration impact. Reorder suggestions already carry `suggestedLeadTimeDays`, which is a natural seam for supplier-aware recommendations.

The MVP intentionally excludes SSE, charts, product CRUD, competitor scraping, supplier APIs, automatic purchase orders, authentication, and multi-node durable events.

### Tradeoffs
The console is intentionally a functional merchandising floor rather than a polished storefront. This protects the highest-value evaluation path: order → stock signal → async suggestions → human acceptance.
