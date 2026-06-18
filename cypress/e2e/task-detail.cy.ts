describe("Task detail page", () => {
  beforeEach(() => {
    cy.loginByApi(Cypress.env("testUser"), Cypress.env("testPass"));
    cy.navigateTo("tasks");
    cy.dataCy("task-title").first().click();
    cy.dataCy("detail-title").should("be.visible");
  });

  context("Display task detials", () => {
    it("should display the task title", () => {
      cy.dataCy("detail-title").should("not.be.empty");
    });
    it("should display the task description", () => {
      cy.dataCy("detail-description").should("be.visible");
    });
    it("should display the priority badge", () => {
      cy.dataCy("detail-priority")
        .find("[data-cy=priority-badge]")
        .should("be.visible");
    });
    it("should display the due date", () => {
      cy.dataCy("detail-due").should("be.visible");
    });
    it("should display the assignee", () => {
      cy.dataCy("detail-assignee").should("be.visible");
    });
    it("should display the tags", () => {
      cy.dataCy("detail-tags").should("be.visible");
    });
    it("should display the status selector in the sidebar", () => {
      cy.dataCy("status-select").should("be.visible");
    });
  });

  context("Navigation", () => {
    it("should return to the task list when the back button is clicked", () => {
      cy.dataCy("back-button").click();
      cy.dataCy("tasks-table").should("be.visible");
    });
  });

  context("Status change", () => {
    it("should change the task status via the sidebar selector and show a toast", () => {
      cy.dataCy("status-select").then((sel) => {
        const current = sel.val();
        const next = current === "todo" ? "done" : "todo";
        cy.wrap(sel).select(next);
        cy.dataCy("toast").should("contain", "Status updated");
      });
    });

    it("should persist the status change on navigating back and reopening the task", () => {
      cy.dataCy("detail-title")
        .invoke("text")
        .then((title) => {
          cy.dataCy("status-select").select("done");
          cy.dataCy("toast").should("contain", "Status updated");

          cy.dataCy("back-button").click();
          cy.dataCy("task-row").contains(title).click();
          cy.dataCy("status-select").should("have.value", "done");
        });
    });
  });

  context("Edit from detail dialog", () => {
    it("should open the task edit dialog from the detail page", () => {
      cy.dataCy("edit-task-button").click();
      cy.dataCy("task-modal").should("be.visible");
    });
    it("should update the task title after saving", () => {
      cy.dataCy("edit-task-button").click();
      cy.dataCy("task-title-input").clear().type("Edited");
      cy.dataCy("task-modal-submit").click();
      cy.dataCy("detail-title").should("contain", "Edited");
    });
  });

  context("Delete from detail dialog", () => {
    it("should display the confirm dialog when delete is clicked", () => {
      cy.dataCy("delete-task-button").click();
      cy.dataCy("confirm-modal").should("be.visible");
    });

    it("should navigate back to the task list after deleting a task", () => {
      cy.dataCy("delete-task-button").click();
      cy.dataCy("confirm-ok").click();
      cy.dataCy("tasks-table").should("be.visible");
      cy.dataCy("toast").should("contain", "deleted");
    });
  });

  context("Comments", () => {
    it("should display existing comments on a task that has them", () => {
      cy.navigateTo("tasks");
      cy.dataCy("task-row").contains("Write test plan").click();
      cy.dataCy("comment").should("have.length.at.least", 2);
    });

    it("should display the comment count", () => {
      cy.navigateTo("tasks");
      cy.dataCy("task-row").contains("Write test plan").click();
      cy.dataCy("comment-count")
        .invoke("text")
        .then((t) => {
          expect(Number(t)).to.be.at.least(2);
        });
    });

    it("should add a new comment and updates the count", () => {
      cy.navigateTo("tasks");
      cy.dataCy("task-row").contains("Write test plan").click();
      cy.dataCy("comment-count")
        .invoke("text")
        .then((before) => {
          const countBefore = Number(before);
          cy.dataCy("comment-input").type("New comment");
          cy.dataCy("add-comment-button").click();
          cy.dataCy("toast").should("contain", "Comment added");
          cy.dataCy("comment-count").should("contain", countBefore + 1);
          cy.dataCy("comment-text").last().should("contain", "New comment");
        });
    });

    it("should clear the comment input after submitting", () => {
      cy.dataCy("comment-input").type("New comment");
      cy.dataCy("add-comment-button").click();
      cy.dataCy("comment-input").should("be.empty");
    });

    it("should be able to delete own comment after confirmation", () => {
      cy.dataCy("comment-input").type("To be deleted");
      cy.dataCy("add-comment-button").click();
      cy.dataCy("toast").should("contain", "Comment added");

      cy.dataCy("comment")
        .last()
        .within(() => {
          cy.dataCy("delete-comment").click();
        });
      cy.dataCy("confirm-ok").click();
      cy.dataCy("toast").should("contain", "deleted");
      cy.dataCy("comment-text").contains("To be deleted").should("not.exist");
    });

    it("should display a placeholder when there are no comments", () => {
      cy.navigateTo("tasks");
      cy.dataCy("task-row").contains("Fix pagination bug").click();
      cy.dataCy("no-comments").should("be.visible");
    });
  });
});
