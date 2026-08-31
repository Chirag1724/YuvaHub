import { test, expect } from '@playwright/test';
import { authTest, MOCK_NAME, mockFirebaseNetwork } from './helpers/auth';

test.describe('Public landing page (unauthenticated)', () => {
  test('renders hero, category chips, curated hubs and FAQ', async ({ page }) => {
    await mockFirebaseNetwork(page);
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: /unlocking student potential/i })).toBeVisible();
    await expect(
      page.getByPlaceholder('Search Google AI hackathons, SDE roles, Reliance scholarship...'),
    ).toBeVisible();

    for (const [label, count] of [
      ['All Opportunities', '12,400+'],
      ['Hackathons & Grants', '3,800+'],
      ['Internships & SDE', '5,200+'],
      ['Scholarships', '1,900+'],
      ['Freshers Jobs', '1,500+'],
    ] as const) {
      await expect(page.getByRole('button', { name: `${label} ${count}` })).toBeVisible();
    }

    await expect(page.getByRole('heading', { name: 'Curated Opportunity Hubs' })).toBeVisible();
    await expect(page.getByText('Google Solution Challenge 2026')).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Frequently Asked Questions' })).toBeVisible();
    await expect(page.getByText('What is YuvaHub and who is it for?')).toBeVisible();
  });

  test('opens the sign-in modal and closes it', async ({ page }) => {
    await mockFirebaseNetwork(page);
    await page.goto('/');

    await page.getByRole('button', { name: 'Sign In' }).first().click();

    await expect(page.getByRole('heading', { name: 'Welcome to YuvaHub' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue with GitHub' })).toBeVisible();
    await expect(page.getByText('By continuing, you agree to YuvaHub')).toBeVisible();

    await page.locator('button:has(svg.lucide-x)').click();

    await expect(page.getByRole('heading', { name: 'Welcome to YuvaHub' })).toHaveCount(0);
  });
});

test.describe('Authenticated session', () => {
  authTest('boots into the dashboard with the sidebar navigation for a persisted user', async ({ signedInPage }) => {
    await signedInPage.goto('/');

    await expect(signedInPage.getByRole('heading', { name: /Welcome back/ })).toBeVisible();
    await expect(signedInPage.getByRole('tab', { name: 'Dashboard' })).toHaveAttribute('aria-selected', 'true');
    await expect(signedInPage.getByRole('tab', { name: 'Opportunities' })).toBeVisible();
    await expect(signedInPage.getByRole('tab', { name: 'Bookmarks' })).toBeVisible();
    await expect(signedInPage.getByRole('tab', { name: 'Community Forum' })).toBeVisible();
    await expect(signedInPage.getByRole('tab', { name: 'AI Assistant' })).toBeVisible();
    await expect(signedInPage.getByRole('tab', { name: 'Admin Panel' })).toBeVisible();
    await expect(signedInPage.getByText(MOCK_NAME, { exact: true })).toBeVisible();
  });
});
