import { test, expect, Page } from "@playwright/test";
import { faker, tr } from "@faker-js/faker"; // Importing Faker

test.describe("OWASP Juice Shop Tests", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();

    // Navigate to the page
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    // Verify that the title contains "OWASP Juice Shop"
    const title = await page.title();
    expect(title).toContain("OWASP Juice Shop");

    const welcomeBannerButton = page.getByRole("button", { name: "Close Welcome Banner" });
    const cookieMessageButton = page.getByRole("button", { name: "dismiss cookie message" });

    // Close the welcome banner if visible
    if (await welcomeBannerButton.isVisible({ timeout: 10000 })) {
      await welcomeBannerButton.click();
    }

    // Accept cookies if visible
    if (await cookieMessageButton.isVisible({ timeout: 10000 })) {
      await cookieMessageButton.click();
    }
  });

  test("1. Verify Maximum Items Displayed on Homepage After Scrolling and Changing Items Per Page", async ({}) => {
    //test.slow();
    let itemsPerPageComboBox: any,
      options: any,
      count: any,
      selectedOption: any,
      totalItems = 0;

    await test.step(" Scroll down to the end of the page", async () => {
      await page.locator(".mat-paginator-container").scrollIntoViewIfNeeded();
    });

    await test.step("Get the maximum products count", async () => {
      const rangeLabel = page.locator(".mat-paginator-range-label");
      const rangeText = await rangeLabel.textContent();
      const cleanedText = rangeText?.replace(/\s+/g, " ").trim();
      const parts = cleanedText?.split(" ");
      // The last part of the string will contain the total count
      totalItems = parseInt(parts?.[parts.length - 1] || "0");
    });

    await test.step("Click the 'Items per page' dropdown", async () => {
      itemsPerPageComboBox = page.getByRole("combobox", { name: "Items per page:" });
      await itemsPerPageComboBox.click();
    });

    await test.step("Count options in the 'Items per page' dropdown", async () => {
      options = page.locator("mat-option .mat-option-text");
      count = await options.count();
    });

    await test.step(`Select the maximum option (last) in the 'Items per page' dropdown`, async () => {
      await page.locator(".mat-paginator-page-size-label").scrollIntoViewIfNeeded();
      await options.nth(count - 1).click();
    });

    await test.step("[Assertion] Verify that the last option is selected", async () => {
      selectedOption = await itemsPerPageComboBox.textContent();
      const lastOptionText = await options.nth(count - 1).textContent();
      expect(selectedOption?.trim()).toBe(lastOptionText?.trim());
      await page.waitForLoadState("load");
    });

    await test.step(`[Assertion] Verify that ${totalItems} items are displayed after selecting ${selectedOption} items per page`, async () => {
      const matCards = page.locator(".mat-card");
      const cardCount = await matCards.count();
      expect(cardCount).toBe(totalItems);
    });
  });

  test("2. Verify Product Popup and Review Expansion for Apple Juice", async ({}) => {
    let fruitName = "Apple Juice (1000ml)"; //"Apple Pomace" for testing
    let product: any,
      imageSrc: any,
      popUpImageSrc: any,
      reviewCount = 0;

    await test.step("Locate the product based on fruit name", async () => {
      product = page.locator(`div.mat-tooltip-trigger:has-text('${fruitName}')`);
    });

    await test.step("Capture the image source of the product", async () => {
      imageSrc = await product.locator("img.mat-card-image").getAttribute("src");
    });

    await test.step("[Assertion] Click on the product to open the popup & Verify pop-up appears", async () => {
      await product.click();
      const popup = page.locator("mat-dialog-content");
      await expect(popup).toBeVisible();
    });

    // Step 5: Extract the image source from the popup
    await test.step("[Assertion] Extract the image source from the popup & Verify", async () => {
      popUpImageSrc = await product.getByAltText(`${fruitName}`).getAttribute("src");
      console.log("Image Source:", popUpImageSrc);
      expect(imageSrc).toEqual(popUpImageSrc);
    });

    await test.step("Extract the review count", async () => {
      const reviewText = await page.locator('mat-panel-title:has-text("Reviews")').innerText();
      reviewCount = parseInt(reviewText.match(/\((\d+)\)/)?.[1] || "0");
    });

    await test.step("Expand the review section if review count is greater than 0", async () => {
      if (reviewCount > 0) {
        await page.locator('mat-expansion-panel-header:has-text("Reviews")').click();
        await page.waitForSelector(".mat-expanded");
      }
    });

    await test.step("Close the popup", async () => {
      await page.getByRole("button", { name: "Close Dialog" }).click();
    });
  });

  test("3. Verify User Registration with Input Validations and  Login to App", async ({}) => {
    await test.step("Go to login page", async () => {
      await page.getByRole("button", { name: "Show/hide account menu" }).click();
      await page.getByRole("menuitem", { name: "Go to login page" }).click();
    });

    await test.step("Register new user", async () => {
      await page.getByText("Not yet a customer?").click();
      await page.waitForLoadState();
    });

    await test.step("[Assertion] Verify Email field validations", async () => {
      await verifyFieldValidation(page, "textbox", "Email address field", "Please provide an email address.");
    });

    await test.step("[Assertion] Verify Password field validations", async () => {
      await verifyFieldValidation(page, "textbox", "Field for the password", "Please provide a password.");
    });

    await test.step("[Assertion] Verify Password confirmation field validations", async () => {
      await verifyFieldValidation(page, "textbox", "Field to confirm the password", "Please repeat your password.");
    });

    await test.step("[Assertion] Verify Security question dropdown validations", async () => {
      await verifyFieldValidation(page, "combobox", "Selection list for the security question", "Please select a security question.");
    });

    await test.step("[Assertion] Verify Security question answer field validations", async () => {
      await verifyFieldValidation(page, "textbox", "Field for the answer to the security question", "Please provide an answer to your security question.");
    });

    await test.step("Show Password Advice", async () => {
      const toggle = page.locator('span.mat-slide-toggle-bar input[type="checkbox"]');
      // Check if the toggle is off and click to turn it on
      if ((await toggle.isChecked()) === false) {
        await toggle.check({ force: true });
      }
    });

    const { email, password } = generateFakeData();
    console.log("email is:" + email);
    console.log("password is:" + password);

    await test.step("Fill out registration form", async () => {
      await page.getByRole("textbox", { name: "Email address field" }).fill(email);
      await page.getByRole("textbox", { name: "Field for the password" }).fill(password);
      await page.getByRole("textbox", { name: "Field to confirm the password" }).fill(password);
      await page.getByRole("combobox", { name: "Selection list for the security question" }).click();
      await page.locator('mat-option:has-text("Company you first work for as an adult?")').click();
      await page.getByRole("textbox", { name: "Field for the answer to the security question" }).fill("Soar Inc");
    });

    await test.step("Submit registration form", async () => {
      await page.getByRole("button", { name: "Button to complete the registration" }).click();
    });

    await test.step("Verify successful registration", async () => {
      expect(page.getByText("Registration completed successfully. You can now log in.")).toBeVisible();
      await page.waitForURL(/login/);
    });

    await test.step("Login to App with newly created user", async () => {
      await page.getByRole("textbox", { name: "Text field for the login email" }).fill(email);
      await page.getByRole("textbox", { name: "Text field for the login password" }).fill(password);
      await page.getByRole("button", { name: "Login" }).click();
      await page.waitForLoadState("load");
    });
  });
});

// Helper function to check validation message visibility
async function verifyFieldValidation(page: Page, fieldRole: any, fieldName: string, validationMessage: string) {
  await page.getByRole(fieldRole, { name: fieldName }).click();
  await page.getByRole("button", { name: "Button to complete the registration" }).click({ force: true }); // Trigger validation
  await page.getByText("User Registration").click({ force: true }); // Trigger validation
  await expect(page.locator(`text=${validationMessage}`)).toBeVisible();
}

function generateFakeData() {
  const email = faker.internet.email();
  const password = generateStrongPassword();
  return { email, password };
}

function generateStrongPassword(): string {
  const length = 12; //Password length as needed
  const lowerCase = "abcdefghijklmnopqrstuvwxyz".split("");
  const upperCase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const digits = "0123456789".split("");
  const specialChars = "!@#$%^&*()-_=+[{]}\\|;:'\",<.>/?".split("");

  const lower = faker.helpers.arrayElement(lowerCase);
  const upper = faker.helpers.arrayElement(upperCase);
  const digit = faker.helpers.arrayElement(digits);
  const specialChar = faker.helpers.arrayElement(specialChars);

  // Generate the remaining password characters (mix of alphanumeric)
  const remainingLength = length - (lower.length + upper.length + digit.length + specialChar.length);
  const allCharacters = lowerCase.concat(upperCase, digits, specialChars);
  const remainingPassword = Array.from({ length: remainingLength }, () => faker.helpers.arrayElement(allCharacters)).join("");

  // Combine all parts together
  let password = lower + upper + digit + specialChar + remainingPassword;

  // Shuffle the password to randomize the character order
  password = password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
  return password;
}
