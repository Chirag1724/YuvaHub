import { expect } from '@playwright/test';
import { authTest } from './helpers/auth';

authTest.describe('Sidebar navigation', () => {
  authTest('switches between the main authenticated sections', async ({ signedInPage }) => {
    await signedInPage.goto('/');

    const cases: Array<{ tab: string; marker: RegExp }> = [
      { tab: 'Dashboard', marker: /Welcome back/ },
      { tab: 'Opportunities', marker: /Opportunities Explorer/ },
      { tab: 'Bookmarks', marker: /Your Saved Bookmarks/ },
      { tab: 'Community Forum', marker: /Community Discussion Forum/ },
      { tab: 'AI Assistant', marker: /AI Assistant/ },
      { tab: 'My Profile', marker: /Academic Parameters/ },
      { tab: 'Admin Panel', marker: /Active Users/ },
    ];

    for (const { tab, marker } of cases) {
      await signedInPage.getByRole('tab', { name: tab }).click();
      await expect(signedInPage.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true');
      await expect(signedInPage.getByText(marker).first()).toBeVisible();
    }
  });

  authTest('shows the signed-in user email in the sidebar footer', async ({ signedInPage }) => {
    await signedInPage.goto('/');
    await expect(signedInPage.getByText('mock@example.com')).toBeVisible();
    await expect(signedInPage.getByRole('button', { name: 'Logout' })).toBeVisible();
  });
});
