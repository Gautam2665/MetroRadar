const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function main() {
  const auditDir = path.join(__dirname, '../apps/frontend/public/audit');
  if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  console.log('Capturing Home Dashboard...');
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(auditDir, '01-home-inspector.png') });

  console.log('Capturing Plan Journey Dynamic Container...');
  await page.goto('http://localhost:3000/plan');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(auditDir, '02-plan-journey-dynamic.png') });

  console.log('Capturing Analytics...');
  await page.goto('http://localhost:3000/analytics');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(auditDir, '03-analytics.png') });

  console.log('Capturing Passes & Alerts...');
  await page.goto('http://localhost:3000/alerts');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(auditDir, '04-passes-alerts.png') });

  await browser.close();
  console.log('Audit screenshots saved successfully in apps/frontend/public/audit/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
