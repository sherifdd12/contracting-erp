const { test, expect } = require('@playwright/test');

test.describe('Login Page', () => {
  test('should display login form', async ({ page }) => {
    // Navigate to the login page
    await page.goto('/login');

    // Check for the page title
    await expect(page).toHaveTitle(/Login/);

    // Check for the username input
    const usernameInput = page.getByPlaceholder('Username');
    await expect(usernameInput).toBeVisible();

    // Check for the password input
    const passwordInput = page.getByPlaceholder('Password');
    await expect(passwordInput).toBeVisible();

    // Check for the login button
    const loginButton = page.getByRole('button', { name: 'Login' });
    await expect(loginButton).toBeVisible();
  });
});
