import { expect } from '@playwright/test';
import { authTest } from './helpers/auth';

authTest.describe('Team Builder', () => {
  authTest('renders the Team Builder UI and matches elements', async ({ signedInPage }) => {
    const page = signedInPage;
    await page.goto('/');
    await page.getByRole('tab', { name: 'Team Builder' }).click();

    await expect(page.getByRole('heading', { name: 'Team Builder & Matcher' }).or(page.getByText('Team Builder & Matcher'))).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Team' }).or(page.getByRole('button', { name: 'Create New Team' }))).toBeVisible();
  });
});
