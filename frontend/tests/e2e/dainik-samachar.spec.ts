import { test, expect } from '@playwright/test';

test.describe('Scenario 3: Dainik Samachar vs Daily News (Semantic Cross-Lingual Translation)', () => {
  test('detects multilingual semantic translation similarity with registered titles', async ({ page }) => {
    await page.goto('/?skipIntro=1');

    const titleInput = page.getByPlaceholder(/Enter proposed publication title/i);
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Dainik Samachar');

    const verifyButton = page.getByRole('button', { name: /Verify Title/i });
    await verifyButton.click();

    // Assert Verdict section appears
    const verdictSection = page.getByRole('region', { name: /Title Verification Verdict/i });
    await expect(verdictSection).toBeVisible();

    // Assert Semantic Cross-Lingual progress bar is evaluated
    const similaritySection = page.getByRole('region', { name: /4-Dimensional NLP Similarity/i });
    await expect(similaritySection.getByRole('progressbar', { name: /Semantic Cross-Lingual Similarity/i })).toBeVisible();

    // Assert clashing publications are displayed
    const clashSection = page.getByRole('region', { name: /Top Clashing Registered Publications/i });
    await expect(clashSection).toBeVisible();
  });
});
