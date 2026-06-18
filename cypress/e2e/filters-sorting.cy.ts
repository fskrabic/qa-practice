describe("Filters and sorting", () => {
  beforeEach(() => {
    cy.loginByApi(Cypress.env("testUser"), Cypress.env("testPass"));
    cy.navigateTo("tasks");
    cy.dataCy("tasks-tbody").should("not.be.empty");
  });

  context("Search", () => {
    it("should filter the tasks by title", () => {
      cy.typeInSearchInput("CI pipeline");
      cy.dataCy("task-row").should("have.length", 1);
    });

    it("should filter tasks by description text", () => {
      cy.typeInSearchInput("edge cases");
      cy.dataCy("task-row").should("have.length.at.least", 1);
    });

    it("should display empty state when no tasks match the query", () => {
      cy.typeInSearchInput("thisdoesnotexist");
      cy.dataCy("empty-state").should("be.visible");
    });

    it("should be case insensitive", () => {
      cy.typeInSearchInput("WRITE TEST PLAN");
      cy.dataCy("task-row").should("have.length.at.least", 1);
    });

    it("should display all tasks when the search input in cleared", () => {
      cy.typeInSearchInput("CI pipeline");
      cy.dataCy("task-row").should("have.length", 1);
      cy.dataCy("search-input").clear();
      cy.dataCy("task-row").should("have.length.at.least", 6);
    });
  });

  context("Status filter", () => {
    it("should filter to display only To Do tasks", () => {
      cy.intercept("GET", "/api/tasks*").as("getTasks");
      cy.selectStatusFilter("todo");
      cy.wait("@getTasks").its("request.url").should("include", "status=todo");
      cy.get("[data-cy=tasks-tbody] [data-cy=status-badge]").each(($badge) => {
        expect($badge.text()).to.eq("To Do");
      });
    });

    it("should filter to display only 'In Progress' tasks", () => {
      cy.intercept("GET", "/api/tasks*").as("getTasks");
      cy.selectStatusFilter("in-progress");
      cy.wait("@getTasks")
        .its("request.url")
        .should("include", "status=in-progress");
      cy.get("[data-cy=tasks-tbody] [data-cy=status-badge]").each(($badge) => {
        expect($badge.text()).to.eq("In Progress");
      });
    });

    it("should filter to display only 'Done' tasks", () => {
      cy.intercept("GET", "/api/tasks*").as("getTasks");
      cy.selectStatusFilter("done");
      cy.wait("@getTasks").its("request.url").should("include", "status=done");
      cy.get("[data-cy=tasks-tbody] [data-cy=status-badge]").each(($badge) => {
        expect($badge.text()).to.eq("Done");
      });
    });

    it("should display all tasks when 'All Statuses' is selected", () => {
      cy.get("[data-cy=filter-status]").select("done");
      cy.get("[data-cy=filter-status]").select("");
      cy.get("[data-cy=task-row]").should("have.length.at.least", 6);
    });
  });
});
