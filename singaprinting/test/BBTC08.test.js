import { test, expect } from '@playwright/test';
import { login } from '../utils/login.js';
import { sgConfig } from '../config/sgConfig.js';

test.setTimeout(3000000);

test('Verify Button Badge Quantity Fields - SingaPrinting', async ({ page }) => {
    const env = process.env.ENV || 'dev';
    const targetEnv = sgConfig.environment[env];
    const baseUrl = targetEnv.baseUrl;

    console.log(`🌐 Environment: ${env}`);
    console.log(`🔗 Base URL: ${baseUrl}`);

    // LOGIN
    const loggedIn = await login(page, env);
    if (!loggedIn) throw new Error('❌ Login failed — cannot proceed.');

    // NAVIGATE TO PRODUCT PAGE
    const productUrl = `${baseUrl}badges/button-badge?featured=1`;
    await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
    console.log(`✅ Navigated to Button Badges: ${productUrl}`);

    // LOCATE SHAPE SECTION
    // const shapeSection = page.locator('//h4[normalize-space(.)="Shape"]/following-sibling::div[contains(@class,"switcher_con")]');
    // await expect(shapeSection).toBeVisible({ timeout: 8000 });
    // console.log('✅ Shape section found');

    // LOCATE QUANTITY SECTION
    const quantitySection = page.locator('//h4[normalize-space(.)="Quantity"]/following-sibling::div[contains(@class,"switcher_con")]');
    await expect(quantitySection).toBeVisible({ timeout: 8000 });
    console.log('✅ Quantity section found');

    // GET BASE OPTIONS (EXCLUDING "See More")
    const baseOptions = quantitySection.locator('.select_items > ul > li:not(.see_more)');
    const baseCount = await baseOptions.count();
    console.log(`✅ Found ${baseCount} base quantity options`);

    // HANDLE "SEE MORE" BUTTON
    const seeMoreButton = quantitySection.locator('.see_more');

    // Click through all base quantities
    for (let i = 0; i < baseCount; i++) {
        const qtyItem = baseOptions.nth(i);
        const qtyText = (await qtyItem.textContent()).trim();

        await qtyItem.scrollIntoViewIfNeeded();
        await qtyItem.click();

        await expect(qtyItem).toHaveClass(/active/);
        console.log(`🧪 Clicked quantity: ${qtyText}`);
    }

    // Now handle the modal (custom quantities)
    if (await seeMoreButton.isVisible()) {
        console.log('📦 See More button found, opening modal...');
        await seeMoreButton.click();

        const modal = page.locator('.custom_quantity_modal');
        await expect(modal).toBeVisible({ timeout: 5000 });
        console.log('✅ Modal opened');

        const modalOptions = modal.locator('li');
        const modalCount = await modalOptions.count();
        console.log(`✅ Found ${modalCount} modal quantity options`);

        for (let j = 0; j < modalCount; j++) {
            const modalQty = modalOptions.nth(j);
            const rawText = (await modalQty.textContent()).trim();
            const qtyText = rawText.match(/^\d+/)?.[0] || rawText;

            await modalQty.scrollIntoViewIfNeeded();
            await modalQty.click();
            console.log(`🧪 Clicked quantity: ${qtyText}`);

            // Reopen the modal after each click (so all can be tested)
            if (j < modalCount - 1) {
                await seeMoreButton.click();
                await expect(modal).toBeVisible({ timeout: 4000 });
            }
        }
    } else {
        console.log('ℹ️ No modal (See More) quantities found.');
    }

    console.log('✅ All quantities tested and clickable.');
});
