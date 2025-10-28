import { expect } from '@playwright/test';
import { sgConfig } from '../config/sgConfig.js';

export async function login(page, env = process.env.ENV || 'live') {
  const targetEnv = sgConfig.environment[env];
  const { credentials, xpaths } = sgConfig;
  const baseUrl = targetEnv.baseUrl;

  console.log(`🧭 Running login on environment: ${env}`);
  console.log(`🌐 Base URL: ${baseUrl}`);

  // Step 1: Go to site
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

  // Step 2: Open login modal
  await page.locator(`xpath=${xpaths.loginIcon}`).click();
  await page.waitForSelector(`xpath=${xpaths.dropdownMenu}`);
  await page.locator(`xpath=${xpaths.signInButton}`).click();
  console.log('✅ Opened login modal.');

  // Step 3: Fill credentials
  await page.waitForSelector(`xpath=${xpaths.loginModal}`);
  await page.locator(`xpath=${xpaths.emailField}`).fill(credentials.email);
  await page.locator(`xpath=${xpaths.passwordField}`).fill(credentials.password);
  console.log('✅ Entered credentials.');

  // Step 4: Submit login
  await page.locator(`xpath=${xpaths.signInSubmit}`).click();
  console.log('✅ Submitted login form.');

  // Step 5: Detect success or error
  await page.waitForTimeout(2000);

  const errorLocator = page.locator(`xpath=${xpaths.errorMessage}`);
  const modalLocator = page.locator(`xpath=${xpaths.loginModal}`);

  try {
    await Promise.race([
      modalLocator.waitFor({ state: 'hidden', timeout: 1000 }),
      errorLocator.waitFor({ state: 'visible', timeout: 1000 })
    ]);
  } catch {
    console.log('⏱ Timeout — neither modal closed nor error appeared.');
  }

  const modalStillVisible = await modalLocator.isVisible().catch(() => false);
  const errorVisible = await errorLocator.isVisible().catch(() => false);

  if (errorVisible) {
    const errorText = (await errorLocator.textContent())?.trim() || 'Unknown error';
    console.log(`❌ Login failed — error: "${errorText}"`);
    await page.screenshot({ path: `test-results/login-error-${env}.png`, fullPage: true });
    expect(errorText).toBe(''); // Fail intentionally
    return false;
  } else if (!modalStillVisible) {
    console.log('✅ Login successful — modal closed.');
    await page.screenshot({ path: `test-results/login-success-${env}.png`, fullPage: true });
    return true;
  } else {
    console.log('⚠️ Uncertain login state.');
    await page.screenshot({ path: `test-results/login-uncertain-${env}.png`, fullPage: true });
    return false;
  }
}
