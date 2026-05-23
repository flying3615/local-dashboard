import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";

function mockApiResponses(properties = [], sources = [], schools = [], searchLinks = [], regions = [{ id: "kapiti", name: "Kapiti Coast", council: "Kapiti Coast District Council" }]) {
  vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = String(input);
    if (url.includes("/api/regions")) {
      return Promise.resolve(
        new Response(JSON.stringify(regions), { status: 200 }),
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
    if (url.includes("/api/property-search-links")) {
      return Promise.resolve(
        new Response(JSON.stringify(searchLinks), { status: 200 }),
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

describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the hero heading", async () => {
    mockApiResponses();

    render(<App />);

    expect(
      screen.getByRole("heading", { name: /Property Dashboard/i }),
    ).toBeInTheDocument();
  });

  it("shows loading state then content", async () => {
    mockApiResponses();

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

  it("has nav buttons", async () => {
    mockApiResponses();

    render(<App />);

    expect(screen.getByRole("button", { name: "Properties" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Schools" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sources" })).toBeInTheDocument();
  });

  it("shows property list on main page", async () => {
    mockApiResponses();

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("property-list")).toBeInTheDocument();
    });
  });

  it("shows school radar when clicking Schools", async () => {
    const user = userEvent.setup();
    mockApiResponses();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Schools" }));
    await waitFor(() => {
      expect(screen.getByTestId("school-radar")).toBeInTheDocument();
    });
  });

  it("shows sources view when clicking Sources", async () => {
    const user = userEvent.setup();
    mockApiResponses();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Sources" }));
    await waitFor(() => {
      expect(screen.getByTestId("sources-view")).toBeInTheDocument();
    });
  });

  it("renders region selector with regions", async () => {
    mockApiResponses([], [], [], [], [
      { id: "kapiti", name: "Kapiti Coast", council: "Kapiti Coast District Council" },
      { id: "wellington", name: "Wellington City", council: "Wellington City Council" },
    ]);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText("Select region")).toBeInTheDocument();
    });
    expect(screen.getByText("Kapiti Coast")).toBeInTheDocument();
    expect(screen.getByText("Wellington City")).toBeInTheDocument();
  });
});
