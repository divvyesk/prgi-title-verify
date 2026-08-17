import { test, expect } from '@playwright/test';

test.describe('Scenario 4: The Vidarbha Daily Express (Core-Word Root Extraction)', () => {
  test('strips filler words and detects core root clash on vidarbha', async ({ page }) => {
    await page.goto('/?skipIntro=1');

    const titleInput = page.getByPlaceholder(/Enter proposed publication title/i);
    await expect(titleInput).toBeVisible();
    await titleInput.fill('The Vidarbha Daily Express');

    const verifyButton = page.getByRole('button', { name: /Verify Title/i });
    await verifyButton.click();

    // Assert Verdict section is loaded
    const verdictSection = page.getByRole('region', { name: /Title Verification Verdict/i });
    await expect(verdictSection).toBeVisible();

    // Assert Core-Word similarity extracted "vidarbha" root token
    const similaritySection = page.getByRole('region', { name: /4-Dimensional NLP Similarity/i });
    await expect(similaritySection).toBeVisible();
    await expect(similaritySection.getByText(/vidarbha/i).first()).toBeVisible();

    // Assert clashing titles with Vidarbha appear in conflict list
    const clashSection = page.getByRole('region', { name: /Top Clashing Registered Publications/i });
    await expect(clashSection).toBeVisible();
    await expect(clashSection.getByText(/Vidarbha/i).first()).toBeVisible();
  });
});
