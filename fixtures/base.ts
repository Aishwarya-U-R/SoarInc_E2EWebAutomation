import { test as base, expect } from "@playwright/test";
import { HomePage } from "../pages/HomePage";
import { RegistrationPage } from "../pages/UserRegistration";

// Extend Playwright's test object with custom fixture
export const test = base.extend<{
  homePageFixture: HomePage;
  registrationFixture: RegistrationPage;
}>({
  homePageFixture: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  registrationFixture: async ({ page }, use) => {
    await use(new RegistrationPage(page));
  },
});

export { expect };
