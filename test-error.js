const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  
  console.log('Navigating to http://localhost:3002/boutique ...');
  await page.goto('http://localhost:3002/boutique');
  await page.waitForTimeout(5000);
  
  await browser.close();
})();
