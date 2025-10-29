import { test } from '@playwright/test';
import { login } from '../utils/login.js';
import { sgConfig } from '../config/sgConfig.js';

// Extend timeout (default 60s → 50min)
test.setTimeout(3000000);

test('Verify Button Badge Thumbnails - SingaPrinting', async ({ page }) => {
    const env = process.env.ENV || 'dev';
    const targetEnv = sgConfig.environment[env];
    const baseUrl = targetEnv.baseUrl;

    console.log(`🌐 Environment: ${env}`);
    console.log(`🔗 Base URL: ${baseUrl}`);

    // 1️⃣ LOGIN FIRST
    const loggedIn = await login(page, env);
    if (!loggedIn) throw new Error('❌ Login failed — cannot proceed.');

    // 2️⃣ NAVIGATE TO BUTTON BADGES PRODUCT PAGE
    const productUrl = `${baseUrl}badges/button-badge?featured=1`;
    await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
    console.log(`✅ Navigated to Button Badges: ${productUrl}`);

    // 3️⃣ VERIFY THUMBNAILS FOR CIRCLE SHAPE

})
