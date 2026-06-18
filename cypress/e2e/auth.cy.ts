describe("Authentication", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  context("Login page", () => {
    it("should display the login form on first visit", () => {
      cy.dataCy("username-input").should("be.visible");
      cy.dataCy("password-input").should("be.visible");
      cy.dataCy("login-button").should("be.visible").and("contain", "Sign In");
      cy.dataCy("login-error").should("be.empty");
    });

    it("should have the correct page title", () => {
      cy.title().should("include", "TaskFlow");
    });
  });

  context("Successful login", () => {
    it("should log in with valid admin credentials and shows the dashboard", () => {
      cy.fixture("data").then((userData) => {
        cy.dataCy("username-input").type(userData.adminUser.username);
        cy.dataCy("password-input").type(userData.adminUser.password);
        cy.dataCy("login-button").click();
        cy.dataCy("user-badge").should("be.visible");
        cy.dataCy("stats-grid").should("be.visible");
      });
    });

    it("should display the logged in users name in the top bar", () => {
      cy.fixture("data").then((userData) => {
        cy.login(userData.validUser.username, userData.validUser.password);
        cy.dataCy("user-badge").should("contain", userData.validUser.name);
      });
    });

    it("should show the correct role badge for admin", () => {
      cy.loginAsAdmin();
      cy.dataCy("user-badge").find(".role-badge").should("contain", "admin");
    });

    it("should show the correct role badge for regular user", () => {
      cy.loginAsTestUser();
      cy.dataCy("user-badge").find(".role-badge").should("contain", "user");
    });

    it("should hide the admin nav link for non-admin users", () => {
      cy.loginAsTestUser();
      cy.dataCy("nav-admin").should("not.be.visible");
    });

    it("should show the admin nav link for admin user", () => {
      cy.loginAsAdmin();
      cy.dataCy("nav-admin").should("be.visible");
    });

    it("should persist the session on page reload", () => {
      cy.loginAsTestUser();
      cy.reload();
      cy.dataCy("user-badge").should("be.visible");
    });

    it("should be avle to log in by pressing enter in the password field", () => {
      cy.fixture("data").then((userData) => {
        cy.dataCy("username-input").type(userData.validUser.username);
        cy.dataCy("password-input").type(
          `${userData.validUser.password}{enter}`
        );
        cy.dataCy("user-badge").should("be.visible");
      });
    });
  });

  context("Login validation", () => {
    it("should show an error for an incorrect password", () => {
      cy.dataCy("username-input").type("admin");
      cy.dataCy("password-input").type("incorrectpassword");
      cy.dataCy("login-button").click();
      cy.dataCy("login-error").should("be.visible").and("not.be.empty");
    });

    it("should show an error for a non-existing user", () => {
      cy.dataCy("username-input").type("doesnotexist");
      cy.dataCy("password-input").type("password");
      cy.dataCy("login-button").click();
      cy.dataCy("login-error").should("contain", "Invalid credentials");
    });
  });

  context("Logout", () => {
    it("should return to the login page after logout", () => {
      cy.loginAsTestUser();
      cy.dataCy("logout-button").should("be.visible").click();
      cy.dataCy("login-button").should("be.visible");
    });

    it("should clear the token from local storage on logout", () => {
      cy.loginAsTestUser();
      cy.dataCy("logout-button").click();
      cy.window().its("localStorage.tf_token").should("not.exist");
    });

    it("should not allow access to the API with an invalid token", () => {
      cy.loginAsTestUser();
      cy.window().then((win) => {
        const token = win.localStorage.getItem("tf_token");
        cy.dataCy("logout-button").click();
        cy.request({
          method: "GET",
          url: "/api/tasks",
          headers: { Authorization: `Bearer ${token}` },
          failOnStatusCode: false,
        })
          .its("status")
          .should("eq", 401);
      });
    });
  });

  context("Password change", () => {
    beforeEach(() => {
      cy.loginAsTestUser();
      cy.dataCy("user-badge").click();
    });

    it("should show the profile page with a change password form", () => {
      cy.dataCy("change-password-card").should("be.visible");
      cy.dataCy("pw-current").should("be.visible");
      cy.dataCy("pw-new").should("be.visible");
      cy.dataCy("pw-confirm").should("be.visible");
    });

    it("should show an error when the passwords do not match", () => {
      cy.dataCy("pw-current").type("test1234");
      cy.dataCy("pw-new").type("newpassword");
      cy.dataCy("pw-confirm").type("doesnotmatch");
      cy.dataCy("change-password-button").click();
      cy.dataCy("pw-error").should("be.visible").and("contain", "do not match");
    });

    it("should show an error when the current password is wrong", () => {
      cy.dataCy("pw-current").type("wrongpassword");
      cy.dataCy("pw-new").type("newpassword");
      cy.dataCy("pw-confirm").type("newpassword");
      cy.dataCy("change-password-button").click();
      cy.dataCy("pw-error").should("be.visible").and("not.be.empty");
    });

    it("should successfully change the password and show a toast", () => {
      cy.dataCy("pw-current").type("test1234");
      cy.dataCy("pw-new").type("newpassword");
      cy.dataCy("pw-confirm").type("newpassword");
      cy.dataCy("change-password-button").click();
      cy.dataCy("toast").should("contain", "Password updated");
    });
  });
});
