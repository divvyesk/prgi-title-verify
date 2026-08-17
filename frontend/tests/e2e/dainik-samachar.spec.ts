import { test, expect } from '@playwright/test';

test.describe('Scenario 3: Dainik Samachar vs Daily News (Semantic Cross-Lingual Translation)', () => {
  test('detects multilingual semantic translation similarity with registered titles', async ({ page }) => {
    await page.goto('/?skipIntro=1');

    const titleInput = page.getByPlaceholder(/Enter proposed publication title/i);
    await expect(titleInput).toBeVisible();
    await titleInput.fill('दैनिक समाचार');

    const verifyButton = page.getByRole('button', { name: /Verify Title/i });
    await verifyButton.click();

    // Assert Semantic / Multilingual breakdown is present
    await expect(page.getByText(/3\. Semantic Cross-Lingual Translation/i)).toBeVisible();

    // Assert detected clash list contains match
    await expect(page.getByText(/Daily News/i).first()).toBeVisible();
  });
});
