// export interface BookSessionPOM {
//     run: PageAction
//     goTo: PageAction
//     submitSession: PageAction
//     fillForm: PageAction
//   }

//   export class BookSessionPage implements BookSessionPOM {
//     readonly page: Page
//     readonly bookSessionLink: Locator
//     readonly emailInput: Locator
//     readonly nameInput: Locator
//     readonly informationInput: Locator
//     readonly submitButton: Locator

//     ... // And more selectors if required

//     constructor(page: Page) {
//       this.page = page
//       this.bookSessionLink = page.locator(/* ... */)
//       this.emailInput = page.locator(/* ... */)
//       this.nameInput = page.locator(/* ... */)
//       this.informationInput = page.locator(/* ... */)
//       this.submitButton = page.locator(/* ... */)
//       ... // And more selectors if required
//     }

//     // Now we implement methods from our type `Auth`
//     // Methods should be simple and do exactly one thing or one action
//     goTo: PageAction = async () => {
//       await this.page.goto(HOMEPAGE)
//       await expect(this.bookSessionLink).toBeVisible()
//       await this.bookSessionLink.click()
//     }

//     fillForm: PageAction = async () => {
//       await this.emailInput.fill(/* ... */)
//       await this.nameInput.fill(/* ... */)
//       await this.informationInput.fill(/* ... */)
//     }

//     submitSession: PageAction = async () => {
//       await this.submitButton.click()
//     }

//     run: PageAction = async () => {
//       await this.goTo()
//       await this.fillForm()
//       await this.submitSession()
//     }
//   }
