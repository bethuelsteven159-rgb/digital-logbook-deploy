import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import AiProjectInsight from "./AiProjectInsight";

const apiMocks = vi.hoisted(() => ({
  fetchAiProjectProgress: vi.fn(),
  fetchAiProjectSpeech: vi.fn(),
}));

vi.mock("../../api/projectDetailsApi", () => ({
  fetchAiProjectProgress: apiMocks.fetchAiProjectProgress,
  fetchAiProjectSpeech: apiMocks.fetchAiProjectSpeech,
}));

const result = {
  insight: {
    headline: "Chess preparation is progressing",
    summary: "You have logged focused preparation sessions.",
    focusAreas: ["Openings", "Endgames"],
    trend: {
      direction: "up",
      label: "Increasing",
      explanation: "Activity increased this week.",
    },
    nextStep: {
      title: "Finish opening review",
      reason: "It is the clearest unfinished task.",
    },
  },
  evidence: {
    totalEntries: 10,
    loggedMinutes: 275,
    unfinishedEntries: 3,
    overdueEntries: 1,
  },
};

class FakeAudio {
  constructor(src) {
    this.src = src;
    this.currentTime = 0;
    this.ended = false;
    this.preload = "";
    FakeAudio.instances.push(this);
  }

  async play() {
    this.onplay?.();
  }

  pause() {
    this.onpause?.();
  }
}

FakeAudio.instances = [];

describe("AiProjectInsight", () => {
  beforeEach(() => {
    apiMocks.fetchAiProjectProgress.mockReset();
    apiMocks.fetchAiProjectSpeech.mockReset();
    FakeAudio.instances = [];
    vi.stubGlobal("Audio", FakeAudio);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("renders a project-specific AI insight after the user requests one", async () => {
    const user = userEvent.setup();
    apiMocks.fetchAiProjectProgress.mockResolvedValueOnce(result);

    render(<AiProjectInsight projectId="project-1" />);

    await user.click(
      screen.getByRole("button", { name: /explain my progress/i }),
    );

    expect(apiMocks.fetchAiProjectProgress).toHaveBeenCalledWith("project-1");

    expect(
      await screen.findByText("Chess preparation is progressing"),
    ).toBeInTheDocument();

    expect(screen.getByText("Openings")).toBeInTheDocument();
    expect(screen.getByText("Endgames")).toBeInTheDocument();
    expect(screen.getByText("Increasing")).toBeInTheDocument();
    expect(screen.getByText("Finish opening review")).toBeInTheDocument();
    expect(screen.getByText("4h 35m")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  test("requests TTS audio and supports pause and resume", async () => {
    const user = userEvent.setup();
    apiMocks.fetchAiProjectProgress.mockResolvedValueOnce(result);
    apiMocks.fetchAiProjectSpeech.mockResolvedValueOnce({
      audio: "ZmFrZS1hdWRpbw==",
      mimeType: "audio/wav",
    });

    render(<AiProjectInsight projectId="project-1" />);

    await user.click(
      screen.getByRole("button", { name: /explain my progress/i }),
    );

    await user.click(
      await screen.findByRole("button", { name: /listen to insight/i }),
    );

    expect(apiMocks.fetchAiProjectSpeech).toHaveBeenCalledWith(
      "project-1",
      result.insight,
    );

    expect(FakeAudio.instances).toHaveLength(1);
    expect(FakeAudio.instances[0].src).toContain(
      "data:audio/wav;base64,ZmFrZS1hdWRpbw==",
    );

    expect(
      await screen.findByRole("button", { name: /pause/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /pause/i }));
    expect(screen.getByRole("button", { name: /resume/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /resume/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /pause/i })).toBeInTheDocument();
    });
  });

  test("shows a friendly analysis failure message", async () => {
    const user = userEvent.setup();
    const error = new Error("Provider unavailable");
    error.status = 503;
    apiMocks.fetchAiProjectProgress.mockRejectedValueOnce(error);

    render(<AiProjectInsight projectId="project-1" />);

    await user.click(
      screen.getByRole("button", { name: /explain my progress/i }),
    );

    expect(
      await screen.findByText(/AI service is temporarily unavailable/i),
    ).toBeInTheDocument();
  });

  test("shows a friendly speech timeout message", async () => {
    const user = userEvent.setup();
    apiMocks.fetchAiProjectProgress.mockResolvedValueOnce(result);

    const error = new Error("timeout");
    error.status = 504;
    apiMocks.fetchAiProjectSpeech.mockRejectedValueOnce(error);

    render(<AiProjectInsight projectId="project-1" />);

    await user.click(
      screen.getByRole("button", { name: /explain my progress/i }),
    );

    await user.click(
      await screen.findByRole("button", { name: /listen to insight/i }),
    );

    expect(
      await screen.findByText(/Speech generation took too long/i),
    ).toBeInTheDocument();
  });
});
