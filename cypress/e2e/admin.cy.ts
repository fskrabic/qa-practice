describe("Admin panel", () => {
  context("Non admin access", () => {
    it("should not show the admin panel to non admin user", () => {
      cy.loginByApi(Cypress.env("testUser"), Cypress.env("testPass"));
      cy.dataCy("nav-admin").should("not.be.visible");
    });
    it("should return 403 when non admin tries to create a new user via API", () => {
      cy.loginByApi(Cypress.env("testUser"), Cypress.env("testPass"));
      cy.window().then((win) => {
        const token = win.localStorage.getItem("tf_token");
        cy.request({
          method: "POST",
          url: "/api/users",
          headers: { Authorization: `Bearer ${token}` },
          body: { name: "User123", username: "user123", password: "pass123" },
          failOnStatusCode: false,
        })
          .its("status")
          .should("eq", 403);
      });
    });
  });

  context("Admin access", () => {
    beforeEach(() => {
      cy.loginByApi(Cypress.env("adminUser"), Cypress.env("adminPass"));
      cy.navigateTo("admin");
    });

    it("should display the admin nav link", () => {
      cy.get("[data-cy=nav-admin]").should("be.visible");
    });

    it("should show the users table with the preconfigured users", () => {
      cy.dataCy("user-row").should("have.length.at.least", 3);
    });

    it("should display name, username and role badge for each user", () => {
      cy.dataCy("user-row").each((userRow) => {
        cy.wrap(userRow).within(() => {
          cy.dataCy("user-name").should("not.be.empty");
          cy.dataCy("user-username").should("not.be.empty");
          cy.dataCy("user-role").should("be.visible");
        });
      });
    });
    it("should open the new user dialog", () => {
      cy.dataCy("add-user-button").click();
      cy.dataCy("user-modal").should("be.visible");
    });

    it("should create a new user and show them in the table", () => {
      cy.fixture("data").then(({ newUser }) => {
        cy.dataCy("add-user-button").click();
        cy.dataCy("user-name-input").type(newUser.name);
        cy.dataCy("user-username-input").type(newUser.username);
        cy.dataCy("user-password-input").type(newUser.password);
        cy.dataCy("user-role-input").select(newUser.role);
        cy.dataCy("user-modal-submit").click();
        cy.dataCy("toast").should("contain", "created");
        cy.dataCy("user-row").contains(newUser.name).should("exist");
      });
    });

    it("should show a validation error and return 409 when creating a user with duplicate username", () => {
      cy.intercept("POST", "/api/users").as("createUser");
      cy.dataCy("add-user-button").click();
      cy.dataCy("user-name-input").type("admin");
      cy.dataCy("user-username-input").type("admin");
      cy.dataCy("user-password-input").type("password");
      cy.dataCy("user-modal-submit").click();
      cy.wait("@createUser").then(({ response }) => {
        expect(response.statusCode).to.eq(409);
      });
      cy.dataCy("user-form-error").should("contain", "already exists");
    });

    it("should show a validation error when required fields are missing", () => {
      cy.dataCy("add-user-button").click();
      cy.dataCy("user-modal-submit").click();
      cy.dataCy("user-form-error").should("not.be.empty");
    });

    it("should be able to log in as new user created by admin", () => {
      cy.fixture("data").then(({ newUser }) => {
        cy.dataCy("add-user-button").click();
        cy.dataCy("user-name-input").type(newUser.name);
        cy.dataCy("user-username-input").type(newUser.username);
        cy.dataCy("user-password-input").type(newUser.password);
        cy.dataCy("user-role-input").select(newUser.role);
        cy.dataCy("user-modal-submit").click();
        cy.dataCy("toast").should("contain", "created");

        cy.dataCy("logout-button").click();
        cy.login(newUser.username, newUser.password);
        cy.dataCy("user-badge").invoke("text").should("contain", newUser.name);
      });
    });
  });
});
