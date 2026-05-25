const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('UNCAUGHT EXCEPTION:', err.toString());
  });

  try {
    await page.goto('http://localhost:5173/userprofile', { waitUntil: 'networkidle2' });
    console.log("Successfully loaded the page.");
    await new Promise(r => setTimeout(r, 2000));
  } catch (err) {
    console.error('FAILED TO LOAD:', err);
  } finally {
    await browser.close();
  }
})();
