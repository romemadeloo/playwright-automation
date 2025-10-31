import { test, expect } from '@playwright/test';
import { login } from '../utils/login.js';
import { sgConfig } from '../config/sgConfig.js';

test.setTimeout(3000000);

async function verifyQuantities(page, { expectedBase, expectedModal }) {
    const quantitySection = page.locator('//h4[normalize-space(.)="Quantity"]/following-sibling::div[contains(@class,"switcher_con")]');
    await expect(quantitySection).toBeVisible({ timeout: 8000 });

    // BASE OPTIONS
    const baseOptions = quantitySection.locator('.select_items > ul > li:not(.see_more)');
    const baseCount = await baseOptions.count();

    const actualBaseQuantities = [];
    for (let i = 0; i < baseCount; i++) {
        const text = (await baseOptions.nth(i).textContent()).trim().match(/^\d+/)?.[0] || '';
        actualBaseQuantities.push(text);
    }

    console.log(`📊 Base Quantities: ${actualBaseQuantities.join(', ')}`);
    expect(actualBaseQuantities).toEqual(expectedBase);

    // CLICK EACH BASE OPTION
    for (let i = 0; i < baseCount; i++) {
        const qtyItem = baseOptions.nth(i);
        await qtyItem.scrollIntoViewIfNeeded();
        await qtyItem.click();
        await expect(qtyItem).toHaveClass(/active/);
        console.log(`🧪 Clicked base quantity: ${expectedBase[i]}`);
    }

    // HANDLE "SEE MORE"
    const seeMoreButton = quantitySection.locator('.see_more');
    if (await seeMoreButton.isVisible()) {
        console.log('📦 Opening See More modal...');
        await seeMoreButton.click();

        const modal = page.locator('.custom_quantity_modal');
        await expect(modal).toBeVisible({ timeout: 5000 });

        const modalOptions = modal.locator('li');
        const modalCount = await modalOptions.count();

        const actualModalQuantities = [];
        for (let j = 0; j < modalCount; j++) {
            const text = (await modalOptions.nth(j).textContent()).trim().match(/^\d+/)?.[0] || '';
            actualModalQuantities.push(text);
        }

        console.log(`📊 Modal Quantities: ${actualModalQuantities.join(', ')}`);
        expect(actualModalQuantities).toEqual(expectedModal);

        // CLICK EACH MODAL OPTION
        for (let j = 0; j < modalCount; j++) {
            const modalQty = modalOptions.nth(j);
            await modalQty.scrollIntoViewIfNeeded();
            await modalQty.click();
            console.log(`🧪 Clicked modal quantity: ${expectedModal[j]}`);

            if (j < modalCount - 1) {
                await seeMoreButton.click();
                await expect(modal).toBeVisible({ timeout: 4000 });
            }
        }

        // Close modal if necessary
        await page.keyboard.press('Escape');
    } else {
        console.log('ℹ️ No modal quantities found.');
    }
}

test('Verify Button Badge Quantity Fields - SingaPrinting', async ({ page }) => {
    const env = process.env.ENV || 'dev';
    const targetEnv = sgConfig.environment[env];
    const baseUrl = targetEnv.baseUrl;

    console.log(`🌐 Environment: ${env}`);
    console.log(`🔗 Base URL: ${baseUrl}`);

    // LOGIN
    const loggedIn = await login(page, env);
    if (!loggedIn) throw new Error('❌ Login failed — cannot proceed.');

    const productSlugs = ['button', 'mirror', 'magnetic'];

    for (const slug of productSlugs) {
        const productUrl = `${baseUrl}badges/${slug}-badge?featured=1`;
        console.log(`\n🔄 Navigating to ${slug.toUpperCase()} Badge: ${productUrl}`);
        await page.goto(productUrl, { waitUntil: 'domcontentloaded' });

        // VERIFY SHAPE SECTION
        const shapeSection = page.locator('//h4[normalize-space(.)="Shapes"]/following-sibling::div[contains(@class,"switcher_con")]');
        await expect(shapeSection).toBeVisible({ timeout: 8000 });
        console.log('✅ Shape section found');

        // FIND SHAPES
        const shapeOptions = shapeSection.locator('.select_items > ul > li');
        const shapeCount = await shapeOptions.count();
        console.log(`🎨 Found ${shapeCount} shapes`);

        // LOOP THROUGH EACH SHAPE
        for (let i = 0; i < shapeCount; i++) {
            const shapeItem = shapeOptions.nth(i);
            const shapeText = (await shapeItem.textContent()).trim();

            console.log(`\n🔹 Testing Shape: ${shapeText}`);
            await shapeItem.scrollIntoViewIfNeeded();
            await shapeItem.click();
            await expect(shapeItem).toHaveClass(/active/);
            await page.waitForTimeout(1000);

            // VERIFY QUANTITIES
            await verifyQuantities(page, {
                expectedBase: ['5', '10'],
                expectedModal: ['20', '30', '50', '100', '200', '300', '500', '1000']
            });
        }

        console.log(`\n✅ Finished testing ${slug.toUpperCase()} Badge.`);
    }

    console.log('\n🎉 All products tested successfully!');
});