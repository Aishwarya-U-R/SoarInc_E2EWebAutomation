import config from "../playwright.config"; // Import the config file
import dotenv from "dotenv";
import { HomePage } from "../pages/HomePage";
import { RegistrationPage } from "../pages/UserRegistration";
import { BasketPage } from "../pages/BasketPage";
import { test } from "../fixtures/base";

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
