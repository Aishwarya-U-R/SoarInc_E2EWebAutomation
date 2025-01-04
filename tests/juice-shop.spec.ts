import { expect, Page } from "@playwright/test";
import config from "../playwright.config"; // Import the config file
import dotenv from "dotenv";
import { HomePage } from "../pages/HomePage";
import { RegistrationPage } from "../pages/UserRegistration";
import { test } from "../fixtures/base";

// let credentials = {
//   email: "",
//   password: "",
// };

test.describe("OWASP Juice Shop Tests", () => {
  let page: Page;
  dotenv.config();
  let homePage: HomePage;
  let regPage: RegistrationPage;

  // Use environment variables for default email and password
  const defaultEmail = process.env.DEFAULT_EMAIL;
  const defaultPassword = process.env.DEFAULT_PASSWORD;

  test.beforeEach(async ({ homePageFixture, registrationFixture }) => {
    homePage = homePageFixture;
    regPage = registrationFixture;
    await homePageFixture.goToHome();
    await homePageFixture.closeWelcomeBanner();
    await homePage.acceptCookie();
  });

  test.only("1. Verify Maximum Items Displayed on Homepage After Scrolling and Changing Items Per Page", async ({}) => {
    await homePage.scrollToEndOfPage();
    const totalItems = await homePage.getMaximumProductCount();
    let count = await homePage.selectMaxItemsPerPage();
    const selectedOption = await homePage.verifyLastOptionSelected(count);
    await homePage.verifyItemsDisplayed(totalItems, selectedOption);
  });

  test.only("2. Verify Product Popup and Review Expansion for Apple Juice", async ({}) => {
    const productName = "Apple Juice (1000ml)";

    const product = await homePage.locateProduct(productName);
    const imageSrc = await homePage.captureProductImage(product);
    await homePage.verifyPopupAppears(product);
    await homePage.extractPopupImageSrc(product, productName, imageSrc);

    const reviewCount = await homePage.extractReviewCount();
    await homePage.expandReviewsIfPresent(reviewCount);
    await homePage.closePopup();
  });

  test.only("3. Verify User Registration with Input Validations and Login to App", async ({}) => {
    const baseURL = config?.use?.baseURL as string;

    await regPage.goToLoginPage();

    await regPage.startRegistration();

    await test.step("[Assertion] Verify Email field validation", async () => {
      await regPage.verifyFieldValidation("textbox", "Email address field", "Please provide an email address.");
    });

    await test.step("[Assertion] Verify Password field validation", async () => {
      await regPage.verifyFieldValidation("textbox", "Field for the password", "Please provide a password.");
    });

    await test.step("[Assertion] Verify Password confirmation field validation", async () => {
      await regPage.verifyFieldValidation("textbox", "Field to confirm the password", "Please repeat your password.");
    });

    await test.step("[Assertion] Verify Security question dropdown validation", async () => {
      await regPage.verifyFieldValidation("combobox", "Selection list for the security question", "Please select a security question.");
    });

    await test.step("[Assertion] Verify Security question answer field validation", async () => {
      await regPage.verifyFieldValidation("textbox", "Field for the answer to the security question", "Please provide an answer to your security question.");
    });

    await regPage.enablePasswordAdvice();

    await regPage.verifyPasswordAdvice();

    const { email, password } = await regPage.generateFakeData();
    console.log("email is:" + email);
    console.log("password is:" + password);

    await regPage.fillRegistrationForm(email, password, "Soar Inc");

    await regPage.submitRegistration();

    await regPage.verifySuccessfulRegistration();

    await regPage.navigateAndLogin(email, password);

    await regPage.accountLogout(baseURL);

    regPage.setCredentials(email, password).then((credentials) => {
      console.log("email in test: " + credentials.email);
      console.log("password in test: " + credentials.password);
    });
  });

  // test("4. E2E Test: Product Addition, Cart Validation, Basket Operations, and Checkout Workflow", async ({}) => {
  //   const productNames = ["Apple Pomace", "Carrot Juice (1000ml)", "Green Smoothie", "Lemon Juice (500ml)", "Quince Juice (1000ml)"]; // Example product names
  //   const cardNumber = faker.number.int({ min: 1000000000000000, max: 9999999999999999 });
  //   const userName = faker.person.firstName();
  //   const mobileNumber = faker.number.int({ min: 1000000, max: 9999999999 });
  //   const priceMap = new Map<string, number>();

  //   const { email: emailToLogin, password: passwordToLogin } = getCredentials();
  //   const loginEmail = (emailToLogin || defaultEmail) as string;
  //   console.log("loginEmail is " + loginEmail);
  //   const loginPassword = (passwordToLogin || defaultPassword) as string;
  //   console.log("loginPassword is " + loginPassword);
  //   await navigateAndLogin(page, loginEmail, loginPassword);

  //   await homePage.selectMaxItemsPerPage();

  //   await test.step("[Assertion] Add products to the basket & verify success pop-up message", async () => {
  //     let basketCount = 1; // Start with basket count 1 and increment for each product

  //     // Iterate over the product names and add each one to the cart
  //     for (const productName of productNames) {
  //       await addProductToCartAndVerify(page, productName, basketCount, priceMap);
  //       basketCount++;
  //     }
  //   });

  //   console.log("Product prices:", priceMap);

  //   await test.step("Go to Basket", async () => {
  //     await expect(page.getByText(`Placed ${productNames[4]} into basket.`)).toBeHidden();
  //     await test.step("Go to Basket", async () => {
  //       await page.getByRole("button", { name: "Show the shopping cart" }).click();
  //       await page.waitForURL(/basket/);
  //     });
  //   });

  //   await verifyProductsInBasket(page, productNames);
  //   await verifyPricesInBasket(page, priceMap);

  //   let totalBasketPrice = await verifyTotalPriceInBasket(page, priceMap);

  //   totalBasketPrice = await incrementProductQuantityInBasket(page, productNames[0], priceMap, totalBasketPrice);
  //   totalBasketPrice = await incrementProductQuantityInBasket(page, productNames[1], priceMap, totalBasketPrice);
  //   totalBasketPrice = await incrementProductQuantityInBasket(page, productNames[2], priceMap, totalBasketPrice);

  //   totalBasketPrice = await deleteProductFromBasket(page, productNames[0], priceMap, totalBasketPrice);

  //   await test.step("Proceed to Checkout, fill out Address", async () => {
  //     await page.getByRole("button", { name: " Checkout" }).click({ force: true });
  //     await page.getByRole("button", { name: "Add a new address" }).click();
  //     await page.getByRole("textbox", { name: "Country" }).fill("Saudi Arabia");
  //     await page.getByRole("textbox", { name: "Name" }).fill(userName);
  //     await page.getByPlaceholder("Please provide a mobile number.").pressSequentially(String(mobileNumber));
  //     await page.getByRole("textbox", { name: "ZIP Code" }).fill("35419");
  //     await page.getByRole("textbox", { name: "Address" }).fill(faker.location.streetAddress());
  //     await page.getByRole("textbox", { name: "City" }).fill(faker.location.city());
  //     await page.getByRole("textbox", { name: "State" }).fill(faker.location.state());

  //     await page.getByRole("button", { name: "send Submit" }).click();
  //   });

  //   let radioButton = page.locator(".mat-radio-input");

  //   await test.step("Select Address & Proceed for Delivery selection", async () => {
  //     await radioButton.check({ force: true });
  //     await expect(radioButton).toBeChecked();

  //     await page.getByRole("button", { name: "Proceed to payment selection" }).click();
  //   });

  //   await test.step("Select Delivery method & Proceed for Payment selection", async () => {
  //     radioButton = page.locator("//mat-cell[contains(text(), 'Standard Delivery')]/preceding-sibling::mat-cell//input[@id='mat-radio-45-input']");
  //     await radioButton.check({ force: true });

  //     await page.getByRole("button", { name: "Proceed to delivery method selection" }).click();
  //   });

  //   await test.step("[Assertion] Verify Wallet Balance is 0.00", async () => {
  //     const walletBalance = page.locator("span.confirmation");
  //     await expect(walletBalance).toHaveText("0.00");
  //   });

  //   await test.step("Add Debit card for Payment", async () => {
  //     await page.getByText("Add a credit or debit card").click();
  //     await page.getByRole("textbox", { name: "Name" }).fill(userName);
  //     await page.getByLabel("Card Number").pressSequentially(String(cardNumber));

  //     const expiryMonth = page.getByLabel("Expiry Month");
  //     await expiryMonth.selectOption({ value: "1" });

  //     const expiryYear = page.getByLabel("Expiry Year");
  //     await expiryYear.selectOption({ value: "2080" });

  //     await page.getByRole("button", { name: "send Submit" }).click();
  //   });

  //   await test.step("Select the Debit card added and Proceed to Order Summary", async () => {
  //     const cardText = page.locator('.mat-simple-snack-bar-content:has-text("Your card ending with")');
  //     await expect(cardText).toHaveText(/Your card ending with \d{4} has been saved for your convenience./);

  //     radioButton = page.locator(".mat-radio-input");
  //     await radioButton.check({ force: true });

  //     await page.getByRole("button", { name: "Proceed to review" }).click();
  //     await page.waitForURL(/order-summary/);
  //   });

  //   await test.step("[Assertion] Verify Total price in Order Summary & Complete purchase", async () => {
  //     await page.waitForLoadState("load");
  //     await page.waitForTimeout(1000);
  //     const orderSummaryTotal = await page.locator("//td[text()='Total Price']/following-sibling::td[contains(@class, 'price')]").innerText();
  //     console.log("orderSummaryTotal is :" + orderSummaryTotal);
  //     let orderSummary = extractPrice(orderSummaryTotal, "Order Summary");
  //     expect(orderSummary).toBe(totalBasketPrice);

  //     await page.getByRole("button", { name: "Complete your purchase" }).click();

  //     await page.waitForURL(/order-completion/);
  //     await expect(page.getByText("Thank you for your purchase!")).toBeVisible();
  //   });

  //   await test.step("Extract Order ID from URL", async () => {
  //     const currentUrl = page.url();
  //     const orderIdMatch = currentUrl.match(/\/order-completion\/([a-z0-9-]+)/);

  //     // Check if the order ID is found
  //     if (orderIdMatch) {
  //       const orderId = orderIdMatch[1];
  //       console.log(`Order ID: ${orderId}`);
  //     } else {
  //       console.log("Order ID not found in URL.");
  //     }
  //   });
  // });

  // test.afterAll(async () => {
  //   // Close the browser after all tests
  //   await homePage.page.close();
  // });
});

async function addProductToCartAndVerify(page: Page, productName: string, basketCount: number, priceMap: Map<string, number>) {
  await test.step(`Locate product card for "${productName}", add it to basket and read its price`, async () => {
    const productCard = page.locator(`mat-card:has-text("${productName}")`);
    // Capture the price from the product card
    let priceText = await productCard.locator(".item-price span").innerText();

    // Use regex to extract only numbers (excluding currency symbols)
    const productPrice = extractPrice(priceText, productName);
    priceMap.set(productName, productPrice);

    // Find and click the "Add to Basket" button within the same mat-card
    const addToBasketButton = productCard.locator('button:has-text("Add to Basket")');
    await addToBasketButton.scrollIntoViewIfNeeded();
    await addToBasketButton.click();
  });

  await test.step(`[Assertion] Verify success message for adding ${productName} to basket`, async () => {
    await expect(page.getByText(`Placed ${productName} into basket.`)).toBeVisible();
  });

  await verifyBasketCount(page, basketCount);
}

async function verifyBasketCount(page: Page, expectedCount: number) {
  await test.step("Wait for basket count to be updated and verify", async () => {
    await page.waitForTimeout(200);

    const basketButton = page.getByRole("button", { name: "Show the shopping cart" });
    const basketCount = basketButton.locator("span.fa-layers-counter");

    // Get the current count from the cart button
    const countText = await basketCount.innerText();

    // Verify if the count has been updated correctly
    expect(parseInt(countText)).toBe(expectedCount);
  });
}

async function verifyProductsInBasket(page: Page, productNames: string[]) {
  await test.step("Iterate over the product names and check if each is present in the basket page", async () => {
    for (const productName of productNames) {
      const productCell = page.locator(`mat-cell:has-text("${productName}")`);
      await expect(productCell).toBeVisible();
    }
  });
}

async function verifyPricesInBasket(page: Page, priceMap: Map<string, number>) {
  await test.step("[Assertion] Verify Product price in Basket is same as price in Home page", async () => {
    const productRows = page.locator("mat-row");

    for (const row of await productRows.all()) {
      const productNameCell = row.locator("mat-cell.mat-column-product");
      const productName = await productNameCell.innerText();

      const priceCell = await row.locator("mat-cell.mat-column-price").innerText();
      const displayedPrice = extractPrice(priceCell, productName);
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
}

async function verifyTotalPriceInBasket(page: Page, priceMap: Map<string, number>) {
  let displayedTotalPrice = 0;
  await test.step("[Assertion] Sum up the prices from the priceMap and verify with Displayed Total", async () => {
    const totalSum = Array.from(priceMap.values()).reduce((sum, price) => sum + price, 0);

    const totalPriceText = await page.locator("#price").innerText();
    displayedTotalPrice = extractPrice(totalPriceText, "Total");
    expect(totalSum).toBe(displayedTotalPrice);
    console.log("Total Unit Price of products is:" + totalSum + ", DisplayedTotalPrice is:" + displayedTotalPrice);
  });
  return displayedTotalPrice;
}

function extractPrice(priceText: string, productName: string): number {
  // Extract numeric value from the price string, removing the currency symbol
  const priceMatch = priceText.match(/[\d.]+/);
  if (!priceMatch) {
    throw new Error(`Unable to extract ${productName} price`);
  }
  return parseFloat(priceMatch[0]);
}

async function incrementProductQuantityInBasket(page: Page, productName: string, priceMap: Map<string, number>, totalBasketPrice: number) {
  let displayedTotalPrice = 0,
    unitPrice = 0;
  await test.step(`[Assertion] Increment quantity for ${productName} and Verify Total price increases accordingly`, async () => {
    unitPrice = priceMap.get(productName.trim()) || 0;
    // console.log(`Product: ${productName}, unitPrice: ${unitPrice}`);

    const quantitySpan = page.locator(`//mat-cell[contains(@class, 'mat-column-product') and contains(text(), '${productName}')]/following-sibling::mat-cell[contains(@class, 'mat-column-quantity')]//span[not(@class)]`);
    const addButton = page.locator(`//mat-cell[contains(@class, 'mat-column-product') and contains(text(), '${productName}')]/following-sibling::mat-cell[contains(@class, 'mat-column-quantity')]/button/span//*[contains(@class, 'fa-plus-square')]/ancestor::button`);

    const currentQuantityText = await quantitySpan.innerText();
    let currentQuantity = parseInt(currentQuantityText.trim(), 10);
    await addButton.click();

    // Wait for the DOM update (needed)
    await page.waitForTimeout(1000);

    // Verify the quantity has been incremented
    const updatedQuantityText = await quantitySpan.innerText();
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
    const totalPriceText = await page.locator("#price").innerText();
    displayedTotalPrice = extractPrice(totalPriceText, "Total");
    expect(totalBasketPrice + unitPrice).toBe(displayedTotalPrice);
    console.log(`Successfully verified Total price ${displayedTotalPrice} aft adding one more unit from ${productName}`);
  });
  return displayedTotalPrice;
}

async function deleteProductFromBasket(page: Page, productName: string, priceMap: Map<string, number>, totalBasketPrice: number) {
  let displayedTotalPrice = 0;
  let unitPrice: number = 0;
  await test.step(`[Assertion] Remove product ${productName} from basket and Verify Total price decreases accordingly`, async () => {
    unitPrice = priceMap.get(productName.trim()) || 0;

    const quantitySpan = page.locator(`//mat-cell[contains(@class, 'mat-column-product') and contains(text(), '${productName}')]/following-sibling::mat-cell[contains(@class, 'mat-column-quantity')]//span[not(@class)]`);

    // Verify the quantity has been incremented
    const currentQuantityText = await quantitySpan.innerText();
    const currentQuantity = parseInt(currentQuantityText.trim(), 10);

    // Click the "trash" icon to remove item
    const deleteButton = page.locator(`//mat-cell[contains(@class, 'mat-column-product') and contains(text(), '${productName}')]/following-sibling::mat-cell[contains(@class, 'mat-column-remove')]`);
    await deleteButton.click();

    // // Wait for the DOM update (needed)
    await page.waitForTimeout(1000);

    // Get the displayed total price from the basket page
    const priceAfterItemRemoved = await page.locator("#price").innerText();
    displayedTotalPrice = extractPrice(priceAfterItemRemoved, "Total");
    let priceToReduce = currentQuantity * unitPrice;
    expect(totalBasketPrice - priceToReduce).toBeCloseTo(displayedTotalPrice, 2);

    console.log(`Successfully verified Total price ${displayedTotalPrice} aft removing ${productName}`);
  });
  return displayedTotalPrice;
}

// function getCredentials() {
//   return { email: credentials.email, password: credentials.password };
// }

// function setCredentials(email: string, password: string) {
//   credentials.email = email;
//   credentials.password = password;
//   console.log("Credentials set:", credentials);
// }
