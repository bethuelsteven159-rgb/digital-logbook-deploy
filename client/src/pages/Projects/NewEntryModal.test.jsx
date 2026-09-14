import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewEntryModal from "./NewEntryModal";

function renderModal(props = {}) {
  const onClose = vi.fn();
  const onCreate = vi.fn().mockResolvedValue(undefined);

  render(
    <NewEntryModal
      fields={[]}
      onClose={onClose}
      onCreate={onCreate}
      {...props}
    />,
  );

  return { onClose, onCreate };
}

describe("NewEntryModal - tags", () => {
  test("renders a Tags input field", () => {
    renderModal();

    expect(screen.getByLabelText("Tags")).toBeInTheDocument();
  });

  test("adds a tag as a chip when Enter is pressed", async () => {
    const user = userEvent.setup();
    renderModal();

    const tagInput = screen.getByLabelText("Tags");

    await user.type(tagInput, "research{Enter}");

    expect(screen.getByText("research")).toBeInTheDocument();
    // The input should clear after adding.
    expect(tagInput).toHaveValue("");
  });

  test("adds a tag as a chip when comma is pressed", async () => {
    const user = userEvent.setup();
    renderModal();

    const tagInput = screen.getByLabelText("Tags");

    await user.type(tagInput, "writing,");

    expect(screen.getByText("writing")).toBeInTheDocument();
  });

  test("adds multiple distinct tags", async () => {
    const user = userEvent.setup();
    renderModal();

    const tagInput = screen.getByLabelText("Tags");

    await user.type(tagInput, "research{Enter}");
    await user.type(tagInput, "writing{Enter}");

    expect(screen.getByText("research")).toBeInTheDocument();
    expect(screen.getByText("writing")).toBeInTheDocument();
  });

  test("does not add a duplicate tag twice", async () => {
    const user = userEvent.setup();
    renderModal();

    const tagInput = screen.getByLabelText("Tags");

    await user.type(tagInput, "research{Enter}");
    await user.type(tagInput, "research{Enter}");

    expect(screen.getAllByText("research")).toHaveLength(1);
  });

  test("does not add an empty tag", async () => {
    const user = userEvent.setup();
    renderModal();

    const tagInput = screen.getByLabelText("Tags");

    await user.type(tagInput, "   {Enter}");

    // No chips should have been created; the "remove tag" button
    // (aria-label starting with "Remove") should not exist.
    expect(
      screen.queryByRole("button", { name: /remove/i }),
    ).not.toBeInTheDocument();
  });

  test("removes a tag when its remove button is clicked", async () => {
    const user = userEvent.setup();
    renderModal();

    const tagInput = screen.getByLabelText("Tags");

    await user.type(tagInput, "research{Enter}");
    expect(screen.getByText("research")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Remove research" }),
    );

    expect(screen.queryByText("research")).not.toBeInTheDocument();
  });

  test("includes tags in the payload passed to onCreate", async () => {
    const user = userEvent.setup();
    const { onCreate } = renderModal();

    await user.type(screen.getByLabelText("Entry name"), "Lab Session");
    await user.type(screen.getByLabelText("Tags"), "research{Enter}");

    await user.click(
      screen.getByRole("button", { name: /save & create entry/i }),
    );

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Lab Session",
        tags: ["research"],
      }),
    );
  });

  test("submits with an empty tags array when no tags are added", async () => {
    const user = userEvent.setup();
    const { onCreate } = renderModal();

    await user.type(screen.getByLabelText("Entry name"), "Lab Session");

    await user.click(
      screen.getByRole("button", { name: /save & create entry/i }),
    );

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: [],
      }),
    );
  });
});
