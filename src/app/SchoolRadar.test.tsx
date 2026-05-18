import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SchoolRadar } from "./SchoolRadar";

function makeSchoolWithEvents(overrides = {}) {
  return {
    school: {
      id: "school_1",
      name: "Paraparaumu College",
      schoolType: "Secondary",
      years: "9-13",
      gender: "Co-educational",
      authority: "State",
      hasZone: true,
      website: "https://paraparaumucollege.school.nz",
      area: "Paraparaumu",
      commuteFromParaparaumu: "5 minutes",
      watchStatus: "watching" as const,
    },
    events: [
      {
        id: "event_1",
        schoolId: "school_1",
        itemId: "item_1",
        eventType: "open_day",
        startsAt: "2026-06-15T00:00:00.000Z",
        deadline: "2026-06-10T00:00:00.000Z",
        enrolmentYear: 2027,
      },
    ],
    notes: [],
    ...overrides,
  };
}

describe("SchoolRadar", () => {
  it("shows empty state when no schools", () => {
    render(<SchoolRadar schools={[]} />);

    expect(screen.getByTestId("school-radar")).toBeInTheDocument();
    expect(screen.getByText("No schools tracked yet.")).toBeInTheDocument();
  });

  it("renders school card with details and events", () => {
    render(<SchoolRadar schools={[makeSchoolWithEvents()]} />);

    expect(screen.getByText("Paraparaumu College")).toBeInTheDocument();
    expect(screen.getByText("Secondary (9-13)")).toBeInTheDocument();
    expect(screen.getByText("Co-educational")).toBeInTheDocument();
    expect(screen.getByText("State")).toBeInTheDocument();
    expect(screen.getByText("Has zone")).toBeInTheDocument();
    expect(screen.getByText("5 minutes")).toBeInTheDocument();
    expect(screen.getByText("watching")).toBeInTheDocument();
    expect(screen.getByText("open day")).toBeInTheDocument();
    expect(screen.getByText("Events (1)")).toBeInTheDocument();
  });

  it("shows no zone info when hasZone is null", () => {
    const data = makeSchoolWithEvents({
      school: {
        ...makeSchoolWithEvents().school,
        hasZone: null,
      },
    });

    render(<SchoolRadar schools={[data]} />);

    expect(screen.queryByText("Has zone")).not.toBeInTheDocument();
    expect(screen.queryByText("No zone")).not.toBeInTheDocument();
  });
});
