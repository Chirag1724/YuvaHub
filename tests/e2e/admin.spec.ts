import { expect } from '@playwright/test';
import { authTest } from './helpers/auth';

authTest.describe('Admin panel', () => {
  authTest('is reachable and renders stats for an admin user', async ({ signedInPage }) => {
    const page = signedInPage;
    await page.goto('/');
    await page.getByRole('tab', { name: 'Admin Panel' }).click();

    await expect(page.getByRole('tab', { name: 'Admin Panel' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Active Users')).toBeVisible();
    await expect(page.getByText('Admin Panel Access Restricted')).toHaveCount(0);
  });
});
