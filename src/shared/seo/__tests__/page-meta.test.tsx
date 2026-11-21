import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PageMeta } from "../page-meta";

function clearMetadata() {
  document.head
    .querySelectorAll('title, meta[name="description"], meta[name="robots"], link[rel="canonical"]')
    .forEach((element) => element.remove());
}

afterEach(clearMetadata);

describe("PageMeta", () => {
  it("sets the document title, description, robots, and canonical URL", async () => {
    render(
      <PageMeta
        title="System Design Concepts — ScaleLab"
        description="Short explainers for system design techniques."
        path="/learn"
      />,
    );

    await waitFor(() => {
      expect(document.title).toBe("System Design Concepts — ScaleLab");
    });

    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
      "content",
      "Short explainers for system design techniques.",
    );
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      "content",
      "index, follow",
    );
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://scalelab.anirudhkille.com/learn",
    );
  });

  it("updates the title when the route changes", async () => {
    const { rerender } = render(
      <PageMeta title="Sandbox — ScaleLab" description="Run custom load." path="/sandbox" />,
    );

    await waitFor(() => {
      expect(document.title).toBe("Sandbox — ScaleLab");
    });

    rerender(
      <PageMeta
        title="Progress & Attempts — ScaleLab"
        description="Review runs."
        path="/progress"
      />,
    );

    await waitFor(() => {
      expect(document.title).toBe("Progress & Attempts — ScaleLab");
    });
    expect(document.head.querySelectorAll("title")).toHaveLength(1);
  });

  it("omits the canonical URL and marks private pages noindex", async () => {
    render(<PageMeta title="Page Not Found — ScaleLab" description="Not here." noIndex />);

    await waitFor(() => {
      expect(document.title).toBe("Page Not Found — ScaleLab");
    });

    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  });
});
