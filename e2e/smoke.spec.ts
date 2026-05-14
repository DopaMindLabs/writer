import { test, expect } from '@playwright/test';
import { reseedAndGoHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('home page renders heading and primary actions', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /LIpsum/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Start a new space/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /About/i })).toBeVisible();
});

test('navigates to About and back home', async ({ page }) => {
  await page.getByRole('link', { name: /About/i }).first().click();
  await expect(page.getByRole('heading', { name: 'Hi,' })).toBeVisible();
  await page.getByRole('link', { name: /back/i }).click();
  await expect(page.getByRole('heading', { name: /LIpsum/i })).toBeVisible();
});

test('navigates to Templates from home', async ({ page }) => {
  await page.getByRole('link', { name: /Start a new space/i }).click();
  await expect(page.getByRole('heading', { name: /What kind of space/i })).toBeVisible();
  await expect(page.locator('#space-name')).toBeVisible();
  await expect(page.locator('#space-tag')).toBeVisible();
});

test('unknown route renders 404 screen', async ({ page }) => {
  await page.goto('/#/this-route-does-not-exist');
  await expect(page.getByText('404')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Lost in the margins/i })).toBeVisible();
  await page.getByRole('link', { name: /Go home/i }).click();
  await expect(page.getByRole('heading', { name: /LIpsum/i })).toBeVisible();
});
