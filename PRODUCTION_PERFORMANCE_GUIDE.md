# ⚙️ PRODUCTION_PERFORMANCE_GUIDE.md
(API · Load · Stability · Next.js)

## 1. Purpose
This document defines strict rules for making the application **production-ready**, focusing on:
- API robustness
- Fast loading performance
- Smooth runtime behavior
- Stability under load

This file is the **single source of truth** for performance and API-related changes.

---

## 2. Project Context
- Framework: Next.js
- API Type: REST / Internal APIs (specify if needed)
- Styling: Custom CSS / CSS Modules
- Environment: Production-grade web application

---

## 3. Hard Constraints (Non-Negotiable)
- ❌ Do NOT change UI design or layout
- ❌ Do NOT change business logic or features
- ❌ Do NOT introduce unnecessary libraries
- ❌ Do NOT add premature optimizations
- ❌ Do NOT degrade developer readability

✅ Optimize **data flow, performance, and reliability only**.

---

## 4. Core Philosophy
Follow **Production-First Engineering** principles:

- Fast initial load
- Predictable API behavior
- Graceful failure handling
- Minimal runtime overhead
- Scalable under increased traffic

---

## 5. Performance Targets (Baseline)

| Metric | Target |
|-----|------|
| First Contentful Paint (FCP) | < 1.8s |
| Largest Contentful Paint (LCP) | < 2.5s |
| Time to Interactive (TTI) | < 3.5s |
| API Response Time (p95) | < 300ms |
| Error Rate | < 0.1% |

---

## 6. API Design & Robustness Rules

### Request Handling
- APIs must be **idempotent** where applicable
- Validate all incoming data
- Never trust client input
- Enforce request timeouts

---

### Error Handling
- Never expose internal stack traces
- Use consistent error formats
- Handle partial failures gracefully

Example response:
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Requested data not found"
  }
}
Retries & Failures
Client retries must use exponential backoff

Avoid retry storms

Fail fast on unrecoverable errors

7. API Performance Optimization
Minimize payload sizes

Avoid over-fetching

Use pagination for large datasets

Prefer server-side aggregation

8. Caching Strategy
Server-Side
Cache API responses where safe

Use short TTLs for volatile data

Invalidate cache on mutation

Client-Side
Cache GET requests

Avoid refetching unchanged data

Use stale-while-revalidate strategy

9. Data Fetching Rules (Next.js)
Prefer Server Components / SSR for critical data

Avoid blocking rendering with non-critical requests

Parallelize independent API calls

Lazy-load non-critical data

10. Load Performance Optimization
JavaScript
Avoid large client bundles

Dynamically import heavy modules

Remove unused code paths

Images & Assets
Optimize image sizes

Lazy-load below-the-fold media

Avoid uncompressed assets

11. Runtime Smoothness
Avoid expensive re-renders

Memoize heavy computations

Keep component trees shallow

Avoid unnecessary state updates

12. Concurrency & Load Handling
APIs must handle concurrent requests safely

Avoid shared mutable state

Protect critical sections

13. Graceful Degradation
App must remain usable on partial API failure

Show fallback UI states

Never block entire UI on one failing request

14. Monitoring & Logging
Log errors with context

Avoid noisy logs

Capture slow API calls

Track failed requests

15. Security Basics (Production Minimum)
Validate inputs

Sanitize outputs

Protect against rate abuse

Do not expose secrets to client

16. Testing & Validation
Required Testing
API stress testing

Network throttling tests

Slow device simulation

Error injection testing

17. Safety Rules
❌ No infinite loops

❌ No unbounded retries

❌ No blocking synchronous work

❌ No memory leaks

18. Non-Goals
No feature additions

No UI redesign

No analytics redesign

No backend architecture rewrite

19. Completion Criteria
Production readiness is achieved when:

Performance targets are met

APIs are stable under load

App feels fast and responsive

Errors are handled gracefully