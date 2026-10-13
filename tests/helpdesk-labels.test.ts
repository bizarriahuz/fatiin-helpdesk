import { describe, expect, it } from "vitest";
import {
  assetCategoryLabel,
  assetStatusLabel,
  deviceStatusLabel,
  priorityLabel,
  ticketCategoryLabel,
  ticketStatusLabel,
  ticketTypeLabel,
} from "../src/lib/helpdesk-labels";

describe("helpdesk labels", () => {
  it("shows the current ticket categories", () => {
    expect([
      "hardware",
      "software",
      "printer",
      "network",
      "email",
      "ms365",
    ].map(ticketCategoryLabel)).toEqual([
      "Hardware",
      "Software",
      "Printer",
      "Network",
      "Email",
      "MS365",
    ]);
  });

  it("uses clear ticket type, status, and priority labels", () => {
    expect(ticketTypeLabel("incident")).toBe("Incident");
    expect(ticketTypeLabel("change")).toBe("Change");
    expect(ticketStatusLabel("in_progress")).toBe("In progress");
    expect(ticketStatusLabel("closed")).toBe("Closed");
    expect(priorityLabel("normal")).toBe("Medium");
    expect(priorityLabel("urgent")).toBe("Critical");
  });

  it("uses clear asset and device status labels", () => {
    expect(assetCategoryLabel("audio_visual")).toBe("Audio or video");
    expect(assetStatusLabel("in_repair")).toBe("In repair");
    expect(deviceStatusLabel("offline")).toBe("Offline");
  });

  it("keeps readable labels for unknown values", () => {
    expect(ticketCategoryLabel("new_category")).toBe("new category");
    expect(ticketTypeLabel("new_type")).toBe("new type");
    expect(priorityLabel("custom")).toBe("custom");
  });
});
