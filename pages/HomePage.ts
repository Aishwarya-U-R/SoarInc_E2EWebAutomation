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

  locateProduct: PageAction<string, Locator>;
  captureProductImage: PageAction<Locator, string>;
  verifyPopupAppears: PageAction<Locator>;
  extractPopupImageSrc: PageAction;
  extractReviewCount: PageAction<number>;
  expandReviewsIfPresent: PageAction<number>;
  closePopup: PageAction;
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
  private readonly productPopup: Locator;
  private readonly reviewsTitle: Locator;
  private readonly reviewsPanel: Locator;
  private readonly closePopupBtn: Locator;
  private readonly fruitTile: (fruitName: string) => string;
  private readonly fruitImage: string;
  private readonly reviewExpand: string;

  constructor(page: Page) {
    this.page = page;

    // Selectors
    this.closeWelcomeBannerBtn = 'button[aria-label="Close Welcome Banner"]';
    this.cookieMessageBtn = 'a[aria-label="dismiss cookie message"]';
    this.paginationContainer = page.locator(".mat-paginator-container");
    this.paginatorRangeLabel = page.locator(".mat-paginator-range-label");
    this.itemsPerPageComboBox = page.locator("role=combobox[name='Items per page:']");
    this.pageCountOptions = page.locator("mat-option .mat-option-text");
    this.matCards = page.locator(".mat-card");
    this.itemsPerPageLabel = page.locator(".mat-paginator-page-size-label");
    this.productPopup = page.locator("mat-dialog-content");
    this.reviewsTitle = page.locator('mat-panel-title:has-text("Reviews")');
    this.reviewsPanel = page.locator('mat-expansion-panel-header:has-text("Reviews")');
    this.closePopupBtn = page.getByRole("button", { name: "Close Dialog" });
    this.fruitTile = (fruitName: string) => `div.mat-tooltip-trigger:has-text('${fruitName}')`;
    this.fruitImage = "img.mat-card-image";
    this.reviewExpand = ".mat-expanded";
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
        const welcomeBanner = await this.page.waitForSelector(this.closeWelcomeBannerBtn, { state: "visible", timeout: 10000 });
        if (welcomeBanner) {
          await welcomeBanner.click({ force: true });
          console.log("Welcome Banner clicked");
        }
      } catch (err) {
        console.log("Welcome Banner was not present");
      }
    });
  };

  acceptCookie = async () => {
    await test.step("Accept cookies if visible", async () => {
      try {
        const cookieButton = await this.page.waitForSelector(this.cookieMessageBtn, { state: "visible", timeout: 10000 });
        if (cookieButton) {
          await cookieButton.click({ force: true });
          console.log("Cookie consent clicked");
        }
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

  locateProduct: PageAction<string, Locator> = async (productName: string): Promise<Locator> => {
    return await test.step(`Locate the product '${productName}'`, async () => {
      const product = this.page.locator(this.fruitTile(productName));
      await product.waitFor({ state: "visible" });
      return product;
    });
  };

  captureProductImage = async (product: Locator): Promise<string> => {
    return await test.step("Capture the image source of the product", async () => {
      const imageSrc = await product.locator(this.fruitImage).getAttribute("src");
      if (!imageSrc) throw new Error("Image source not found");
      return imageSrc;
    });
  };

  verifyPopupAppears: PageAction<Locator> = async (product: Locator): Promise<void> => {
    await test.step("[Assertion] Click on the product to open the popup and verify it appears", async () => {
      await product.click();
      await expect(this.productPopup).toBeVisible();
    });
  };

  extractPopupImageSrc = async (product: Locator, productName: string, homePageImageSrc: string) => {
    await test.step("[Assertion] Extract the image source from the popup and verify", async () => {
      const popupImageSrc = await product.getByAltText(productName).getAttribute("src");
      if (!popupImageSrc) throw new Error("Popup image source not found");
      expect(homePageImageSrc).toEqual(popupImageSrc);
    });
  };

  extractReviewCount: PageAction<number> = async (): Promise<number> => {
    return await test.step("Extract the review count", async () => {
      const reviewText = await this.reviewsTitle.innerText();
      const reviewCount = parseInt(reviewText.match(/\((\d+)\)/)?.[1] || "0");
      return reviewCount;
    });
  };

  expandReviewsIfPresent: PageAction<number> = async (reviewCount: number): Promise<void> => {
    await test.step("Expand the review section if review count is greater than 0", async () => {
      if (reviewCount > 0) {
        await this.reviewsPanel.click();
        const expandedReview = await this.page.waitForSelector(this.reviewExpand);
        expect(expandedReview).not.toBeNull(); // Ensuring the element is found and visible
      }
    });
  };

  closePopup: PageAction = async (): Promise<void> => {
    await test.step("Close the popup", async () => {
      await this.closePopupBtn.click();
    });
  };
}
