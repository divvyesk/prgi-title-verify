import { test, expect } from '@playwright/test';

test.describe('Scenario 2: Jaagran vs Jagran (Phonetic Soundex Match)', () => {
  test('detects phonetic pronunciation clash with Jagran registered periodical', async ({ page }) => {
    await page.goto('/?skipIntro=1');

    const titleInput = page.getByPlaceholder(/Enter proposed publication title/i);
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Jaagran');

    const verifyButton = page.getByRole('button', { name: /Verify Title/i });
    await verifyButton.click();

    // Assert Phonetic sub-score section is present and shows match
    await expect(page.getByText(/2\. Phonetic Soundex Match/i)).toBeVisible();

    // Assert clash detected against Jagran family
    await expect(page.getByText(/Jagran/i).first()).toBeVisible();
  });
});
