import { Page, Locator, test, expect } from "@playwright/test";
import { faker } from "@faker-js/faker"; // Importing Faker

type PageAction<T extends any[] = any[], R = any> = (...params: T) => Promise<R>;

interface BasketPagePOM {
  addProductToCartAndVerify: PageAction<[string, number, Map<string, number>], Map<string, number>>;
  goToBasket: PageAction;
  verifyProductsInBasket: PageAction<[string[]], void>;
  verifyPricesInBasket: PageAction<[Map<string, number>], void>;
  verifyTotalPriceInBasket: PageAction<[Map<string, number>], number>;
  //   incrementProductQuantityInBasket: PageAction<string, void>;
  //   deleteProductFromBasket: PageAction<string, void>;
  //   fillOutAddress: PageAction<[string, string], void>;
  //   proceedToPayment: PageAction<void, void>;
  //   addCreditCard: PageAction<[string, string], void>;
  //   completePurchase: PageAction<void, void>;
  //   extractOrderIdFromUrl: PageAction<void, string | null>;
}

interface PaymentInfo {
  cardNumber: string;
  userName: string;
  mobileNumber: string;
}

export class BasketPage implements BasketPagePOM {
  readonly page: Page;

  // Locators as instances of `Locator` with `private readonly` modifier
  private readonly addToCartButton: Locator;
  private readonly cartIcon: Locator;
  private readonly checkoutButton: Locator;
  private readonly productLocator: Locator;
  private readonly productPrice: Locator;
  private readonly deleteProductButton: Locator;
  private readonly quantityInput: Locator;
  private readonly addressField: Locator;
  private readonly nameField: Locator;
  private readonly mobileField: Locator;
  private readonly submitAddressButton: Locator;
  private readonly creditCardInput: Locator;
  private readonly completePurchaseButton: Locator;
  private readonly productCard: (productName: string) => Locator;
  private readonly addtoBasket: string;
  private readonly itemPrice: string;
  private readonly itemInBasket: (productName: string) => Locator;
  private readonly basketCount: Locator;
  private readonly showShoppingCart: Locator;
  private readonly productCell: (productName: string) => Locator;
  private readonly productRows: Locator;
  private readonly productCellName: string;
  private readonly priceCell: string;
  private readonly totalPriceText: Locator;
  private readonly quantitySpan: (productName: string) => Locator;
  private readonly addButton: (productName: string) => Locator;
  private readonly deleteButton: (productName: string) => Locator;

  constructor(page: Page) {
    this.page = page;

    // Initializing the locators
    this.addToCartButton = this.page.locator("button.add-to-cart");
    this.cartIcon = this.page.locator("button.cart-icon");
    this.checkoutButton = this.page.locator("button.checkout");
    this.productLocator = this.page.locator("div.product");
    this.productPrice = this.page.locator("span.product-price");
    this.deleteProductButton = this.page.locator("button.delete-product");
    this.quantityInput = this.page.locator("input.quantity");
    this.addressField = this.page.locator("input.address");
    this.nameField = this.page.locator("input.name");
    this.mobileField = this.page.locator("input.mobile");
    this.submitAddressButton = this.page.locator("button.submit-address");
    this.creditCardInput = this.page.locator("input.credit-card");
    this.completePurchaseButton = this.page.locator("button.complete-purchase");
    this.productCard = (productName) => this.page.locator(`mat-card:has-text('${productName}')`);
    this.addtoBasket = 'button:has-text("Add to Basket")';
    this.itemPrice = ".item-price span";
    this.itemInBasket = (productName) => this.page.getByText(`Placed ${productName} into basket.`);
    this.showShoppingCart = this.page.getByRole("button", { name: "Show the shopping cart" });
    this.basketCount = this.showShoppingCart.locator("span.fa-layers-counter");
    this.productCell = (productName) => this.page.locator(`mat-cell:has-text("${productName}")`);
    this.productRows = this.page.locator("mat-row");
    this.productCellName = "mat-cell.mat-column-product";
    this.priceCell = "mat-cell.mat-column-price";
    this.totalPriceText = this.page.locator("#price");
    this.quantitySpan = (productName) => page.locator(`//mat-cell[contains(@class, 'mat-column-product') and contains(text(), '${productName}')]/following-sibling::mat-cell[contains(@class, 'mat-column-quantity')]//span[not(@class)]`);
    this.addButton = (productName) => page.locator(`//mat-cell[contains(@class, 'mat-column-product') and contains(text(), '${productName}')]/following-sibling::mat-cell[contains(@class, 'mat-column-quantity')]/button/span//*[contains(@class, 'fa-plus-square')]/ancestor::button`);
    this.deleteButton = (productName) => page.locator(`//mat-cell[contains(@class, 'mat-column-product') and contains(text(), '${productName}')]/following-sibling::mat-cell[contains(@class, 'mat-column-remove')]`);
  }

  // Add product to cart and verify success
  addProductToCartAndVerify = async (productName: string, basketCount: number, priceMap: Map<string, number>): Promise<Map<string, number>> => {
    await test.step(`Locate product card for "${productName}", add it to basket and read its price`, async () => {
      let priceText = await this.productCard(productName).locator(this.itemPrice).innerText();

      // Use regex to extract only numbers (excluding currency symbols)
      const productPrice = this.extractPrice(priceText, productName);
      priceMap.set(productName, productPrice);

      // Find and click the "Add to Basket" button within the same mat-card
      const addToBasketButton = this.productCard(productName).locator(this.addtoBasket);
      await addToBasketButton.scrollIntoViewIfNeeded();
      await addToBasketButton.click();
    });

    await test.step(`[Assertion] Verify success message for adding ${productName} to basket`, async () => {
      await expect(this.itemInBasket(productName)).toBeVisible();
    });

    await this.verifyBasketCount(basketCount);
    return priceMap;
  };

  private verifyBasketCount = async (expectedCount: number) => {
    await test.step("Wait for basket count to be updated and verify", async () => {
      await this.page.waitForTimeout(500);
      // Get the current count from the cart button
      const countText = await this.basketCount.innerText();

      // Verify if the count has been updated correctly
      expect(parseInt(countText)).toBe(expectedCount);
    });
  };

  goToBasket = async (productName: string) => {
    await test.step("Go to Basket", async () => {
      await expect(this.itemInBasket(productName)).toBeHidden();
      await this.showShoppingCart.click();
      await this.page.waitForURL(/basket/);
    });
  };

  verifyProductsInBasket = async (productNames: string[]): Promise<void> => {
    await test.step("Verify products are present in the basket", async () => {
      for (const productName of productNames) {
        await expect(this.productCell(productName)).toBeVisible();
      }
    });
  };

  verifyPricesInBasket = async (priceMap: Map<string, number>): Promise<void> => {
    await test.step("[Assertion] Verify Product price in Basket is same as price in Home page", async () => {
      for (const row of await this.productRows.all()) {
        const productName = await row.locator(this.productCellName).innerText();
        const priceCell = await row.locator(this.priceCell).innerText();
        const displayedPrice = this.extractPrice(priceCell, productName);
        if (displayedPrice) {
          const expectedPrice = priceMap.get(productName.trim());
          if (expectedPrice !== undefined) {
            expect(displayedPrice).toBe(expectedPrice);
            console.log("ExpectedPrice is:" + expectedPrice + ", Displayed price is:" + displayedPrice + " for product:" + productName.trim());
          } else {
            throw new Error(`Price for ${productName} not found in priceMap`);
          }
        }
      }
    });
  };

  verifyTotalPriceInBasket = async (priceMap: Map<string, number>): Promise<number> => {
    let displayedTotalPrice = 0;
    await test.step("[Assertion] Sum up the prices from the priceMap and verify with Displayed Total", async () => {
      const totalSum = Array.from(priceMap.values()).reduce((sum, price) => sum + price, 0);

      displayedTotalPrice = this.extractPrice(await this.totalPrice, "Total");
      expect(totalSum).toBe(displayedTotalPrice);
      console.log("Total Unit Price of products is:" + totalSum + ", DisplayedTotalPrice is:" + displayedTotalPrice);
    });
    return displayedTotalPrice;
  };

  get totalPrice(): Promise<string> {
    return this.totalPriceText.innerText();
  }

  incrementProductQuantityInBasket = async (productName: string, priceMap: Map<string, number>, totalBasketPrice: number) => {
    let displayedTotalPrice = 0,
      unitPrice = 0;
    await test.step(`[Assertion] Increment quantity for ${productName} and Verify Total price increases accordingly`, async () => {
      unitPrice = priceMap.get(productName.trim()) || 0;

      const currentQuantityText = await this.quantitySpan(productName).innerText();
      let currentQuantity = parseInt(currentQuantityText.trim(), 10);
      await this.addButton(productName).click();

      // Wait for the DOM update (needed)
      await this.page.waitForTimeout(1000);

      // Verify the quantity has been incremented
      const updatedQuantityText = await this.quantitySpan(productName).innerText();
      const updatedQuantity = parseInt(updatedQuantityText.trim(), 10);

      // Assert that the quantity has been incremented by 1
      if (updatedQuantity !== currentQuantity + 1) {
        throw new Error(`Quantity for ${productName} did not increment correctly. Expected ${currentQuantity + 1}, but got ${updatedQuantity}`);
      }
      console.log(`Successfully incremented quantity for ${productName} to ${updatedQuantity}`);

      //Due to bug
      // // Verify that the price has been updated based on the new quantity
      // const updatedPriceText = extractPrice(priceCell, productName);

      // // Calculate the expected price based on the updated quantity
      // const expectedUpdatedTotalPrice = unitPrice * updatedQuantity;

      // // Log the updated state for reference
      // console.log(`Product: ${productName}, Updated Quantity: ${updatedQuantity}, Updated Price: ${updatedPriceText}, Expected Updated Total Price: ${expectedUpdatedTotalPrice}`);

      // // Assert that the displayed price matches the expected price based on the updated quantity
      // if (updatedPriceText !== expectedUpdatedTotalPrice) {
      //   throw new Error(`Price for ${productName} did not update correctly. Expected ${expectedUpdatedTotalPrice}, but got ${updatedPriceText}`);
      // }

      // Get the displayed total price from the basket page
      displayedTotalPrice = this.extractPrice(await this.totalPrice, "Total");
      expect(totalBasketPrice + unitPrice).toBe(displayedTotalPrice);
      console.log(`Successfully verified Total price ${displayedTotalPrice} aft adding one more unit from ${productName}`);
    });
    return displayedTotalPrice;
  };

  deleteProductFromBasket = async (productName: string, priceMap: Map<string, number>, totalBasketPrice: number) => {
    let displayedTotalPrice = 0;
    let unitPrice: number = 0;
    await test.step(`[Assertion] Remove product ${productName} from basket and Verify Total price decreases accordingly`, async () => {
      unitPrice = priceMap.get(productName.trim()) || 0;
      const currentQuantityText = await this.quantitySpan(productName).innerText();
      const currentQuantity = parseInt(currentQuantityText.trim(), 10);

      // Click the "trash" icon to remove item
      await this.deleteButton(productName).click();

      // // Wait for the DOM update (needed)
      await this.page.waitForTimeout(1000);

      // Get the displayed total price from the basket page
      displayedTotalPrice = this.extractPrice(await this.totalPrice, "Total");
      let priceToReduce = currentQuantity * unitPrice;
      expect(totalBasketPrice - priceToReduce).toBeCloseTo(displayedTotalPrice, 2);

      console.log(`Successfully verified Total price ${displayedTotalPrice} aft removing ${productName}`);
    });
    return displayedTotalPrice;
  };

  //   // Fill out address information during checkout
  //   fillOutAddress = async (userName: string, mobileNumber: string): Promise<void> => {
  //     return await test.step("Fill out the address form", async () => {
  //       await this.addressField.fill("123 Fake Street");
  //       await this.nameField.fill(userName);
  //       await this.mobileField.fill(mobileNumber);
  //       await this.submitAddressButton.click();
  //     });

  //   Proceed to payment step
  //   proceedToPayment = async (): Promise<void> => {
  //     return await test.step("Proceed to payment", async () => {
  //       await this.checkoutButton.click();
  //     });
  //   };

  //   Add a credit card for payment
  //   addCreditCard = async (cardNumber: string, userName: string): Promise<void> => {
  //     return await test.step("Add a credit card", async () => {
  //       await this.creditCardInput.fill(cardNumber);
  //       console.log(`Added credit card: ${cardNumber} for user ${userName}`);
  //     });
  //   };

  //   Complete the purchase
  //   completePurchase = async (): Promise<void> => {
  //     return await test.step("Complete the purchase", async () => {
  //       await this.completePurchaseButton.click();
  //     });
  //   };

  //   Extract the Order ID from the URL after completing the purchase
  //   extractOrderIdFromUrl = async (): Promise<string | null> => {
  //     return await test.step("Extract order ID from URL", async () => {
  //       const currentUrl = this.page.url();
  //       const orderIdMatch = currentUrl.match(/\/order-completion\/([a-z0-9-]+)/);
  //       if (orderIdMatch) {
  //         return orderIdMatch[1];
  //       }
  //       console.log("Order ID not found in URL.");
  //       return null;
  //     });

  generateFakeData = async (): Promise<PaymentInfo> => {
    const cardNumber = faker.number.int({ min: 1000000000000000, max: 9999999999999999 }).toString();
    const userName = faker.person.firstName();
    const mobileNumber = faker.number.int({ min: 1000000, max: 9999999999 }).toString();

    return { cardNumber, userName, mobileNumber };
  };

  extractPrice = (priceText: string, productName: string): number => {
    // Extract numeric value from the price string, removing the currency symbol
    const priceMatch = priceText.match(/[\d.]+/);
    if (!priceMatch) {
      throw new Error(`Unable to extract ${productName} price`);
    }
    return parseFloat(priceMatch[0]);
  };
}
