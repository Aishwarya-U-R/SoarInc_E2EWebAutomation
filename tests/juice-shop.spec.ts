import { expect, Page } from "@playwright/test";
import config from "../playwright.config"; // Import the config file
import dotenv from "dotenv";
import { HomePage } from "../pages/HomePage";
import { RegistrationPage } from "../pages/UserRegistration";
import { BasketPage } from "../pages/BasketPage";
import { test } from "../fixtures/base";

// let credentials = {
//   email: "",
//   password: "",
// };

test.describe("OWASP Juice Shop Tests", () => {
  dotenv.config();
  let homePage: HomePage;
  let regPage: RegistrationPage;
  let basketPage: BasketPage;

  // Use environment variables for default email and password
  const defaultEmail = process.env.DEFAULT_EMAIL;
  const defaultPassword = process.env.DEFAULT_PASSWORD;

  test.beforeEach(async ({ homePageFixture, registrationFixture, basketFixture }) => {
    homePage = homePageFixture;
    regPage = registrationFixture;
    basketPage = basketFixture;
    await homePageFixture.goToHome();
    await homePageFixture.closeWelcomeBanner();
    await homePage.acceptCookie();
  });

  test("1. Verify Maximum Items Displayed on Homepage After Scrolling and Changing Items Per Page", async ({}) => {
    await homePage.scrollToEndOfPage();
    const totalItems = await homePage.getMaximumProductCount();
    let count = await homePage.selectMaxItemsPerPage();
    const selectedOption = await homePage.verifyLastOptionSelected(count);
    await homePage.verifyItemsDisplayed(totalItems, selectedOption);
  });

  test("2. Verify Product Popup and Review Expansion for Apple Juice", async ({}) => {
    const productName = "Apple Juice (1000ml)";

    const product = await homePage.locateProduct(productName);
    const imageSrc = await homePage.captureProductImage(product);
    await homePage.verifyPopupAppears(product);
    await homePage.extractPopupImageSrc(product, productName, imageSrc);

    const reviewCount = await homePage.extractReviewCount();
    await homePage.expandReviewsIfPresent(reviewCount);
    await homePage.closePopup();
  });

  test("3. Verify User Registration with Input Validations and Login to App", async ({}) => {
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

  test("4. E2E Test: Product Addition, Cart Validation, Basket Operations, and Checkout Workflow", async ({}) => {
    const productNames = ["Apple Pomace", "Carrot Juice (1000ml)", "Green Smoothie", "Lemon Juice (500ml)", "Quince Juice (1000ml)"]; // Example product names
    let priceMap = new Map<string, number>();

    const { email: emailToLogin, password: passwordToLogin } = await regPage.getCredentials();
    const loginEmail = (emailToLogin || defaultEmail) as string;
    console.log("loginEmail is " + loginEmail);
    const loginPassword = (passwordToLogin || defaultPassword) as string;
    console.log("loginPassword is " + loginPassword);

    await regPage.navigateAndLogin(loginEmail, loginPassword);
    await homePage.selectMaxItemsPerPage();

    await test.step("[Assertion] Add products to the basket & verify success pop-up message", async () => {
      let basketCount = 1; // Start with basket count 1 and increment for each product
      for (const productName of productNames) {
        priceMap = await basketPage.addProductToCartAndVerify(productName, basketCount, priceMap);
        basketCount++;
      }
    });

    console.log("Product prices:", priceMap);

    await basketPage.goToBasket(productNames[4]);

    await basketPage.verifyProductsInBasket(productNames);
    await basketPage.verifyPricesInBasket(priceMap);

    let totalBasketPrice = await basketPage.verifyTotalPriceInBasket(priceMap);

    // increment some products
    totalBasketPrice = await basketPage.incrementProductQuantityInBasket(productNames[0], priceMap, totalBasketPrice);
    totalBasketPrice = await basketPage.incrementProductQuantityInBasket(productNames[1], priceMap, totalBasketPrice);
    totalBasketPrice = await basketPage.incrementProductQuantityInBasket(productNames[2], priceMap, totalBasketPrice);

    // Delete a product
    totalBasketPrice = await basketPage.deleteProductFromBasket(productNames[0], priceMap, totalBasketPrice);
    console.log("displayedTotalPric aft delete operations :" + totalBasketPrice);
    await basketPage.proceedToCheckoutAndFillAddress();

    await basketPage.selectAddressAndProceedToDeliverySelection();
    await basketPage.selectDeliveryMethodAndProceedToPayment();
    await basketPage.verifyWalletBalance();

    await basketPage.addDebitCardForPayment();

    await basketPage.selectDebitCardAndProceedToReview();

    await basketPage.verifyTotalPriceInOrderSummary(totalBasketPrice);
    await basketPage.completePurchase();

    const orderId = await basketPage.extractOrderIdFromUrl();
    console.log(`Order ID: ${orderId}`);
  });
});

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
