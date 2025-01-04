import { expect, Locator, Page } from "playwright/test";

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
  readonly passwordAdviceTexts: Locator[];

  constructor(page: Page) {
    this.page = page;

    //Selector:
    this.accountMenuButton = this.page.getByRole("button", { name: "Show/hide account menu" });
    this.loginMenuItem = this.page.getByRole("menuitem", { name: "Go to login page" });
    this.notCustomerText = this.page.getByText("Not yet a customer?");
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
    await this.accountMenuButton.click();
    await this.loginMenuItem.click();
  }

  async startRegistration() {
    await this.notCustomerText.click();
    await this.page.waitForLoadState();
  }

  async verifyFieldValidation(fieldType: string, fieldName: string, expectedError: string) {
    //const field = this.page.getByRole(fieldType, { name: fieldName });
    // await field.click();
    // await field.blur(); // Trigger validation
    expect(this.page.getByText(expectedError)).toBeVisible();
  }

  async enablePasswordAdvice() {
    if (!(await this.passwordAdviceToggle.isChecked())) {
      await this.passwordAdviceToggle.check({ force: true });
    }
  }

  async verifyPasswordAdvice() {
    for (const adviceText of this.passwordAdviceTexts) {
      expect(adviceText).toBeVisible();
    }
  }

  async fillRegistrationForm(email: string, password: string, securityAnswer: string) {
    await this.emailField.fill(email);
    await this.passwordField.fill(password);
    await this.confirmPasswordField.fill(password);
    await this.securityQuestionDropdown.click();
    await this.securityQuestionOption.click();
    await this.securityAnswerField.fill(securityAnswer);
  }

  async submitRegistration() {
    await this.registerButton.click();
  }

  async verifySuccessfulRegistration() {
    expect(this.registrationSuccessText).toBeVisible();
    await this.page.waitForURL(/login/);
  }
}
