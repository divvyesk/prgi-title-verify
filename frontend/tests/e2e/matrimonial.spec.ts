import { test, expect } from '@playwright/test';

test.describe('Scenario 5: Royal Matrimonial Classifieds (Statutory Rule Violation)', () => {
  test('rejects commercial listing title and displays verbatim statutory clause citation', async ({ page }) => {
    await page.goto('/?skipIntro=1');

    const titleInput = page.getByPlaceholder(/Enter proposed publication title/i);
    await expect(titleInput).toBeVisible();
    await titleInput.fill('The Royal Matrimonial Classifieds');

    const verifyButton = page.getByRole('button', { name: /Verify Title/i });
    await verifyButton.click();

    // Assert Verdict is explicitly REJECTED
    const verdictSection = page.getByRole('region', { name: /Title Verification Verdict/i });
    await expect(verdictSection).toBeVisible();
    await expect(verdictSection.getByText('REJECTED • HIGH CONFLICT / STATUTORY VIOLATION')).toBeVisible();

    // Assert Statutory Rulebook failure is displayed with citation
    const rulesSection = page.getByRole('region', { name: /Deterministic PRGI Statutory Rulebook/i });
    await expect(rulesSection).toBeVisible();
    await expect(rulesSection.getByText(/Commercial.*Matrimonial/i).first()).toBeVisible();
    await expect(rulesSection.getByText(/Section 4.1/i).first()).toBeVisible();
  });
});
