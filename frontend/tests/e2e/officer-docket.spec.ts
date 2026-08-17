import { test, expect } from '@playwright/test';

test.describe('Scenario 8: Officer Review Docket & AI Copilot Endorsement Flow', () => {
  test('prioritizes borderline cases, enables memo editing, and signs official decision artifact', async ({ page }) => {
    await page.goto('/?skipIntro=1');

    // Switch to Officer Review Docket tab
    const officerTab = page.getByRole('button', { name: /Officer Copilot/i });
    await officerTab.click();

    // Assert summary metrics strip is visible
    const metricsStrip = page.getByRole('region', { name: /Docket Summary Metrics/i });
    await expect(metricsStrip).toBeVisible();

    // Assert amber borderline cases (e.g. OC-0006 with 74% risk) are sorted to the top
    const firstCase = page.getByRole('button', { name: /^Case OC-/i }).first();
    await expect(firstCase).toBeVisible();
    await expect(firstCase.getByText('MANUAL REVIEW')).toBeVisible();

    // Open the case detail drawer via Inspect Evidence button
    const inspectButton = page.getByRole('button', { name: /Inspect Evidence & Issue Endorsement/i });
    await expect(inspectButton).toBeVisible();
    await inspectButton.click();

    // Assert Case Detail Drawer is open
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();

    // Edit the AI Copilot Decision Memo
    const memoTextarea = drawer.getByRole('textbox');
    await expect(memoTextarea).toBeVisible();
    await memoTextarea.fill('Official Officer Audit: Verified with statutory clearance per Press & Registration of Periodicals Act 2023.');

    // Click "Endorse & Approve" button
    const endorseButton = drawer.getByRole('button', { name: 'Endorse & Approve' });
    await endorseButton.click();

    // Confirm irreversible legal action in confirmation dialog
    const confirmButton = drawer.getByRole('button', { name: 'Confirm & Record Endorsement' });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    // Assert official reference token artifact panel appears with token format PRGI/2026/OFF/
    const decisionStatus = drawer.getByRole('status');
    await expect(decisionStatus).toBeVisible();
    await expect(decisionStatus.getByText(/PRGI\/2026\/OFF\//i)).toBeVisible();
    await expect(decisionStatus.getByText(/Status: APPROVED/i)).toBeVisible();
  });
});
