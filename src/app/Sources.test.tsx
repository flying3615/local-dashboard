import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Sources } from "./Sources";

function makeSource(overrides = {}) {
  return {
    id: "source_1",
    name: "Mock Properties",
    type: "property_platform",
    url: "https://example.com",
    trustLevel: "platform" as const,
    enabled: true,
    refreshIntervalMinutes: 720,
    lastSuccessAt: "2026-05-17T00:00:00.000Z",
    lastError: null,
    ...overrides,
  };
}

describe("Sources", () => {
  it("shows empty state when no sources", () => {
    render(<Sources sources={[]} />);

    expect(screen.getByTestId("sources-view")).toBeInTheDocument();
    expect(screen.getByText(/No sources configured/)).toBeInTheDocument();
  });

  it("renders source rows with status and last success", () => {
    render(<Sources sources={[makeSource()]} />);

    expect(screen.getByText("Mock Properties")).toBeInTheDocument();
    expect(screen.getByText("property_platform")).toBeInTheDocument();
    expect(screen.getByText("platform")).toBeInTheDocument();
    expect(screen.getByText("Enabled")).toBeInTheDocument();
    expect(screen.queryByText("Never")).not.toBeInTheDocument();
  });

  it("shows disabled and error state", () => {
    render(
      <Sources
        sources={[
          makeSource({
            enabled: false,
            lastSuccessAt: null,
            lastError: "Connection refused",
          }),
        ]}
      />,
    );

    expect(screen.getByText("Disabled")).toBeInTheDocument();
    expect(screen.getByText("Never")).toBeInTheDocument();
    expect(screen.getByText("Connection refused")).toBeInTheDocument();
  });

  it("renders refresh button for each source", () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    render(<Sources sources={[makeSource()]} />);

    expect(screen.getByRole("button", { name: /Refresh/ })).toBeInTheDocument();
  });
});
