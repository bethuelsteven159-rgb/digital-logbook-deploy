import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AutomationRulesModal from "./AutomationRulesModal";

const apiMocks = vi.hoisted(() => ({
  fetchAutomationRules: vi.fn(),
  createAutomationRule: vi.fn(),
  updateAutomationRule: vi.fn(),
  deleteAutomationRule: vi.fn(),
}));

vi.mock("../../api/projectDetailsApi", () => ({
  fetchAutomationRules: apiMocks.fetchAutomationRules,
  createAutomationRule: apiMocks.createAutomationRule,
  updateAutomationRule: apiMocks.updateAutomationRule,
  deleteAutomationRule: apiMocks.deleteAutomationRule,
}));

const fields = [
  { id: "field-1", name: "Status", fieldType: "short_text" },
  { id: "field-2", name: "Score", fieldType: "number" },
  { id: "field-3", name: "Total", fieldType: "computed" },
];

const rule = {
  id: "rule-1",
  name: "Mark completed work",
  conditionFieldId: "field-1",
  conditionOperator: "equals",
  conditionValue: "completed",
  actionType: "add_tag",
  actionValue: "completed",
  enabled: true,
};

function renderModal(props = {}) {
  const onClose = vi.fn();

  render(
    <AutomationRulesModal
      projectId="project-1"
      fields={fields}
      onClose={onClose}
      {...props}
    />,
  );

  return { onClose };
}

async function fillForm(user, overrides = {}) {
  await user.type(screen.getByLabelText("Rule name"), overrides.name ?? "Auto-complete");
  await user.selectOptions(
    screen.getByLabelText("Condition field"),
    overrides.conditionFieldId ?? "field-1",
  );
  await user.selectOptions(
    screen.getByLabelText("Condition"),
    overrides.conditionOperator ?? "equals",
  );
  await user.type(
    screen.getByLabelText("Condition value"),
    overrides.conditionValue ?? "completed",
  );
  await user.type(screen.getByLabelText("Tag to add"), overrides.actionValue ?? "Completed");
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AutomationRulesModal", () => {
  test("renders existing rules with their IF/THEN descriptions", async () => {
    apiMocks.fetchAutomationRules.mockResolvedValue([rule]);
    renderModal();

    expect(await screen.findByText("Mark completed work")).toBeInTheDocument();
    expect(screen.getByText("IF Status equals completed")).toBeInTheDocument();
    expect(screen.getByText('THEN add tag "completed"')).toBeInTheDocument();
    expect(screen.getByText("Enabled")).toBeInTheDocument();
    expect(apiMocks.fetchAutomationRules).toHaveBeenCalledWith("project-1");
  });

  test("renders a safe placeholder when a rule references a missing field", async () => {
    apiMocks.fetchAutomationRules.mockResolvedValue([
      { ...rule, conditionFieldId: "field-9" },
    ]);
    renderModal();

    expect(await screen.findByText(/IF Deleted field/)).toBeInTheDocument();
  });

  test("offers only non-computed fields as condition options", async () => {
    apiMocks.fetchAutomationRules.mockResolvedValue([]);
    renderModal();

    const fieldSelect = await screen.findByLabelText("Condition field");

    expect(
      screen.getByRole("option", { name: "Status" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Score" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Total" }),
    ).not.toBeInTheDocument();
    expect(fieldSelect).toBeInTheDocument();
  });

  test("offers the five supported condition operators", async () => {
    apiMocks.fetchAutomationRules.mockResolvedValue([]);
    renderModal();

    const operatorSelect = await screen.findByLabelText("Condition");

    for (const label of [
      "Equals",
      "Not equals",
      "Contains",
      "Greater than",
      "Less than",
    ]) {
      expect(
        screen.getByRole("option", { name: label }),
      ).toBeInTheDocument();
    }
    expect(operatorSelect).toHaveValue("equals");
  });

  test("submits a create payload with the trimmed, lowercased tag", async () => {
    const user = userEvent.setup();
    apiMocks.fetchAutomationRules.mockResolvedValue([]);
    apiMocks.createAutomationRule.mockResolvedValue({
      ...rule,
      id: "rule-2",
      name: "Auto-complete",
      actionValue: "completed",
    });
    renderModal();

    await fillForm(user, { conditionValue: "completed ", actionValue: "Completed " });
    await user.click(screen.getByRole("button", { name: "Create rule" }));

    await waitFor(() =>
      expect(apiMocks.createAutomationRule).toHaveBeenCalledTimes(1),
    );
    expect(apiMocks.createAutomationRule).toHaveBeenCalledWith("project-1", {
      name: "Auto-complete",
      conditionFieldId: "field-1",
      conditionOperator: "equals",
      conditionValue: "completed",
      actionType: "add_tag",
      actionValue: "completed",
    });
  });

  test("populates the form when editing and submits an update", async () => {
    const user = userEvent.setup();
    apiMocks.fetchAutomationRules.mockResolvedValue([rule]);
    apiMocks.updateAutomationRule.mockResolvedValue({
      ...rule,
      actionValue: "done",
    });
    renderModal();

    await user.click(await screen.findByRole("button", { name: "Edit" }));

    expect(screen.getByLabelText("Rule name")).toHaveValue("Mark completed work");
    expect(screen.getByLabelText("Condition field")).toHaveValue("field-1");
    expect(screen.getByLabelText("Condition value")).toHaveValue("completed");
    expect(screen.getByLabelText("Tag to add")).toHaveValue("completed");

    await user.clear(screen.getByLabelText("Tag to add"));
    await user.type(screen.getByLabelText("Tag to add"), "Done");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(apiMocks.updateAutomationRule).toHaveBeenCalledTimes(1),
    );
    expect(apiMocks.updateAutomationRule).toHaveBeenCalledWith("rule-1", {
      name: "Mark completed work",
      conditionFieldId: "field-1",
      conditionOperator: "equals",
      conditionValue: "completed",
      actionType: "add_tag",
      actionValue: "done",
    });
    expect(
      await screen.findByText('THEN add tag "done"'),
    ).toBeInTheDocument();
  });

  test("toggles a rule's enabled state", async () => {
    const user = userEvent.setup();
    apiMocks.fetchAutomationRules.mockResolvedValue([rule]);
    apiMocks.updateAutomationRule.mockResolvedValue({
      ...rule,
      enabled: false,
    });
    renderModal();

    await user.click(await screen.findByRole("button", { name: "Disable" }));

    await waitFor(() =>
      expect(apiMocks.updateAutomationRule).toHaveBeenCalledWith("rule-1", {
        enabled: false,
      }),
    );
  });

  test("deletes a rule and removes it from the list", async () => {
    const user = userEvent.setup();
    apiMocks.fetchAutomationRules.mockResolvedValue([rule]);
    apiMocks.deleteAutomationRule.mockResolvedValue({ id: "rule-1" });
    renderModal();

    await user.click(
      await screen.findByRole("button", {
        name: "Delete Mark completed work",
      }),
    );

    await waitFor(() =>
      expect(apiMocks.deleteAutomationRule).toHaveBeenCalledWith("rule-1"),
    );
    await waitFor(() =>
      expect(
        screen.queryByText("Mark completed work"),
      ).not.toBeInTheDocument(),
    );
  });

  test("shows an error when loading rules fails", async () => {
    apiMocks.fetchAutomationRules.mockRejectedValue(
      new Error("Could not load rules"),
    );
    renderModal();

    expect(
      await screen.findByText("Could not load rules"),
    ).toBeInTheDocument();
  });

  test("shows an error and stays open when saving a rule fails", async () => {
    const user = userEvent.setup();
    apiMocks.fetchAutomationRules.mockResolvedValue([]);
    apiMocks.createAutomationRule.mockRejectedValue(
      new Error("Save failed"),
    );
    const { onClose } = renderModal();

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Create rule" }));

    expect(await screen.findByText("Save failed")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
