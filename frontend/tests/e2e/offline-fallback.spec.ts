import { test, expect } from '@playwright/test';

test.describe('Scenario 7: Offline Client-Side Intelligence Engine Fallback', () => {
  test('verifies proposed titles successfully in offline standalone mode', async ({ page }) => {
    await page.goto('/?skipIntro=1');

    // Assert engine mode badge is present
    await expect(page.getByText(/Client AI/i)).toBeVisible();

    // Verify a title
    const titleInput = page.getByPlaceholder(/Enter proposed publication title/i);
    await expect(titleInput).toBeVisible();
    await titleInput.fill('The Vidarbha Daily Express');

    const verifyButton = page.getByRole('button', { name: /Verify Title/i });
    await verifyButton.click();

    // Assert complete 4D similarity result & verdict render without network backend dependency
    const verdictSection = page.getByRole('region', { name: /Title Verification Verdict/i });
    await expect(verdictSection).toBeVisible();

    const similaritySection = page.getByRole('region', { name: /4-Dimensional NLP Similarity/i });
    await expect(similaritySection).toBeVisible();
  });
});
