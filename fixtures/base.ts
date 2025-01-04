import { test as base, expect } from "@playwright/test";
import { HomePage } from "../pages/HomePage";
import { RegistrationPage } from "../pages/UserRegistration";
import { BasketPage } from "../pages/BasketPage";

// Extend Playwright's test object with custom fixture
export const test = base.extend<{
  homePageFixture: HomePage;
  registrationFixture: RegistrationPage;
  basketFixture: BasketPage;
}>({
  homePageFixture: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  registrationFixture: async ({ page }, use) => {
    await use(new RegistrationPage(page));
  },
  basketFixture: async ({ page }, use) => {
    await use(new BasketPage(page));
  },
});

export { expect };
