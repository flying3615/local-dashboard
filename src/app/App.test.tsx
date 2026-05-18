import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";

function mockApiResponses(dashboard = {}, sources = [], properties = [], schools = []) {
  vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = String(input);
    if (url.includes("/api/dashboard")) {
      return Promise.resolve(
        new Response(JSON.stringify(dashboard), { status: 200 }),
      );
    }
    if (url.includes("/api/sources")) {
      return Promise.resolve(
        new Response(JSON.stringify(sources), { status: 200 }),
      );
    }
    if (url.includes("/api/schools")) {
      return Promise.resolve(
        new Response(JSON.stringify(schools), { status: 200 }),
      );
    }
    if (url.includes("/api/properties") && (!init || init.method !== "POST")) {
      return Promise.resolve(
        new Response(JSON.stringify(properties), { status: 200 }),
      );
    }
    return Promise.resolve(new Response(null, { status: 404 }));
  });
}

function emptyDashboard() {
  return {
    sections: {
      new_listings: [],
      upcoming_open_homes: [],
      school_events: [],
      needs_review: [],
      recent_activity: [],
    },
    totalItems: 0,
  };
}

describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the dashboard heading", async () => {
    mockApiResponses(emptyDashboard());

    render(<App />);

    expect(
      screen.getByRole("heading", { name: /Paraparaumu Dashboard/i }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("dashboard")).toBeInTheDocument();
    });
  });

  it("shows loading state then content", async () => {
    mockApiResponses(emptyDashboard());

    render(<App />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });
  });

  it("shows error with retry button on API failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("has tab navigation buttons", async () => {
    mockApiResponses(emptyDashboard());

    render(<App />);

    expect(screen.getByRole("button", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Properties" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Schools" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sources" })).toBeInTheDocument();
  });

  it("shows property list when switching to properties tab", async () => {
    const user = userEvent.setup();
    mockApiResponses(emptyDashboard());

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Properties" }));
    await waitFor(() => {
      expect(screen.getByTestId("property-list")).toBeInTheDocument();
    });
  });

  it("shows school radar when switching to schools tab", async () => {
    const user = userEvent.setup();
    mockApiResponses(emptyDashboard());

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Schools" }));
    await waitFor(() => {
      expect(screen.getByTestId("school-radar")).toBeInTheDocument();
    });
  });

  it("shows sources view when switching to sources tab", async () => {
    const user = userEvent.setup();
    mockApiResponses(emptyDashboard());

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Sources" }));
    await waitFor(() => {
      expect(screen.getByTestId("sources-view")).toBeInTheDocument();
    });
  });
});
