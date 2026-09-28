const http = require('node:http');
const express = require('express');
const db = require('../db');
const dashboardRoutes = require('../routes/dashboard');

const USER_ID = 'benchmark-user';
const WARMUP_REQUESTS = 25;
const MEASURED_REQUESTS = 250;

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

async function main() {
  const originalQuery = db.query.bind(db);
  let queryCount = 0;

  db.query = async (sql) => {
    queryCount += 1;
    if (/WITH project_stats/.test(sql)) {
      return {
        rows: [{
          projects_created: 120,
          active_projects: 84,
          projects_archived: 36,
          total_entries: 10000,
          logged_minutes: 428000,
          this_week_minutes: 920,
          average_session_minutes: 43,
        }],
      };
    }
    if (/ORDER BY e\.occurred_at DESC/.test(sql)) {
      return {
        rows: Array.from({ length: 5 }, (_, index) => ({
          entry_id: `entry-${index + 1}`,
          project_id: `project-${index + 1}`,
          entry_name: `Entry ${index + 1}`,
          duration_minutes: 30 + index,
          occurred_at: new Date(Date.now() - index * 60000).toISOString(),
          project_name: `Project ${index + 1}`,
        })),
      };
    }
    if (/SELECT dashboard_layout/.test(sql)) {
      return {
        rows: [{
          dashboard_layout: [
            { id: 'hours', statisticId: 'loggedMinutes' },
            { id: 'active', statisticId: 'activeProjects' },
            { id: 'entries', statisticId: 'totalEntries' },
            { id: 'week', statisticId: 'thisWeekMinutes' },
          ],
        }],
      };
    }
    throw new Error(`Unexpected benchmark query: ${sql.slice(0, 80)}`);
  };

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id: USER_ID };
    next();
  });
  app.use('/api/dashboard', dashboardRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/dashboard`;

  async function runOne() {
    const start = process.hrtime.bigint();
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Dashboard benchmark returned HTTP ${response.status}`);
    await response.json();
    return Number(process.hrtime.bigint() - start) / 1e6;
  }

  try {
    for (let i = 0; i < WARMUP_REQUESTS; i += 1) await runOne();

    queryCount = 0;
    const timings = [];
    for (let i = 0; i < MEASURED_REQUESTS; i += 1) timings.push(await runOne());

    timings.sort((a, b) => a - b);
    const mean = timings.reduce((sum, value) => sum + value, 0) / timings.length;

    console.log('Dashboard API benchmark (mocked database)');
    console.log(`Warm-up requests: ${WARMUP_REQUESTS}`);
    console.log(`Measured requests: ${MEASURED_REQUESTS}`);
    console.log(`Database queries per request: ${(queryCount / MEASURED_REQUESTS).toFixed(1)}`);
    console.log(`Mean: ${mean.toFixed(3)} ms`);
    console.log(`P50: ${percentile(timings, 50).toFixed(3)} ms`);
    console.log(`P95: ${percentile(timings, 95).toFixed(3)} ms`);
    console.log(`Best: ${timings[0].toFixed(3)} ms`);
    console.log(`Worst: ${timings[timings.length - 1].toFixed(3)} ms`);
    console.log('Note: database/network latency is mocked out; this measures Express routing, dashboard shaping, JSON serialization, and local HTTP overhead.');
  } finally {
    db.query = originalQuery;
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
