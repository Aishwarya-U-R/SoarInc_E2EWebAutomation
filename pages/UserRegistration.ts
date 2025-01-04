import { expect, Locator, Page, test } from "playwright/test";
import { faker } from "@faker-js/faker"; // Importing Faker

export class RegistrationPage {
  readonly page: Page;
  private readonly accountMenuButton: Locator;
  private readonly loginMenuItem: Locator;
  private readonly notCustomerText: Locator;
  private readonly emailField: Locator;
  private readonly passwordField: Locator;
  private readonly confirmPasswordField: Locator;
  private readonly securityQuestionDropdown: Locator;
  private readonly securityQuestionOption: Locator;
  private readonly securityAnswerField: Locator;
  private readonly registerButton: Locator;
  private readonly passwordAdviceToggle: Locator;
  private readonly registrationSuccessText: Locator;
  private readonly passwordAdviceTexts: Locator[];
  private readonly fieldByName: (fieldType: "textbox" | "combobox", fieldName: string) => Locator;
  private readonly loginEmail: Locator;
  private readonly loginPassword: Locator;
  private readonly loginBtn: Locator;
  private readonly logoutBtn: Locator;

  constructor(page: Page) {
    this.page = page;

    //Selector:
    this.accountMenuButton = this.page.getByRole("button", { name: "Show/hide account menu" });
    this.loginMenuItem = this.page.getByRole("menuitem", { name: "Go to login page" });
    this.fieldByName = (fieldType, fieldName) => this.page.getByRole(fieldType, { name: fieldName });
    this.notCustomerText = this.page.getByText("Not yet a customer?");
    this.loginEmail = page.getByRole("textbox", { name: "Text field for the login email" });
    this.loginPassword = page.getByRole("textbox", { name: "Text field for the login password" });
    this.loginBtn = page.getByRole("button", { name: "Login" });
    this.logoutBtn = page.getByRole("menuitem", { name: "Logout" });
    this.emailField = this.page.getByRole("textbox", { name: "Email address field" });
    this.passwordField = this.page.getByRole("textbox", { name: "Field for the password" });
    this.confirmPasswordField = this.page.getByRole("textbox", { name: "Field to confirm the password" });
    this.securityQuestionDropdown = this.page.getByRole("combobox", { name: "Selection list for the security question" });
    this.securityQuestionOption = this.page.locator('mat-option:has-text("Company you first work for as an adult?")');
    this.securityAnswerField = this.page.getByRole("textbox", { name: "Field for the answer to the security question" });
    this.registerButton = this.page.getByRole("button", { name: "Button to complete the registration" });
    this.passwordAdviceToggle = this.page.locator('span.mat-slide-toggle-bar input[type="checkbox"]');
    this.registrationSuccessText = this.page.getByText("Registration completed successfully. You can now log in.");
    this.passwordAdviceTexts = [
      this.page.getByText("contains at least one lower character"),
      this.page.getByText("contains at least one upper character"),
      this.page.getByText("contains at least one digit"),
      this.page.getByText("contains at least one special character"),
      this.page.getByText("contains at least 8 characters"),
    ];
  }

  // Methods
  async goToLoginPage() {
    await test.step("Go to login page", async () => {
      await this.accountMenuButton.click();
      await this.loginMenuItem.click();
    });
  }

  async startRegistration() {
    await test.step("Register new user", async () => {
      await this.notCustomerText.click();
      await this.page.waitForLoadState();
    });
  }

  async verifyFieldValidation(fieldType: "textbox" | "combobox", fieldName: string, expectedError: string) {
    const field = this.fieldByName(fieldType, fieldName);
    await field.click();
    await field.blur(); // Trigger validation
    await this.page.keyboard.press("Escape");
    expect(this.page.getByText(expectedError)).toBeVisible();
  }

  async enablePasswordAdvice() {
    await test.step("Show Password Advice", async () => {
      if (!(await this.passwordAdviceToggle.isChecked())) {
        await this.passwordAdviceToggle.check({ force: true });
      }
    });
  }

  async verifyPasswordAdvice() {
    await test.step("[Assertion] Verify Password Advice validations", async () => {
      for (const adviceText of this.passwordAdviceTexts) {
        expect(adviceText).toBeVisible();
      }
    });
  }

  async generateFakeData() {
    const email = faker.internet.email();
    const password = await this.generateStrongPassword();
    return { email, password };
  }

  private async generateStrongPassword(): Promise<string> {
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

  async fillRegistrationForm(email: string, password: string, securityAnswer: string) {
    await test.step("Fill out registration form", async () => {
      console.log("email is:" + email);
      console.log("password is:" + password);
      await this.emailField.fill(email);
      await this.passwordField.fill(password);
      await this.confirmPasswordField.fill(password);
      await this.securityQuestionDropdown.click();
      await this.securityQuestionOption.click();
      await this.securityAnswerField.fill(securityAnswer);
    });
  }

  async submitRegistration() {
    await test.step("Submit registration form", async () => {
      await this.registerButton.click();
    });
  }

  async verifySuccessfulRegistration() {
    await test.step("Verify successful registration", async () => {
      expect(this.registrationSuccessText).toBeVisible();
      await this.page.waitForURL(/login/);
    });
  }

  async navigateAndLogin(email: string, password: string) {
    await this.goToLoginPage();
    await this.loginToApp(email, password);
  }

  async loginToApp(email: string, password: string) {
    await test.step("Login to App with provided credentials", async () => {
      await this.loginEmail.fill(email);
      await this.loginPassword.fill(password);
      await this.loginBtn.click();
      // Wait for the page to load after login
      await this.page.waitForLoadState("load");
    });
  }

  async accountLogout(baseURL: string) {
    await test.step("Logout of account", async () => {
      await this.accountMenuButton.click();
      await this.page.waitForTimeout(1000); // wait for menu to open
      await this.logoutBtn.click({ force: true });
      await this.page.waitForURL(baseURL);
    });
  }

  async setCredentials(email: string, password: string) {
    let credentials = {
      email: "",
      password: "",
    };
    credentials.email = email;
    credentials.password = password;
    console.log("Credentials set:", credentials);
    return credentials;
  }
}
