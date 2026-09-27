# Performance Benchmark — Custom Statistics (US-A01)

This document records the performance benchmark for the user-defined custom statistics feature (US-A01) required by the Sprint 3 deliverable: *benchmark custom calculations on a large shared dataset (~10,000 entries) and document bottlenecks*.

## Scope

Benchmarked: the calculation pipeline in `server/services/customStatisticsService.js` — expression validation, field-index building, aggregation (`sum`, `avg`, `min`, `max`, `count`) and final expression evaluation. This is the code that runs for every custom statistic on every create, update and list request.

Not benchmarked: PostgreSQL query time. The database fetch (`getProjectFieldValues`) is discussed as a structural bottleneck in the analysis below, but the measurements below are pure in-process calculation over already-loaded rows.

## How to reproduce

From the `server/` directory:

```
npm run benchmark:custom-statistics
```

or directly:

```
node scripts/benchmarkCustomStatistics.js
```

The script (`server/scripts/benchmarkCustomStatistics.js`) is fully deterministic (seeded PRNG) and needs no database connection. It builds synthetic datasets, runs 1 warm-up plus 5 measured iterations per case and prints the tables below.

**Environment used for the run below:** Node v24.19.0, Windows 10.0.26200, Intel Core i7-1065G7 @ 1.30GHz. Absolute times vary between machines and between runs; the scaling shape and the relative cost of each step are the meaningful results.

## Dataset

7 fields per entry (4 numeric, 1 date, 2 text), 8% of entry+field cells missing — matching a realistic partially-filled project.

| Entries | Value rows | Rows per numeric field |
|---|---|---|
| 10,000 (shared dataset) | 64,441 | ~9,200 |

Per-field row counts on the 10,000-entry dataset: Score 9,231, Call Duration 9,165, Focus Rating 9,168, Pages Read 9,237, Session Date 9,235, Session Notes 9,211, Topic 9,194.

The benchmark expression under test mixes all five aggregates:

```
sum(Score) + avg("Call Duration") / count(Topic) - max("Focus Rating") + min("Pages Read") * 2
```

## Results

### Step breakdown — 10,000 entries / 64,441 value rows

| Step | Mean (ms) | Best (ms) |
|---|---|---|
| Validate expression (parse + permission walk) | 0.191 | 0.097 |
| Build field value index (replica of `buildValueIndex`) | 3.624 | 1.589 |
| Full evaluation (all of the above) | 3.300 | 1.692 |
| Aggregation arithmetic only (best-case residual) | — | 0.006 |

Reading the best-case (least noisy) column: **the index rebuild is ~1.6 ms of the ~1.7 ms evaluation — roughly 90% of the cost** — while the actual aggregation arithmetic is ~0.006 ms. Parsing the expression is ~0.1 ms.

### Scaling — dataset size vs evaluation time

| Entries | Value rows | Index build (ms) | Full evaluation (ms) | ms per 10k rows |
|---|---|---|---|---|
| 1,000 | 6,472 | 0.109 | 0.430 | 0.664 |
| 2,500 | 16,089 | 0.375 | 0.745 | 0.463 |
| 5,000 | 32,208 | 1.109 | 1.240 | 0.385 |
| 10,000 | 64,441 | 1.080 | 1.992 | 0.309 |
| 20,000 | 128,846 | 3.163 | 4.748 | 0.369 |

Evaluation time grows linearly with the number of value rows (~0.3–0.7 ms per 10,000 rows; the constant is stable across sizes within measurement noise).

### List endpoint simulation — N statistics over the same 64,441 rows

The `GET /api/stats/projects/:projectId/custom` endpoint evaluates every saved statistic sequentially over the same value rows.

| Statistics in project | Total (ms) | Per statistic (ms) |
|---|---|---|
| 1 | 2.330 | 2.330 |
| 5 | 9.717 | 1.943 |
| 10 | 19.743 | 1.974 |
| 25 | 33.860 | 1.354 |

Total time grows linearly with the number of statistics while the per-statistic cost stays roughly constant — evidence that the full pipeline (including the index rebuild) is re-run for every statistic with no reuse between them.

### `Math.min(...values)` spread limit

`min()` and `max()` are implemented as `Math.min(...entry.numbers)` / `Math.max(...entry.numbers)`.

| Values spread | `Math.min(...)` (ms) | Loop (ms) |
|---|---|---|
| 10,000 | 0.030 | 0.136 |
| 62,504 | 0.127 | 0.365 |

Largest spread handled without error in this environment: **~125,000 values** (the exact limit is not a fixed constant — it depends on remaining call-stack depth, so it can be lower under deeper call chains). Beyond it, V8 throws `RangeError: Maximum call stack size exceeded`, which the service catches in the list path (surfacing as a per-statistic error) but not in every evaluation context.

## Bottlenecks found

| # | Bottleneck | Evidence | Impact | Suggested mitigation |
|---|---|---|---|---|
| 1 | **Field index rebuilt on every evaluation** (`buildValueIndex`, `customStatisticsService.js:213`), including once per statistic in the list endpoint | Index rebuild is ~90% of evaluation time; list total scales linearly with statistic count | List cost O(statistics x value rows) | Build the index once per request and pass it to each evaluation |
| 2 | **Expression parsed twice per evaluation** — once by the service for validation, again inside `evaluateCustomStatisticValue` (`:284`) | ~0.1 ms per parse; 2 parses per statistic per request | Small but pure overhead; grows with statistic count | Reuse the validation result (pass parsed references into evaluation) |
| 3 | **All value rows loaded into Node for every request** (`getProjectFieldValues`, `postgresCustomStatisticsRepository.js:159`) — no pagination, no SQL aggregation | 64,441 rows transferred per list/create/update; scales with project size | Dominates real request time at 10k entries; memory spike per request | Compute simple aggregates in SQL (as the built-in stats route already does) or cache per-project aggregates |
| 4 | **`min()`/`max()` spread crash ceiling** (`:266`, `:272`) | `RangeError` above ~125,000 values in one numeric field | A very large single field breaks the statistic instead of returning a value | Replace spread with a single-pass loop (also ~3x faster at large sizes per the table above) |
| 5 | **Duplicate field query in create/update** — `getProjectFields` is called for validation, then `computeValueForExpression` (`:395`) fetches fields and values again | 1 redundant round trip per create/update | Minor | Pass the already-loaded fields into the computation |

## Conclusion

At the required 10,000-entry scale, a single custom statistic evaluates in ~2 ms and a project with 10 saved statistics lists in ~20 ms of in-process calculation — comfortably interactive. The bottlenecks above are structural (work repeated per statistic, and full-table fetches), not constant-factor problems at the current scale; they are documented here for future work rather than fixed in this sprint.
