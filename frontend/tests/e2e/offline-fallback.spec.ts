import { test, expect } from '@playwright/test';

test.describe('Scenario 7: Offline Client-Side Intelligence Engine Fallback', () => {
  test('verifies proposed titles successfully in offline standalone mode', async ({ page }) => {
    await page.goto('/?skipIntro=1');

    // Engine badge assertion in top-right header
    const engineBadge = page.getByText(/Engine: Client AI/i);
    await expect(engineBadge).toBeVisible();

    const titleInput = page.getByPlaceholder(/Enter proposed publication title/i);
    await titleInput.fill('Mumbai Financial Express');

    const verifyButton = page.getByRole('button', { name: /Verify Title/i });
    await verifyButton.click();

    // Assert results card and similarity breakdown render
    await expect(page.getByText(/Conflict Risk Score/i)).toBeVisible();
    await expect(page.getByText(/4-Dimensional Similarity Matrix/i)).toBeVisible();
  });
});
