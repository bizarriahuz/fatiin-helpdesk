import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import Home from "../src/app/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

const page = renderToStaticMarkup(<Home />);

describe("helpdesk sign-in page", () => {
  it("shows the Fatiin Multimedia helpdesk identity", () => {
    expect(page).toContain("FATIIN MULTIMEDIA");
    expect(page).toContain("Mosque IT Helpdesk");
  });

  it("shows the sign-in fields and submit button", () => {
    expect(page).toContain('id="email"');
    expect(page).toContain('id="password"');
    expect(page).toContain(">Sign in</button>");
  });

  it("explains how users can get an account", () => {
    expect(page).toContain("Need an account? Contact your helpdesk administrator.");
  });
});
