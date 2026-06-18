describe("Board view", () => {
  beforeEach(() => {
    cy.loginByApi(Cypress.env("testUser"), Cypress.env("testPass"));
    cy.navigateTo("board");
    cy.dataCy("board").should("be.visible");
  });

  context("Board layout", () => {
    it("should show all three columns (to do, in progress, done)", () => {
      cy.dataCy("col-todo").should("be.visible").and("contain", "To Do");
      cy.dataCy("col-in-progress")
        .should("be.visible")
        .and("contain", "In Progress");
      cy.dataCy("col-done").should("be.visible").and("contain", "Done");
    });
    it("should show a task count badge for each column", () => {
      cy.dataCy("count-todo")
        .invoke("text")
        .then((t) => expect(Number(t)).to.be.at.least(1));
      cy.dataCy("count-in-progress")
        .invoke("text")
        .then((t) => expect(Number(t)).to.be.at.least(1));
      cy.dataCy("count-done")
        .invoke("text")
        .then((t) => expect(Number(t)).to.be.at.least(1));
    });
    it("should display total task count as sum of all tasks", () => {
      cy.dataCy("count-todo")
        .invoke("text")
        .then((countTodo) => {
          cy.dataCy("count-in-progress")
            .invoke("text")
            .then((countInProgress) => {
              cy.dataCy("count-done")
                .invoke("text")
                .then((countDone) => {
                  const total =
                    Number(countTodo) +
                    Number(countInProgress) +
                    Number(countDone);
                  cy.navigateTo("dashboard");
                  cy.dataCy("stat-total")
                    .invoke("text")
                    .then((numTasks) => {
                      expect(total).to.eq(Number(numTasks));
                    });
                });
            });
        });
    });
  });

  context("Board cards", () => {
    it("should open the task detail view when clicking a card", () => {
      cy.dataCy("board-card").first().click();
      cy.dataCy("detail-title").should("be.visible");
    });
    it("should display board cards in correct columns based on status", () => {
      cy.dataCy("cards-todo").first().click();
      cy.dataCy("status-select").invoke("val").should("eq", "todo");
    });
    it("should display the task priority badge for the task", () => {
      cy.dataCy("board-card")
        .first()
        .find("[data-cy=priority-badge]")
        .should("be.visible");
    });
  });

  context("Create new task from board", () => {
    it("should open the new task dialog from board view", () => {
      cy.dataCy("add-task-board-button").click();
      cy.dataCy("task-modal").should("be.visible");
    });

    it("should create a new task with Done status", () => {
      cy.dataCy("add-task-board-button").click();
      cy.dataCy("task-title-input").type("Done");
      cy.dataCy("task-status-input").select("done");
      cy.dataCy("task-priority-input").select("low");
      cy.dataCy("task-modal-submit").click();
      cy.dataCy("toast").should("contain", "created");
      cy.dataCy("cards-done").contains("Done").should("exist");
    });

    it("should increment the column count after adding a new task", () => {
      cy.dataCy("count-todo")
        .invoke("text")
        .then((before) => {
          const beforeCount = Number(before);
          cy.dataCy("add-task-board-button").click();
          cy.dataCy("task-title-input").type("New task");
          cy.dataCy("task-status-input").select("todo");
          cy.dataCy("task-priority-input").select("low");
          cy.dataCy("task-modal-submit").click();
          cy.dataCy("count-todo")
            .invoke("text")
            .should("eq", String(beforeCount + 1));
        });
    });
  });

  context("Drag and drop simulation", () => {
    it("should update the board when a task status is patched via API", () => {
      cy.window().then((win) => {
        const t = win.localStorage.getItem("tf_token");
        cy.request({
          method: "PATCH",
          url: "/api/tasks/1/status",
          headers: { Authorization: `Bearer ${t}` },
          body: { status: "done" },
        }).then((res) => {
          expect(res.status).to.eq(200);
          expect(res.body.status).to.eq("done");
        });
      });
      cy.navigateTo("board");
      cy.dataCy("cards-done").contains("Write test plan").should("exist");
      cy.dataCy("cards-todo").contains("Write test plan").should("not.exist");
    });

    it("should trigger PATCH endpoint with correct payload", () => {
      cy.intercept("PATCH", "/api/tasks/*/status").as("statusPatch");
      cy.dataCy("board-card").first().click();
      cy.dataCy("status-select").then(($sel) => {
        const next = $sel.val() === "done" ? "todo" : "done";
        cy.wrap($sel).select(next);
        cy.wait("@statusPatch").then(({ request, response }) => {
          expect(request.body).to.have.property("status", next);
          expect(response.statusCode).to.eq(200);
        });
      });
    });
    it("should move a card from to do to done via DnD HTML API", () => {
      cy.dataCy("board-card")
        .first()
        .should("contain", "Write test plan");

      cy.intercept("PATCH", "/api/tasks/*/status").as("statusPatch");

      cy.dragAndDrop("board-card", "col-done");

      cy.wait("@statusPatch").then(({ response }) => {
        expect(response.statusCode).to.eq(200);
      });

      cy.dataCy("cards-done")
        .contains("Write test plan")
        .should("exist");
    });
  });
});
