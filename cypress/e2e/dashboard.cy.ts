describe("Dashboard", () => {
  beforeEach(() => {
    cy.loginByApi(Cypress.env("testUser"), Cypress.env("testPass"));
  });

  context("Stats cards", () => {
    it("should show all five stats cards", () => {
      cy.dataCy("stat-total").should("be.visible");
      cy.dataCy("stat-todo").should("be.visible");
      cy.dataCy("stat-inprogress").should("be.visible");
      cy.dataCy("stat-done").should("be.visible");
      cy.dataCy("stat-high").should("be.visible");
    });

    it("should update cards count after a new task is created", () => {
      cy.dataCy("stat-total")
        .invoke("text")
        .should((text) => expect(text).to.match(/^\d+$/))
        .then((before) => {
          const countBefore = Number(before);
          cy.navigateTo("tasks");
          cy.dataCy("add-task-button").click();
          cy.dataCy("task-title-input").type("Count test");
          cy.dataCy("task-status-input").select("todo");
          cy.dataCy("task-priority-input").select("medium");
          cy.dataCy("task-modal-submit").click();
          cy.navigateTo("dashboard");
          cy.dataCy("stat-total")
            .invoke("text")
            .should((after) => {
              expect(after).to.match(/^\d+$/);
              expect(Number(after)).to.eq(countBefore + 1);
            });
        });
    });

    it("should update cards count after a task is deleted", () => {
      cy.dataCy("stat-total")
        .invoke("text")
        .should((text) => expect(text).to.match(/^\d+$/))
        .then((before) => {
          const countBefore = Number(before);
          cy.navigateTo("tasks");
          cy.dataCy("delete-task-icon").first().click();
          cy.dataCy("confirm-ok").click();
          cy.navigateTo("dashboard");
          cy.dataCy("stat-total")
            .invoke("text")
            .should((after) => {
              expect(after).to.match(/^\d+$/);
              expect(Number(after)).to.eq(countBefore - 1);
            });
        });
    });

    it("should display the total number of tasks as the sum of all cards", () => {
      cy.dataCy("stat-total")
        .invoke("text")
        .should((text) => expect(text).to.match(/^\d+$/))
        .then((total) => {
          cy.dataCy("stat-todo")
            .invoke("text")
            .should((text) => expect(text).to.match(/^\d+$/))
            .then((todo) => {
              cy.dataCy("stat-inprogress")
                .invoke("text")
                .should((text) => expect(text).to.match(/^\d+$/))
                .then((ip) => {
                  cy.dataCy("stat-done")
                    .invoke("text")
                    .should((text) => expect(text).to.match(/^\d+$/))
                    .then((done) => {
                      expect(Number(total)).to.eq(
                        Number(todo) + Number(ip) + Number(done)
                      );
                    });
                });
            });
        });
    });
  });

  context("Recent task list", () => {
    it("should show up to 5 recent tasks", () => {
      cy.dataCy("recent-task").should("have.length.at.most", 5);
    });

    it("should open the detailed view when clicking on a recent task", () => {
      cy.dataCy("recent-task").first().click();
      cy.dataCy("detail-title").should("be.visible");
    });
  });
});
