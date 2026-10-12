const { chromium } = require('playwright');
const fs = require('fs');

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const RESULTS = [];
let failed = 0;

function check(name, cond, extra) {
  RESULTS.push({ name, pass: !!cond, extra: extra || '' });
  if (!cond) failed++;
}

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('console.error: ' + msg.text());
  });

  // --- Exercise library ---
  await page.goto(BASE + '/#/workout', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 1. Create Bench Press
  await page.click('button:has-text("Exercises")', { timeout: 10000 });
  await page.waitForTimeout(1500);
  check('1. Exercise library shows', await page.textContent('main')?.includes('EXERCISE LIBRARY'));

  // 2. Create Push Day template
  await page.click('button:has-text("Templates")', { timeout: 10000 });
  await page.waitForTimeout(1500);

  // --- Workout home ---
  await page.click('button:has-text("Active workout")', { timeout: 10000 });
  await page.waitForTimeout(1500);
  check('Active workout loads', (await page.textContent('h1'))?.includes('Active workout'));

  await browser.close();
  console.log(JSON.stringify(RESULTS));
  console.log('FAILED: ' + failed);
  console.log('ERRORS: ' + errors.length);
  for (const e of errors.slice(0, 20)) console.log('  ERR ' + e);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('MAIN ERROR', e);
  process.exit(2);
});
