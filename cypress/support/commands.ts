declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to select DOM element by data-cy attribute.
       */
      dataCy(value: string): Chainable<JQuery<HTMLElement>>;
      /**
       * Custom command to login using username and password.
       */
      login(username: string, password: string): void;
      /**
       * Custom command to login as admin using env variables.
       */
      loginAsAdmin(): void;
      /**
       * Custom command to login as test user using env variables.
       */
      loginAsTestUser(): void;
      /**
       * Custom command to login by sending a POST request with username and password.
       */
      loginByApi(username: string, password: string): void;
      /**
       * Custom command to navigate to a view.
       */
      navigateTo(view: string): void;
      /**
       * Custom command to type in the search input
       */
      typeInSearchInput(query: string): void;

      /**
       * Custom command to select a status filter
       */
      selectStatusFilter(status: string): void;

      /**
       * Custom command to simulate drag and drop behavior
       */
      dragAndDrop(sourceSelector: string, targetSelector: string): void;
    }
  }
}

beforeEach(() => {
  cy.request("POST", "/api/test/reset");
});

// Custom commands

Cypress.Commands.add("dataCy", (value) => {
  return cy.get(`[data-cy=${value}]`);
});

Cypress.Commands.add("typeInSearchInput", (query) => {
  cy.dataCy("search-input").type(query);
});

Cypress.Commands.add("selectStatusFilter", (status) => {
  cy.dataCy("filter-status").select(status);
});

Cypress.Commands.add("login", (username, password) => {
  cy.visit("/");
  cy.dataCy("username-input").type(username);
  cy.dataCy("password-input").type(password);
  cy.dataCy("login-button").click();
  cy.dataCy("user-badge").should("be.visible");
});

Cypress.Commands.add("loginAsAdmin", () => {
  cy.login(Cypress.env("adminUser"), Cypress.env("adminPass"));
});

Cypress.Commands.add("loginAsTestUser", () => {
  cy.login(Cypress.env("testUser"), Cypress.env("testPass"));
});

Cypress.Commands.add("loginByApi", (username, password) => {
  cy.request("POST", "/api/auth/login", { username, password }).then((res) => {
    const token = res.body.token;
    cy.visit("/");
    cy.window().then((win) => {
      win.localStorage.setItem("tf_token", token);
    });
    cy.reload();
  });

  cy.dataCy("user-badge").should("be.visible");
});

Cypress.Commands.add("navigateTo", (view) => {
  cy.dataCy(`nav-${view}`).click();
});

Cypress.Commands.add("dragAndDrop", (sourceSelector, targetSelector) => {
  const dataTransfer = new DataTransfer();

  cy.dataCy(sourceSelector).first().trigger("dragstart", { dataTransfer });
  cy.dataCy(targetSelector).trigger("dragover", { dataTransfer });
  cy.dataCy(targetSelector).trigger("drop", { dataTransfer });
  cy.dataCy(sourceSelector).first().trigger("dragend", { dataTransfer });
});

export {};
