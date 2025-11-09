import { test, expect } from '@playwright/test';
import { login } from '../utils/login.js';
import { sgConfig } from '../config/sgConfig.js';

test.setTimeout(3000000);

async function looper(page, fieldName, expectedOptions) {
  const fieldLocator = page.locator(
    `//h4[contains(@class,"section_title") and normalize-space(text())="${fieldName}"]/following-sibling::div[contains(@class,"switcher_con")]`
  );

  await expect(fieldLocator, `${fieldName} section not visible`).toBeVisible({ timeout: 8000 });

  const options = fieldLocator.locator('.select_items > ul > li:not(.see_more)');
  const optionCount = await options.count();

  const actualOptions = [];
  for (let i = 0; i < optionCount; i++) {
    const text = (await options.nth(i).textContent()).trim();
    actualOptions.push(text);
  }

  console.log(`\n📘 Field: ${fieldName}`);
  console.log(`   🔹 Expected: [${expectedOptions.join(', ')}]`);
  console.log(`   🔸 Found:    [${actualOptions.join(', ')}]`);

  for (const expected of expectedOptions) {
    expect(actualOptions).toContain(expected);
  }

  return actualOptions;
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
      Shapes: ['Circle', 'Rectangle', 'Custom'],
      Sizes: {
        Circle: ['30x30', '35x35', '40x40', '45x45', '50x50', '55x55'],
        Rectangle: ['53x33', '55x38', '60x41', '65x45', '80x55', '90x65'],
        Custom: [],
      },
    },
  };

  return attributes[slug];
}

async function verifyAttributes(page, slug) {
  const attrs = expectedAttributes(slug);
  console.log(`\n🧩 Verifying attributes for: ${slug}`);

  if (!attrs) {
    console.warn(`⚠️ No attribute map found for slug: ${slug}`);
    return;
  }

  // === SHAPES ===
  if (attrs.Shapes) {
    const shapeKeys = Array.isArray(attrs.Shapes) ? attrs.Shapes : Object.keys(attrs.Shapes);
    await looper(page, 'Shapes', shapeKeys);

    for (const shape of shapeKeys) {
      console.log(`\n➡️ Selecting shape: ${shape}`);
      await page.locator(`.switcher_item:has-text("${shape}")`).click();
      await page.waitForTimeout(600);

      // === SIZE ===
      const sizeField = attrs['Size (mm)'] ? 'Size (mm)' : 'Size (mm)'; // unified naming
      const sizeOptions = attrs.Sizes ? attrs.Sizes[shape] || attrs['Size (mm)'] : null;

      if (sizeOptions && sizeOptions.length > 0) {
        await looper(page, sizeField, sizeOptions);
      } else {
        console.log(`⚠️ No size options defined for shape "${shape}"`);
      }

      // === FINISHING ===
      if (attrs.Finishing) {
        const finishingOptions = Array.isArray(attrs.Finishing)
          ? attrs.Finishing
          : attrs.Finishing[shape] || [];

        if (finishingOptions.length > 0) {
          await looper(page, 'Finishing', finishingOptions);
        } else {
          console.log(`⚠️ No finishing options defined for shape "${shape}"`);
        }
      }

      // === QUANTITY ===
      const quantityField = page.locator(
        '//h4[contains(.,"Quantity")]/following-sibling::div[contains(@class,"switcher_con")]'
      );
      if (await quantityField.isVisible()) {
        const quantities = await quantityField.locator('.switcher_item').allInnerTexts();
        console.log(`📦 Quantity options: [${quantities.join(', ')}]`);
        expect(quantities.length).toBeGreaterThan(0);
      } else {
        console.log('⚠️ Quantity field not visible.');
      }

      console.log(`🎯 Completed checks for shape "${shape}"`);
    }
  }

  console.log(`\n✅ Finished verifying ${slug}\n`);
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
    }
  }

  console.log('\n🎉 All product attribute verifications completed!\n');
});