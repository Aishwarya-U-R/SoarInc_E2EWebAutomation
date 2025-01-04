import { Locator, Page } from "playwright";
import { expect, test } from "playwright/test";

type PageAction<T = any, R = any> = (...params: T[]) => Promise<R>;

export interface HomePagePOM {
  goToHome: PageAction;
  closeWelcomeBanner: PageAction;
  acceptCookie: PageAction;
  scrollToEndOfPage: PageAction;
  verifyLastOptionSelected: PageAction;
  verifyItemsDisplayed: PageAction;
}

export class HomePage implements HomePagePOM {
  readonly page: Page;
  private readonly closeWelcomeBannerBtn: string;
  private readonly cookieMessageBtn: string;
  private readonly paginationContainer: Locator;
  private readonly paginatorRangeLabel: Locator;
  private readonly itemsPerPageComboBox: Locator;
  private readonly pageCountOptions: Locator;
  private readonly matCards: Locator;
  private readonly itemsPerPageLabel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.closeWelcomeBannerBtn = 'button[aria-label="Close Welcome Banner"]';
    this.cookieMessageBtn = 'a[aria-label="dismiss cookie message"]';
    this.paginationContainer = page.locator(".mat-paginator-container");
    this.paginatorRangeLabel = page.locator(".mat-paginator-range-label");
    this.itemsPerPageComboBox = page.locator("role=combobox[name='Items per page:']");
    this.pageCountOptions = page.locator("mat-option .mat-option-text");
    this.matCards = page.locator(".mat-card");
    this.itemsPerPageLabel = page.locator(".mat-paginator-page-size-label");
  }

  goToHome: PageAction = async () => {
    await this.page.goto("/", { waitUntil: "load" });
    const title = await this.page.title();
    expect(title).toContain("OWASP Juice Shop");
    await this.page.waitForLoadState("domcontentloaded");
  };

  closeWelcomeBanner = async () => {
    test.step("Close the welcome banner if visible", async () => {
      try {
        const welcomeBanner = await this.page.waitForSelector(this.closeWelcomeBannerBtn, { state: "visible", timeout: 5000 });
        if (welcomeBanner) await welcomeBanner.click();
        console.log("Welcome Banner clicked");
      } catch (err) {
        console.log("Welcome Banner was not present");
      }
    });
  };

  acceptCookie = async () => {
    await test.step("Accept cookies if visible", async () => {
      try {
        const cookieButton = await this.page.waitForSelector(this.cookieMessageBtn, { state: "visible", timeout: 5000 });
        if (cookieButton) await cookieButton.click();
        console.log("Cookie consent clicked");
      } catch (err) {
        console.log("Cookie consent was not present");
      }
    });
  };

  scrollToEndOfPage = async (): Promise<void> => {
    test.step("Scroll down to the end of the page", async () => {
      // await this.page.evaluate(() => {
      //   const element = document.querySelector(".mat-paginator-container");
      //   if (element) element.scrollIntoView({ behavior: "smooth", block: "center" });
      // });
      await this.scrollIntoView(this.paginationContainer);
    });
  };

  scrollIntoView = async (element: Locator): Promise<void> => {
    await test.step("Scroll element into view", async () => {
      try {
        await this.page.waitForLoadState("domcontentloaded");
        await element.waitFor({ state: "attached" });
        await element.waitFor({ state: "visible" });
        await element.scrollIntoViewIfNeeded();
        await this.page.waitForTimeout(500);
      } catch (error) {
        throw new Error(`Failed to scroll element into view: ${error}`);
      }
    });
  };

  getMaximumProductCount = async (): Promise<number> => {
    return await test.step("Get the maximum products count", async () => {
      await this.paginatorRangeLabel.waitFor({ state: "attached" });
      await this.page.waitForFunction((selector) => document.querySelector(selector)?.textContent?.trim() !== "0 of 0", ".mat-paginator-range-label");

      // Execute a scroll to bring the element into view using JavaScript
      await this.page.evaluate(() => {
        const element = document.querySelector(".mat-paginator-range-label");
        if (element) element.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      await this.scrollIntoView(this.paginatorRangeLabel);

      const rangeText = await this.paginatorRangeLabel.textContent();
      const cleanedText = rangeText?.replace(/\s+/g, " ").trim();
      const parts = cleanedText?.split(" ");
      const totalItems = parseInt(parts?.[parts.length - 1] || "0");
      return totalItems;
    });
  };

  selectMaxItemsPerPage = async (): Promise<number> => {
    let count = 0;
    await test.step("Select the maximum option (last) in the 'Items per page' dropdown", async () => {
      await this.itemsPerPageComboBox.waitFor({ state: "attached" });
      await this.itemsPerPageComboBox.waitFor({ state: "visible" });
      await this.itemsPerPageComboBox.click({ force: true });
      count = await this.pageCountOptions.count();
      await this.scrollIntoView(this.itemsPerPageLabel);
      await this.pageCountOptions.nth(count - 1).click();
    });
    return count;
  };

  verifyLastOptionSelected = async (count: number): Promise<string> => {
    return await test.step("[Assertion] Verify that the last option is selected", async () => {
      const selectedOption = await this.itemsPerPageComboBox.textContent();
      const lastOptionText = await this.pageCountOptions.nth(count - 1).textContent();
      expect(selectedOption?.trim()).toBe(lastOptionText?.trim());
      await this.page.waitForLoadState("domcontentloaded");
      return selectedOption || "";
    });
  };

  verifyItemsDisplayed = async (totalItems: number, selectedOption: string): Promise<void> => {
    await test.step(`[Assertion] Verify that ${totalItems} items are displayed after selecting ${selectedOption} items per page`, async () => {
      const cardCount = await this.matCards.count();
      expect(cardCount).toBe(totalItems);
    });
  };
}
