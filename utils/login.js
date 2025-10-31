import { expect } from '@playwright/test';
import { sgConfig } from '../ozstickerprinting/config/sgConfig.js';
import { ospConfig } from '../ozstickerprinting/config/ospConfig.js';

/**
 * Automatically logs in based on the test path (e.g., singaprinting/test or ozstickerprinting/test)
 */
export async function login(page, env = process.env.ENV || 'live') {
  // 🕵️ Detect account name from current test path
  const stack = new Error().stack || '';
  const isSg = stack.includes('singaprinting');
  const isOsp = stack.includes('ozstickerprinting');

  // 🧩 Choose config based on detection
  const config = isOsp ? ospConfig : sgConfig;
  const accountName = isOsp ? 'ozstickerprinting' : 'singaprinting';

  const targetEnv = config.environment[env];
  const { credentials, xpaths } = config;
  const baseUrl = targetEnv.baseUrl;

  console.log(`🧭 Running login for: ${accountName}`);
  console.log(`🌐 Environment: ${env}`);
  console.log(`🔗 Base URL: ${baseUrl}`);

  try {
    // Step 1: Go to homepage
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

    // Step 4: Submit form
    await page.locator(`xpath=${xpaths.signInSubmit}`).click();
    console.log('✅ Submitted login form.');

    // Step 5: Detect success or failure
    await page.waitForTimeout(2000);

    const errorLocator = page.locator(`xpath=${xpaths.errorMessage}`);
    const modalLocator = page.locator(`xpath=${xpaths.loginModal}`);

    try {
      await Promise.race([
        modalLocator.waitFor({ state: 'hidden', timeout: 2000 }),
        errorLocator.waitFor({ state: 'visible', timeout: 2000 })
      ]);
    } catch {
      console.log('⏱ Timeout — neither modal closed nor error appeared.');
    }

    const modalStillVisible = await modalLocator.isVisible().catch(() => false);
    const errorVisible = await errorLocator.isVisible().catch(() => false);

    if (errorVisible) {
      const errorText = (await errorLocator.textContent())?.trim() || 'Unknown error';
      console.log(`❌ Login failed — error: "${errorText}"`);
      await page.screenshot({ path: `test-results/login-error-${accountName}-${env}.png`, fullPage: true });
      expect(errorText).toBe(''); // Intentionally fail
      return false;
    } else if (!modalStillVisible) {
      console.log(`✅ Login successful — modal closed (${accountName}).`);
      await page.screenshot({ path: `test-results/login-success-${accountName}-${env}.png`, fullPage: true });
      return true;
    } else {
      console.log('⚠️ Uncertain login state.');
      await page.screenshot({ path: `test-results/login-uncertain-${accountName}-${env}.png`, fullPage: true });
      return false;
    }
  } catch (err) {
    console.error(`💥 Login process failed: ${err.message}`);
    await page.screenshot({ path: `test-results/login-exception-${accountName}-${env}.png`, fullPage: true });
    return false;
  }
}
