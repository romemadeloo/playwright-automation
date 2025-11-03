import { test, expect } from '@playwright/test';
import fs from 'fs';

const expected = JSON.parse(fs.readFileSync('singaprinting/test/testData/customMagnetsContent.json', 'utf-8'));

test.describe('🧾 Product Page: Custom Magnets', () => {
  test('Verify sections, text, images, and structure', async ({ page }) => {
    console.log(`🧭 Navigating to: ${expected.url}`);
    await page.goto(expected.url, { waitUntil: 'domcontentloaded' });

    // 📸 Screenshot folder
    const screenshotPath = 'screenshots/customMagnets';
    if (!fs.existsSync(screenshotPath)) fs.mkdirSync(screenshotPath, { recursive: true });

    // =============== 1️⃣ QUOTE BANNER SECTION ===============
    const banner = page.locator('section.quote_banner');
    await expect(banner).toBeVisible();

    // 🖱️ Scroll + Screenshot
    await banner.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${screenshotPath}/01-quote-banner.png`, fullPage: false });

    // ✅ Images
    const imageSrcs = await banner.locator('img').evaluateAll(imgs => imgs.map(i => i.src));
    for (const img of expected.quote_banner.images) {
      const found = imageSrcs.some(src => src.includes(img));
      expect(found, `Missing banner image: ${img}`).toBeTruthy();
    }

    // ✅ Thumbnails
    const thumbSrcs = await banner.locator('.quote_carousel_thumbnails img').evaluateAll(imgs => imgs.map(i => i.src));
    for (const thumb of expected.quote_banner.thumbnails) {
      const found = thumbSrcs.some(src => src.includes(thumb));
      expect(found, `Missing thumbnail: ${thumb}`).toBeTruthy();
    }

    console.log('✅ Quote banner verified.');

    // =============== 2️⃣ CONTENT SECTION ===============
    const content = page.locator('.product-content-container');
    await expect(content).toBeVisible();

    // 🖱️ Scroll + Screenshot
    await content.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${screenshotPath}/02-content-section.png`, fullPage: false });

    // ✅ Titles and subtitles
    await expect(content.locator('h2.content-title')).toHaveText(expected.content_container.title);
    await expect(content.locator('h6.content-subtitle')).toHaveText(expected.content_container.subtitle);

    // ✅ Descriptions
    const descText = (await content.locator('p.content-description').allTextContents()).join(' ');
    for (const snippet of expected.content_container.descriptions) {
      expect(descText).toContain(snippet);
    }

    // ✅ "Perfect For" list
    const perfectForTexts = await content.locator('li').allTextContents();
    for (const item of expected.content_container.perfect_for) {
      const found = perfectForTexts.some(t => t.includes(item));
      expect(found, `Missing perfect for item: ${item}`).toBeTruthy();
    }

    console.log('✅ Content section verified.');

    // =============== 3️⃣ PRODUCT INFO SECTION ===============
    const bottom = page.locator('.product_info_btm_v2');
    await expect(bottom).toBeVisible();

    // 🖱️ Scroll + Screenshot
    await bottom.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${screenshotPath}/03-product-info.png`, fullPage: false });

    // ✅ Shapes & Sizes
    const shapeSection = bottom.locator('.product-details');
    await expect(shapeSection).toBeVisible();

    const title = await shapeSection.locator('.section-title').textContent();
    expect(title.trim()).toContain(expected.product_info.shapes_sizes.title);

    const desc = await shapeSection.locator('.section-description').textContent();
    expect(desc.trim()).toContain(expected.product_info.shapes_sizes.description);


    // ✅ Download Templates
    const downloadImgs = await bottom.locator('.downloads-list img').evaluateAll(imgs => imgs.map(i => i.src));
    for (const dl of expected.product_info.downloads) {
      const found = downloadImgs.some(src => src.includes(dl.icon));
      expect(found, `Missing download icon: ${dl.type}`).toBeTruthy();
    }

    console.log('✅ Product info section verified.');
  });
});
