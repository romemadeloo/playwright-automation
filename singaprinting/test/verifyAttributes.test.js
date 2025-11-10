import { test, expect } from '@playwright/test';
import { login } from '../utils/login.js';
import { sgConfig } from '../config/sgConfig.js';

test.setTimeout(3000000);

async function looper(page, fieldName, expectedOptions, isQuantity = false) {
  const fieldLocator = page.locator(
    `//h4[contains(@class,"section_title") and normalize-space(text())="${fieldName}"]/following-sibling::div[contains(@class,"switcher_con")]`
  );

  await expect(fieldLocator, `${fieldName} section not visible`).toBeVisible({ timeout: 8000 });

  const options = fieldLocator.locator('.select_items > ul > li:not(.see_more)');
  const optionCount = await options.count();

  const actualBaseOptions = [];
  for (let i = 0; i < optionCount; i++) {
    const text = (await options.nth(i).textContent()).trim();
    actualBaseOptions.push(text);
  }

  console.log(`\n📘 Field: ${fieldName}`);

  if (!isQuantity) {
    console.log(`   🔹 Expected: [${expectedOptions.join(', ')}]`);
    console.log(`   🔸 Found:    [${actualBaseOptions.join(', ')}]`);
    expect(actualBaseOptions).toEqual(expectedOptions);

    for (let i = 0; i < optionCount; i++) {
      const option = options.nth(i);
      await option.scrollIntoViewIfNeeded();
      await option.click();
      await expect(option).toHaveClass(/active/);
    }
    return actualBaseOptions;
  }

  /* -- Quantity special handling --- */
  const quantityExpectedBase = expectedOptions.slice(0, optionCount);
  const quantityExpectedModal = expectedOptions.slice(optionCount);

  expect(actualBaseOptions).toEqual(quantityExpectedBase);

  // Click base quantities
  for (let i = 0; i < optionCount; i++) {
    const option = options.nth(i);
    await option.scrollIntoViewIfNeeded();
    await option.click();
    await expect(option).toHaveClass(/active/);
  }

  // Check modal quantities
  if (quantityExpectedModal.length > 0) {
    const seeMoreButton = fieldLocator.locator('.see_more, button.show_more_quantities');
    if (await seeMoreButton.isVisible()) {
      await seeMoreButton.click();

      const modal = page.locator('.custom_quantity_modal');
      await expect(modal).toBeVisible({ timeout: 5000 });

      const modalOptions = modal.locator('li');
      const modalCount = await modalOptions.count();
      const actualModalOptions = [];

      for (let j = 0; j < modalCount; j++) {
        const text = (await modalOptions.nth(j).textContent()).trim();
        const numberOnly = text.match(/^\d+/)?.[0];
        actualModalOptions.push(numberOnly);
      }

      const allExpected = [...quantityExpectedBase, ...quantityExpectedModal];
      const allFound = [...actualBaseOptions, ...actualModalOptions];
      console.log(`   🔹 Expected: [${allExpected.join(', ')}]`);
      console.log(`   🔸 Found:    [${allFound.join(', ')}]`);

      expect(actualModalOptions).toEqual(quantityExpectedModal);

      for (let j = 0; j < modalCount; j++) {
        const modalQty = modalOptions.nth(j);
        await modalQty.scrollIntoViewIfNeeded();
        await modalQty.click();
        if (j < modalCount - 1) {
          await seeMoreButton.click();
          await expect(modal).toBeVisible({ timeout: 4000 });
        }
      }

      await page.keyboard.press('Escape');
    }
  }

  return [...actualBaseOptions, ...quantityExpectedModal];
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

function expectedAttributes(slug) {
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
        Square: ['Gloss', 'Matte'],
        Heart: ['Gloss', 'Matte'],
      },
      Quantity: getExpectedQuantities('badges'),
      Packaging: ['No', 'Yes'],
    },
    'mirror-badge': {
      Shapes: ['Circle'],
      Sizes: {
        Circle: ['58x58', '75x75'],
      },
      Finishing: {
        Circle: ['Gloss', 'Matte'],
      },
      Quantity: getExpectedQuantities('badges'),
      Packaging: ['No', 'Yes'],
    },
    'magnetic-badge': {
      Shapes: ['Circle'],
      Sizes: {
        Circle: ['25x25', '32x32'],
      },
      Finishing: {
        Circle: ['Gloss', 'Matte'],
      },
      Quantity: getExpectedQuantities('badges'),
      Packaging: ['No', 'Yes'],
    },
    'custom-magnet': {
      Shapes: ['Circle', 'Rectangle', 'Custom'],
      Sizes: {
        Circle: ['30x30', '35x35', '40x40', '45x45', '50x50', '55x55'],
        Rectangle: ['53x33', '55x38', '60x41', '65x45', '80x55', '90x65'],
        Custom: [],
      },
      Finishing: {
        Circle: [],
        Rectangle: [],
        Custom: [],
      },
      Quantity: getExpectedQuantities('magnets'),
      Packaging: ['No', 'Yes'],
    },
  };

  return attributes[slug];
}

async function verifyAttributes(page, slug) {
  const expected = expectedAttributes(slug);

  console.log(`\n🧩 Verifying product: ${slug}`);

  for (let i = 0; i < expected.Shapes.length; i++) {
    const shape = expected.Shapes[i];
    console.log(`\n➡️ Checking shape: ${shape}`);

    if (i !== 0) {
      const shapeButton = page.locator('div.switcher_con li', { hasText: shape });
      await expect(shapeButton, `Shape button "${shape}" not found`).toBeVisible({ timeout: 5000 });
      await shapeButton.click();

      const sizeExpected = expected.Sizes[shape];
      if (sizeExpected && sizeExpected.length > 0) {
        const sizeSection = page.locator(`//h4[contains(., "Size")]/following-sibling::div`);
        await expect(sizeSection).toContainText(sizeExpected[0], { timeout: 8000 });
      }
    }

    // Sizes
    if (slug === 'custom-magnet' && shape === 'Custom') {
      const widthInput = page.locator('input[name="width"]');
      const heightInput = page.locator('input[name="height"]');
      await expect(widthInput).toBeVisible({ timeout: 5000 });
      await expect(heightInput).toBeVisible({ timeout: 5000 });
      console.log(`✅ Verified Custom Size for ${shape}`);
    } else {
      const sizeExpected = expected.Sizes[shape] || [];
      if (sizeExpected.length > 0) {
        await looper(page, 'Size (mm)', sizeExpected);
      }
      console.log(`✅ Verified Sizes for ${shape}`);
    }

    // Finishing
    if (!(slug === 'custom-magnet' && shape === 'Custom')) {
      const finishingExpected = expected.Finishing[shape] || [];
      if (finishingExpected.length > 0) {
        await looper(page, 'Finishing', finishingExpected);
      }
      console.log(`✅ Verified Finishing for ${shape}`);
    }

    // Quantity
    const quantityExpected = expected.Quantity;
    if (quantityExpected) {
      await looper(
        page,
        'Quantity',
        [...quantityExpected.expectedBase, ...quantityExpected.expectedModal],
        true
      );
    }
    console.log(`✅ Verified Quantities for ${shape}`);

    // Individual Packaging
    const packagingExpected = expected.Packaging;
    if (packagingExpected && slug !== 'custom-magnet') {
      await looper(page, 'Individual Packaging', packagingExpected);
    }
    console.log(`✅ Verified Packaging for ${shape}`);
  }
}

test('Verify Attributes for New Products', async ({ page }) => {
  const env = process.env.ENV || 'dev';
  const targetEnv = sgConfig.environment[env];
  const baseUrl = targetEnv.baseUrl;

  console.log(`🌐 Environment: ${env}`);
  console.log(`🔗 Base URL: ${baseUrl}`);

  const products = [
    { category: 'badges', slug: 'button-badge' },
    { category: 'badges', slug: 'mirror-badge' },
    { category: 'badges', slug: 'magnetic-badge' },
    { category: 'magnets', slug: 'custom-magnet' },
  ];

  for (const { category, slug } of products) {
    const productUrl = `${baseUrl}${category}/${slug}?featured=1`;
    console.log(`\n🔄 Navigating to ${slug.toUpperCase()}: ${productUrl}`);

    try {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await verifyAttributes(page, slug);
    } catch (err) {
      console.error(`❌ Error verifying ${slug}:`, err);
      throw err;
    }
  }

  console.log('\n🎉 All product attribute verifications completed!\n');
});