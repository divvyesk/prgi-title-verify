import { test, expect } from '@playwright/test';

test.describe('Scenario 2: Jaagran vs Jagran (Phonetic Soundex Match)', () => {
  test('detects phonetic pronunciation clash with Jagran registered periodical', async ({ page }) => {
    await page.goto('/?skipIntro=1');

    const titleInput = page.getByPlaceholder(/Enter proposed publication title/i);
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Jaagran Weekly');

    const verifyButton = page.getByRole('button', { name: /Verify Title/i });
    await verifyButton.click();

    // Assert Verdict section appears
    const verdictSection = page.getByRole('region', { name: /Title Verification Verdict/i });
    await expect(verdictSection).toBeVisible();

    // Assert phonetic match with Jagran or Dainik Jagran in the clash list
    const clashSection = page.getByRole('region', { name: /Top Clashing Registered Publications/i });
    await expect(clashSection).toBeVisible();
    await expect(clashSection.getByText(/Jagran/i).first()).toBeVisible();

    // Assert Phonetic similarity metric is calculated
    const similaritySection = page.getByRole('region', { name: /4-Dimensional NLP Similarity/i });
    await expect(similaritySection.getByRole('progressbar', { name: /Phonetic Soundex Similarity/i })).toBeVisible();
  });
});
