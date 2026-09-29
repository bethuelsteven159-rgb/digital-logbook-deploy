import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import LearningVideos from "./LearningVideos";

const apiMocks = vi.hoisted(() => ({
  fetchLearningVideos: vi.fn(),
}));

vi.mock("../../api/projectDetailsApi", () => ({
  fetchLearningVideos: apiMocks.fetchLearningVideos,
}));

const result = {
  query: "chess",
  videos: [
    {
      videoId: "v1",
      title: "Chess openings",
      channel: "Chess Channel",
      thumbnail: "https://img.test/1.jpg",
      url: "https://www.youtube.com/watch?v=v1",
    },
    {
      videoId: "v2",
      title: "Endgame basics",
      channel: "Endgame Channel",
      thumbnail: null,
      url: "https://www.youtube.com/watch?v=v2",
    },
  ],
};

describe("LearningVideos", () => {
  beforeEach(() => {
    apiMocks.fetchLearningVideos.mockReset();
  });

  test("searches with the project id and an empty query by default", async () => {
    apiMocks.fetchLearningVideos.mockResolvedValueOnce(result);
    const user = userEvent.setup();

    render(<LearningVideos projectId="project-1" projectName="Chess" />);
    await user.click(
      screen.getByRole("button", { name: /find learning videos/i }),
    );

    expect(apiMocks.fetchLearningVideos).toHaveBeenCalledWith("project-1", "");
    expect(await screen.findByText("Chess openings")).toBeTruthy();
    expect(screen.getByText("Endgame Channel")).toBeTruthy();
  });

  test("passes the typed search term", async () => {
    apiMocks.fetchLearningVideos.mockResolvedValueOnce(result);
    const user = userEvent.setup();

    render(<LearningVideos projectId="project-1" />);
    await user.type(
      screen.getByLabelText(/learning video search/i),
      "endgames",
    );
    await user.click(
      screen.getByRole("button", { name: /find learning videos/i }),
    );

    await waitFor(() =>
      expect(apiMocks.fetchLearningVideos).toHaveBeenCalledWith(
        "project-1",
        "endgames",
      ),
    );
  });

  test("opens videos in a new tab safely", async () => {
    apiMocks.fetchLearningVideos.mockResolvedValueOnce(result);
    const user = userEvent.setup();

    render(<LearningVideos projectId="project-1" />);
    await user.click(
      screen.getByRole("button", { name: /find learning videos/i }),
    );

    const link = (await screen.findByText("Chess openings")).closest("a");
    expect(link.getAttribute("href")).toBe(
      "https://www.youtube.com/watch?v=v1",
    );
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  test("shows an empty state when nothing is found", async () => {
    apiMocks.fetchLearningVideos.mockResolvedValueOnce({ videos: [] });
    const user = userEvent.setup();

    render(<LearningVideos projectId="project-1" />);
    await user.click(
      screen.getByRole("button", { name: /find learning videos/i }),
    );

    expect(await screen.findByText(/no videos found/i)).toBeTruthy();
  });

  test("shows the server error message", async () => {
    apiMocks.fetchLearningVideos.mockRejectedValueOnce(
      new Error("YouTube search is not configured."),
    );
    const user = userEvent.setup();

    render(<LearningVideos projectId="project-1" />);
    await user.click(
      screen.getByRole("button", { name: /find learning videos/i }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("YouTube search is not configured.");
  });
});
