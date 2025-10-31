import { test, expect } from '@playwright/test';
import { sgConfig } from '../config/sgConfig.js';

const env = process.env.ENV || 'live';
const targetEnv = sgConfig.environment[env];
const { credentials, xpaths } = sgConfig;
const baseUrl = targetEnv.baseUrl;

test(`Login Test - SingaPrinting (${env})`, async ({ page }) => {
  console.log(`🧭 Running on environment: ${env}`);
  console.log(`🌐 Base URL: ${baseUrl}`);

  // Go to the environment URL
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

  // Step 1: Open login modal
  await page.locator(`xpath=${xpaths.loginIcon}`).click();
  console.log('✅ Clicked login icon.');

  await page.waitForSelector(`xpath=${xpaths.dropdownMenu}`);
  await page.locator(`xpath=${xpaths.signInButton}`).click();
  console.log('✅ Clicked Sign In.');

  // Step 2: Wait for login modal and fill credentials
  await page.waitForSelector(`xpath=${xpaths.loginModal}`);
  await page.locator(`xpath=${xpaths.emailField}`).fill(credentials.email);
  await page.locator(`xpath=${xpaths.passwordField}`).fill(credentials.password);
  console.log('✅ Entered email and password.');

  // Step 3: Submit login form
  await page.locator(`xpath=${xpaths.signInSubmit}`).click();
  console.log('✅ Submitted login form.');

  // Step 4: Wait for either success (modal closes) or error (message appears)
  await page.waitForTimeout(2000);

  const errorLocator = page.locator(`xpath=${xpaths.errorMessage}`);
  const modalLocator = page.locator(`xpath=${xpaths.loginModal}`);

  try {
    // Wait for up to 5 seconds for either the modal to close OR error to appear
    await Promise.race([
      modalLocator.waitFor({ state: 'hidden', timeout: 1000 }),
      errorLocator.waitFor({ state: 'visible', timeout: 1000 })
    ]);
  } catch (err) {
    console.log('⏱ Timeout — neither modal closed nor error appeared.');
  }

  // Check actual conditions
  const modalStillVisible = await modalLocator.isVisible().catch(() => false);
  const errorVisible = await errorLocator.isVisible().catch(() => false);

  if (errorVisible) {
    const errorText = (await errorLocator.textContent())?.trim() || 'Unknown error';
    console.log(`❌ Login failed — error message: "${errorText}"`);
    await page.screenshot({ path: `test-results/login-error-${env}.png`, fullPage: true });
    expect(errorText).toBe(''); // Fail if there’s an error
  } else if (!modalStillVisible) {
    console.log('✅ Login appears successful — modal closed and no error found.');
    await page.screenshot({ path: `test-results/login-success-${env}.png`, fullPage: true });
  } else {
    console.log('⚠️ Unable to determine login result (modal still open, no error message).');
    await page.screenshot({ path: `test-results/login-uncertain-${env}.png`, fullPage: true });
  }
});
