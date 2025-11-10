import { test, expect } from '@playwright/test';
import fs from 'fs';

const expected = JSON.parse(fs.readFileSync('ozstickerprinting/test/testData/magneticBadgesContent.json', 'utf-8'));

test.describe('🧾 Product Page: Magnetic Badges', () => {
  test.beforeEach(async ({ page }) => {
    console.log(`🧭 Navigating to: ${expected.url}`);
    await page.goto(expected.url, { waitUntil: 'domcontentloaded' });
  });

  // =============== 1️⃣ QUOTE BANNER SECTION ===============
  test.describe('🟦 Quote Banner Section', () => {
    test('Verify images and thumbnails', async ({ page }) => {
      const banner = page.locator('section.quote_banner');
      await expect(banner).toBeVisible();

      const screenshotPath = 'screenshots/buttonBadge';
      if (!fs.existsSync(screenshotPath)) fs.mkdirSync(screenshotPath, { recursive: true });
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
    });
  });

  // =============== 2️⃣ CONTENT SECTION ===============
  test.describe('🟩 Content Section', () => {
    test('Verify titles, descriptions, and perfect-for list', async ({ page }) => {
      const content = page.locator('.product-content-container');
      await expect(content).toBeVisible();

      const screenshotPath = 'screenshots/buttonBadge';
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

      // ✅ Perfect For list
      const perfectForTexts = await content.locator('li').allTextContents();
      for (const item of expected.content_container.perfect_for) {
        const found = perfectForTexts.some(t => t.includes(item));
        expect(found, `Missing perfect for item: ${item}`).toBeTruthy();
      }

      console.log('✅ Content section verified.');
    });
  });

  // =============== 3️⃣ PRODUCT INFO SECTION ===============
  test.describe('🟨 Product Info Section', () => {
    test('Verify finishing, magnetic strength, sizes, and downloads', async ({ page }) => {
      const bottom = page.locator('.product_info_btm_v2');
      await expect(bottom).toBeVisible();

      const screenshotPath = 'screenshots/buttonBadge';
      await bottom.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${screenshotPath}/03-product-info.png`, fullPage: false });

      // ✅ Finishing Section
      const finishingSection = bottom.locator('.product-section-finishing');
      await expect(finishingSection).toBeVisible();

      await finishingSection.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${screenshotPath}/03a-finishing-section.png`, fullPage: false });

      const finishingTitle = await finishingSection.locator('.section-title').textContent();
      expect(finishingTitle?.trim()).toContain('Finishing');

      const finishingDesc = await finishingSection.locator('.section-description').textContent();
      expect(finishingDesc?.trim()).toContain(expected.product_info.finishing.description);

      const finishingTitles = await bottom.locator('.finishing-title').allTextContents();
      for (const finish of expected.product_info.finishing.options) {
        const found = finishingTitles.some(t => t.includes(finish.title));
        expect(found, `Missing finishing title: ${finish.title}`).toBeTruthy();
      }

      const precautionTitles = await bottom.locator('.instruction-title').allTextContents();
      for (const notice of expected.product_info.precautions.notices) {
        const found = precautionTitles.some(t => t.includes(notice.title));
        expect(found, `Missing precaution: ${notice.title}`).toBeTruthy();
      }

      // ✅ Magnetic Strength & Thickness section
      const strengthSection = expected.product_info.strength_thickness;
      const normalizeText = text => text.replace(/\s+/g, ' ').replace(/[–—]/g, '-').trim().toLowerCase();

      const strengthTitles = await bottom.locator('.product-section-magnetic .section-title').allTextContents();
      const hasStrengthTitle = strengthTitles.some(t => normalizeText(t).includes(normalizeText(strengthSection.title)));
      expect(hasStrengthTitle, `Missing or incorrect title: ${strengthSection.title}`).toBeTruthy();

      const strengthParagraphs = await bottom.locator('.product-section-magnetic p').allTextContents();
      for (const desc of strengthSection.description) {
        const found = strengthParagraphs.some(p => normalizeText(p).includes(normalizeText(desc)));
        expect(found, `Missing or mismatched description: ${desc}`).toBeTruthy();
      }

      const imageLocator = bottom.locator('img[src*="magnetic-strength-thickness.webp"]');
      const imageCount = await imageLocator.count();
      expect(imageCount, `Missing image for ${strengthSection.title}`).toBeGreaterThan(0);

      // ✅ Shapes & Sizes
      const shapeImages = await bottom.locator('.size-item img').evaluateAll(imgs => imgs.map(i => i.src));
      for (const img of expected.product_info.shapes_sizes.images) {
        const found = shapeImages.some(src =>
          src.includes(img.replace('.png', '')) || src.includes(img.replace('.webp', ''))
        );
        expect(found, `Missing shape/size image: ${img}`).toBeTruthy();
      }

      // ✅ Downloads
      const downloadImgs = await bottom.locator('.downloads-list img').evaluateAll(imgs => imgs.map(i => i.src));
      for (const dl of expected.product_info.downloads) {
        const found = downloadImgs.some(src => src.includes(dl.icon));
        expect(found, `Missing download icon: ${dl.type}`).toBeTruthy();
      }

      console.log('✅ Product info section verified.');
    });
  });
});
