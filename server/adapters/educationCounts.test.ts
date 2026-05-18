import { describe, expect, it } from "vitest";

import { createEducationCountsAdapter } from "./educationCounts";

describe("createEducationCountsAdapter", () => {
  it("maps Wellington secondary school directory rows into school profile records", async () => {
    const adapter = createEducationCountsAdapter({
      fetchImpl: async (url) => {
        const decodedUrl = decodeURIComponent(url).replace(/\+/g, " ");
        expect(url).toContain("datastore_search_sql");
        expect(decodedUrl).toContain("Wellington Region");
        expect(decodedUrl).toContain("Secondary (Year 9-15)");

        return {
          ok: true,
          status: 200,
          statusText: "OK",
          async json() {
            return {
              success: true,
              result: {
                records: [
                  {
                    School_Id: "248",
                    Org_Name: "Paraparaumu College",
                    Org_Type: "Secondary (Year 9-15)",
                    Authority: "State",
                    CoEd_Status: "Co-Educational",
                    URL: "http://www.paraparaumucollege.school.nz",
                    Add1_Line1: "Mazengarb Road",
                    Add1_Suburb: "",
                    Add1_City: "Paraparaumu",
                    Regional_Council: "Wellington Region",
                    Enrolment_Scheme: "Yes",
                    Total: "1540",
                  },
                ],
              },
            };
          },
        };
      },
    });

    const records = await adapter.fetch();

    expect(adapter.recordType).toBe("school_profile");
    expect(records).toEqual([
      expect.objectContaining({
        schoolId: "248",
        schoolName: "Paraparaumu College",
        schoolType: "Secondary (Year 9-15)",
        years: "Year 9-15",
        gender: "co-ed",
        authority: "State",
        hasZone: true,
        website: "http://www.paraparaumucollege.school.nz",
        area: "Paraparaumu",
        address: "Mazengarb Road, Paraparaumu",
        roll: 1540,
        tags: expect.arrayContaining(["school", "secondary", "wellington_region"]),
      }),
    ]);
  });

  it("throws a source-specific error when the CKAN API rejects the query", async () => {
    const adapter = createEducationCountsAdapter({
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        async json() {
          return {
            success: false,
            error: { message: "Invalid SQL" },
          };
        },
      }),
    });

    await expect(adapter.fetch()).rejects.toThrow(
      "Education Counts API rejected the request: Invalid SQL",
    );
  });
});
