describe("Task management list", () => {
  beforeEach(() => {
    cy.loginByApi(Cypress.env("testUser"), Cypress.env("testPass"));
    cy.navigateTo("tasks");
  });

  context("Task list", () => {
    it("should render the tasks table with the correct columns", () => {
      cy.dataCy("tasks-table").should("be.visible");
      cy.dataCy("sort-title").should("contain", "Title");
      cy.dataCy("sort-status").should("contain", "Status");
      cy.dataCy("sort-priority").should("contain", "Priority");
      cy.dataCy("sort-due").should("contain", "Due Date");
    });

    it("should display the correct number of default tasks", () => {
      cy.dataCy("task-row").should("have.length", 6);
    });

    it("should display the task count above the table", () => {
      cy.dataCy("task-row")
        .its("length")
        .then((length) => {
          cy.dataCy("tasks-count").invoke("text").should("include", length);
        });
    });

    it("should display the status and priority badges", () => {
      cy.dataCy("task-row")
        .first()
        .within(() => {
          cy.dataCy("status-badge").should("be.visible");
          cy.dataCy("priority-badge").should("be.visible");
        });
    });
  });

  context("Create task", () => {
    it("should open a new task dialog when the button is clicked", () => {
      cy.dataCy("add-task-button").click();
      cy.dataCy("task-modal").should("be.visible");
      cy.dataCy("task-title-input").should("be.focused");
    });

    it("should create a new task with all fields filled in", () => {
      cy.fixture("data").then(({ newTask }) => {
        cy.dataCy("add-task-button").click();
        cy.dataCy("task-title-input").type(newTask.title);
        cy.dataCy("task-desc-input").type(newTask.description);
        cy.dataCy("task-status-input").select("in-progress");
        cy.dataCy("task-priority-input").select("high");
        cy.dataCy("task-due-input").type(newTask.dueDate);
        cy.dataCy("tags-checkboxes").find("input[value='qa']").check();
        cy.dataCy("task-modal-submit").click();

        cy.dataCy("task-modal").should("not.have.class", "open");
        cy.dataCy("toast").should("contain", "created");
        cy.dataCy("task-row").contains(newTask.title).should("exist");
      });
    });

    it("should display a validation error when title is empty", () => {
      cy.dataCy("add-task-button").click();
      cy.dataCy("task-modal-submit").click();
      cy.dataCy("title-error").should("not.be.empty");
      cy.dataCy("task-modal").should("have.class", "open");
    });

    it("should close the modal on clicking the cancel button", () => {
      cy.dataCy("add-task-button").click();
      cy.dataCy("task-modal-cancel").click();
      cy.dataCy("task-modal").should("not.have.class", "open");
    });

    it("should increase the task count after creating a new task", () => {
      cy.dataCy("tasks-count")
        .invoke("text")
        .then((before) => {
          const numBefore = parseInt(before);
          cy.dataCy("add-task-button").click();
          cy.dataCy("task-title-input").type("new task");
          cy.dataCy("task-status-input").select("in-progress");
          cy.dataCy("task-priority-input").select("high");
          cy.dataCy("task-modal-submit").click();
          cy.dataCy("tasks-count").should("contain", numBefore + 1);
        });
    });
  });

  context("Edit task", () => {
    it("should open the dialog pre-filled with existing task data", () => {
      cy.dataCy("task-row").first().find("[data-cy=edit-task-icon]").click();
      cy.dataCy("task-modal").should("be.visible");
      cy.dataCy("task-title-input").should("not.have.value", "");
    });

    it("should save changes and reflects them in the task table", () => {
      cy.dataCy("task-row").first().find("[data-cy=edit-task-icon]").click();
      cy.dataCy("task-title-input").clear().type("Updated task title");
      cy.dataCy("task-modal-submit").click();
      cy.dataCy("toast").should("contain", "updated");
      cy.dataCy("task-row").contains("Updated task title").should("exist");
    });

    it("should display a validation error when clearing title on edit", () => {
      cy.dataCy("task-row").first().find("[data-cy=edit-task-icon]").click();
      cy.dataCy("task-title-input").clear();
      cy.dataCy("task-modal-submit").click();
      cy.dataCy("title-error").should("not.be.empty");
    });
  });

  context("Delete task", () => {
    it("should show a confirmation dialog before deleting", () => {
      cy.dataCy("task-row").first().find("[data-cy=delete-task-icon]").click();
      cy.dataCy("confirm-modal").should("be.visible");
    });
    it("should cancel deletion when cancel is clicked in the dialog", () => {
      cy.dataCy("task-row").first().find("[data-cy=delete-task-icon]").click();
      cy.dataCy("confirm-cancel").click();
      cy.dataCy("confirm-modal").should("not.have.class", "open");
      cy.dataCy("task-row").should("have.length", 6);
    });

    it("should delete a task after confirmation and remove it from the table", () => {
      cy.dataCy("task-row")
        .first()
        .find("[data-cy=task-title]")
        .invoke("text")
        .then((title) => {
          cy.dataCy("task-row")
            .first()
            .find("[data-cy=delete-task-icon]")
            .click();
          cy.dataCy("confirm-ok").click();
          cy.dataCy("toast").should("contain", "deleted");
          cy.dataCy("task-row").contains(title).should("not.exist");
        });
    });
  });

  context("API interception", () => {
    it("should intercept the tasks API and assert the response", () => {
      cy.intercept("GET", "/api/tasks*", (req) => {
        delete req.headers["if-none-match"];
      }).as("getTasks");
      cy.navigateTo("tasks");
      cy.wait("@getTasks").then(({ response }) => {
        expect(response.statusCode).to.eq(200);
        expect(response.body).to.have.property("tasks").that.is.an("array");
        expect(response.body).to.have.property("total").that.is.an("number");
      });
    });

    it("should stub the tasks API and return and empty list and shows empty state", () => {
      cy.intercept("GET", "/api/tasks*", { body: { tasks: [], total: 0 } }).as(
        "emptyTasks"
      );
      cy.navigateTo("tasks");
      cy.wait("@emptyTasks");
      cy.dataCy("empty-state").should("be.visible");
    });

    it("should intercept task creation and verify the request payload", () => {
      cy.intercept("POST", "/api/tasks").as("createTask");
      cy.dataCy("add-task-button").click();
      cy.dataCy("task-title-input").type("Intercepted task");
      cy.dataCy("task-priority-input").select("high");
      cy.dataCy("task-status-input").select("todo");
      cy.dataCy("task-modal-submit").click();
      cy.wait("@createTask").then(({ request }) => {
        expect(request.body.title).to.eq("Intercepted task");
        expect(request.body.priority).to.eq("high");
      });
    });

    it("should handle a 500 error and show a toast", () => {
      cy.intercept("POST", "/api/tasks", {
        statusCode: 500,
        body: {
          error: "Internal server error",
        },
      }).as("failCreate");
      cy.dataCy("add-task-button").click();
      cy.dataCy("task-title-input").type("Failed");
      cy.dataCy("task-priority-input").select("high");
      cy.dataCy("task-modal-submit").click();
      cy.wait("@failCreate");
      cy.dataCy("task-form-error").should("not.be.empty");
    });
  });
});
