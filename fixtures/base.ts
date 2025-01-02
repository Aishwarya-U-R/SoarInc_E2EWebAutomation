import { test as base, expect } from "@playwright/test";
import { HomePage } from "../pages/HomePage";

// Extend Playwright's test object with custom fixture
export const test = base.extend<{
  homePage: HomePage;
}>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
});

export { expect };
