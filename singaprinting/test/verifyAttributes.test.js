import { test, expect } from '@playwright/test';
import { login } from '../utils/login.js';
import { sgConfig } from '../config/sgConfig.js';

test.setTimeout(3000000);

async function verifySwitcherField(page, fieldName, expectedOptions = [], category = '', expectedAttributes = {}) {
    const fieldLocator = page.locator(`//h4[contains(@class,"section_title") and normalize-space(text())="${fieldName}"]/following-sibling::div[contains(@class,"switcher_con")]`);
    await expect(fieldLocator).toBeVisible({ timeout: 8000 });
    console.log(`✅ "${fieldName}" section found`);

    const options = fieldLocator.locator('.select_items > ul > li:not(.see_more)');
    const optionCount = await options.count();

    const actualOptions = [];
    for (let i = 0; i < optionCount; i++) {
        const text = (await options.nth(i).textContent()).trim();
        actualOptions.push(text);
    }

    console.log(`📋 ${fieldName} Options: ${actualOptions.join(', ')}`);

    if (expectedOptions.length) {
        expect(actualOptions).toEqual(expectedOptions);
    }

    // Handle SHAPES field specially
    if (fieldName === 'Shapes') {
        for (let i = 0; i < optionCount; i++) {
            const shapeItem = options.nth(i);
            const shapeName = actualOptions[i];
            await shapeItem.scrollIntoViewIfNeeded();
            await shapeItem.click();
            await expect(shapeItem).toHaveClass(/active/);
            console.log(`🎨 Selected Shape: ${shapeName}`);

            await page.waitForTimeout(1000);

            // Nested fields: size, finishing, quantity
            const nestedFields = ['Size (mm)', 'Finishing', 'Quantity'];
            const filteredFields = category === 'magnets'
                ? nestedFields.filter(f => f !== 'Finishing')
                : nestedFields;

            for (const nestedField of filteredFields) {
                const nestedLocator = page.locator(`//h4[contains(@class,"section_title") and normalize-space(text())="${nestedField}"]/following-sibling::div[contains(@class,"switcher_con")]`);
                if (!(await nestedLocator.isVisible())) {
                    console.log(`⚠️ Skipping "${nestedField}" — not visible for ${shapeName}`);
                    continue;
                }

                const nestedOptions = nestedLocator.locator('.select_items > ul > li:not(.see_more)');
                const nestedCount = await nestedOptions.count();
                const nestedValues = [];

                for (let j = 0; j < nestedCount; j++) {
                    const text = (await nestedOptions.nth(j).textContent()).trim();
                    nestedValues.push(text);
                }

                console.log(`   🔹 ${nestedField} Options for ${shapeName}: ${nestedValues.join(', ')}`);

                // ✅ Validation logic per shape
                if (nestedField === 'Size (mm)' && expectedAttributes?.Sizes?.[shapeName]) {
                    expect(nestedValues).toEqual(expectedAttributes.Sizes[shapeName]);
                } else if (nestedField === 'Finishing' && expectedAttributes?.Finishing?.[shapeName]) {
                    expect(nestedValues).toEqual(expectedAttributes.Finishing[shapeName]);
                }
            }

            console.log(`✅ Completed verification for shape: ${shapeName}\n`);
        }
    } else {
        // Default behavior for non-shape fields
        for (let i = 0; i < optionCount; i++) {
            const item = options.nth(i);
            await item.scrollIntoViewIfNeeded();
            await item.click();
            await expect(item).toHaveClass(/active/);
            console.log(`🧪 Selected ${fieldName}: ${actualOptions[i]}`);
            await page.waitForTimeout(500);
        }
    }
}

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

        await page.keyboard.press('Escape');
    } else {
        console.log('ℹ️ No modal quantities found.');
    }
}

function getExpectedAttributes(slug) {
    const attributes = {
        'button-badge': {
            Shapes: ['Circle', 'Square', 'Heart'],
            Sizes: {
                Circle: ['32x32', '44x44', '58x58', '75x75'],
                Square: ['37x37'],
                Heart: ['52x57'],
            },
            Finishing: {
                Circle: ['Gloss'],
                Square: ['Gloss'],
                Heart: ['Gloss', 'Matte'],
            },
        },
        'mirror-badge': {
            Shapes: ['Circle'],
            'Size (mm)': ['58x58', '75x75'],
            Finishing: ['Gloss', 'Matte'],
        },
        'magnetic-badge': {
            Shapes: ['Circle'],
            'Size (mm)': ['25x25', '32x32'],
            Finishing: ['Gloss', 'Matte'],
        },
        'custom-magnet': {
            Shapes: {
                Circle: ['30x30', '35x35', '40x40', '45x45', '50x50', '55x55'],
                Rectangle: ['53x33', '55x38', '60x41', '65x45', '80x55', '90x65'],
                Custom: [],
            },
        },
    };

    return attributes[slug] || {};
}

function getExpectedQuantities(category) {
    switch (category) {
        case 'badges':
            return {
                expectedBase: ['5', '10'],
                expectedModal: ['20', '30', '50', '100', '200', '300', '500', '1000'],
            };
        case 'magnets':
            return {
                expectedBase: ['50', '100'],
                expectedModal: ['200', '300', '500', '1000', '2000', '5000'],
            };
        default:
            return { expectedBase: [], expectedModal: [] };
    }
}

test('Verify Attributes of New Products - SingaPrinting', async ({ page }) => {
    const env = process.env.ENV || 'dev';
    const targetEnv = sgConfig.environment[env];
    const baseUrl = targetEnv.baseUrl;

    console.log(`🌐 Environment: ${env}`);
    console.log(`🔗 Base URL: ${baseUrl}`);

    // LOGIN
    const loggedIn = await login(page, env);
    if (!loggedIn) throw new Error('❌ Login failed — cannot proceed.');

    const products = [
        { category: 'badges', slug: 'button-badge' },
        { category: 'badges', slug: 'mirror-badge' },
        { category: 'badges', slug: 'magnetic-badge' },
        { category: 'magnets', slug: 'custom-magnet' },
    ];

    for (const product of products) {
        const productUrl = `${baseUrl}${product.category}/${product.slug}?featured=1`;
        console.log(`\n🔄 Navigating to ${product.slug.toUpperCase()}: ${productUrl}`);
        await page.goto(productUrl, { waitUntil: 'domcontentloaded' });

        const expectedAttributes = getExpectedAttributes(product.category, product.slug);
        let fieldsToVerify = ['Shapes', 'Size (mm)', 'Finishing', 'Quantity'];

        if (product.category === 'magnets') {
            fieldsToVerify = fieldsToVerify.filter(f => f !== 'Finishing');
        }

        for (const field of fieldsToVerify) {
            // Skip quantity here (we handle it separately)
            if (field === 'Quantity') continue;

            const fieldLocator = page.locator(
                `//h4[contains(@class,"section_title") and normalize-space(text())="${field}"]`
            );
            const isFieldVisible = await fieldLocator.isVisible();

            if (!isFieldVisible) {
                console.log(`⚠️ Skipping "${field}" — field not found on page for ${product.slug}`);
                continue;
            }

            const expectedOptions = expectedAttributes[field] || [];
            await verifySwitcherField(page, field, expectedOptions, product.category, expectedAttributes);
        }

        // ✅ QUANTITY VALIDATION
        const { expectedBase, expectedModal } = getExpectedQuantities(product.category);
        await verifyQuantities(page, { expectedBase, expectedModal });

        console.log(`\n✅ Finished testing ${product.slug.toUpperCase()}.`);
    }

    console.log('\n🎉 All products tested successfully!');
});