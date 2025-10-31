import { test as base } from '@playwright/test';
import { log } from '../../utils/logger.js';

const test = base.extend({
  authPage: async ({ page }, use) => {
    log('Navigating to login page...');
    await page.goto('https://www.ozstickerprintiing.com/');

    // Click login icon
    await page.click('//ul/li[2]//a[contains(@class,"icon_myaccount")]');
    await page.click('//ul/li[2]//button[contains(text(),"Sign in to Account")]');

    // Fill login form
    await page.fill('//input[@type="email"]', 'trainee81.glophics@gmail.com');
    await page.fill('//input[@type="password"]', '123456');

    await page.keyboard.press('Enter');
    log('Login submitted.');

    await page.waitForTimeout(3000);
    log('Login successful (assuming no error message).');

    await use(page);
  },
});

export default test;
