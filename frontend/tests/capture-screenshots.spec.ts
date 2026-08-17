import { test } from '@playwright/test';
import * as path from 'path';

const artifactsDir = 'C:/Users/maste.DARSH/.gemini/antigravity-ide/brain/428a3f54-9609-4d70-be57-e8c9321437b4';

test.describe('Projector 1280x720 Screen Capture', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('1. Capture Title Verifier with Official Statutory Memorandum Modal', async ({ page }) => {
    await page.goto('/?skipIntro=1');
    const memoButton = page.getByRole('button', { name: /Official Memorandum \(PDF \/ Print\)/i });
    if (await memoButton.isVisible()) {
      await memoButton.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(artifactsDir, 'memorandum-1280x720.png'), fullPage: false });
      await page.keyboard.press('Escape');
    }
  });

  test('2. Capture Officer Review Docket Queue', async ({ page }) => {
    await page.goto('/?skipIntro=1');
    const officerTab = page.getByRole('button', { name: /Officer Copilot/i });
    await officerTab.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(artifactsDir, 'docket-1280x720.png'), fullPage: false });
  });

  test('3. Capture Case Detail Evidence Drawer with AI Copilot Memo & Endorsement', async ({ page }) => {
    await page.goto('/?skipIntro=1');
    const officerTab = page.getByRole('button', { name: /Officer Copilot/i });
    await officerTab.click();
    const firstCase = page.getByRole('button', { name: /^Case OC-/i }).first();
    await firstCase.click();
    await page.waitForTimeout(300);
    const endorseBtn = page.getByRole('button', { name: 'Endorse & Approve' });
    if (await endorseBtn.isVisible()) await endorseBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(artifactsDir, 'drawer-1280x720.png'), fullPage: false });
    await page.keyboard.press('Escape');
  });

  test('4. Capture Registry Explorer with Search & 50-row Pagination', async ({ page }) => {
    await page.goto('/?skipIntro=1');
    const registryTab = page.getByRole('button', { name: 'Registry' });
    await registryTab.click();
    const searchInput = page.getByPlaceholder(/Type to search/i);
    await searchInput.fill('india');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactsDir, 'registry-1280x720.png'), fullPage: false });
  });
});
