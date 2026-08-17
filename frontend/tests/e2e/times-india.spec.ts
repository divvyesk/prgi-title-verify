import { test, expect } from '@playwright/test';

test.describe('Scenario 1: Times India vs India Times (Anagram & Lexical Clash)', () => {
  test('detects word reordering and lists India Times as top registered clash', async ({ page }) => {
    await page.goto('/?skipIntro=1');

    const titleInput = page.getByPlaceholder(/Enter proposed publication title/i);
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Times India');

    const verifyButton = page.getByRole('button', { name: /Verify Title/i });
    await verifyButton.click();

    // Assert Verdict tier text is explicitly REJECTED
    const verdictSection = page.getByRole('region', { name: /Title Verification Verdict/i });
    await expect(verdictSection).toBeVisible();
    await expect(verdictSection.getByText('REJECTED • HIGH CONFLICT / STATUTORY VIOLATION')).toBeVisible();

    // Assert "India Times" appears in the clashing registered titles list
    const clashSection = page.getByRole('region', { name: /Top Clashing Registered Publications/i });
    await expect(clashSection).toBeVisible();
    await expect(clashSection.getByText(/India Times/i).first()).toBeVisible();

    // Assert Lexical sub-score progress bar is present
    const similaritySection = page.getByRole('region', { name: /4-Dimensional NLP Similarity/i });
    await expect(similaritySection.getByRole('progressbar', { name: /Lexical Similarity/i })).toBeVisible();
  });
});
