import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DailyBriefShareCard, generateTextSummary, type ShareCardData } from "./DailyBriefShareCard";

const mockShareCardData: ShareCardData = {
  date: new Date("2025-12-22T10:00:00Z"),
  marketCall: {
    text: "Risk-on conditions — market appears constructive.",
    level: "Green",
  },
  whatChanged: ["Regime shifted to Risk-On", "Fed tone shifted more hawkish over the past week"],
  lensImpact: [{ risk: "Policy risk", asset: "AAPL" }],
  focusAssets: ["AAPL", "MSFT"],
  headlines: [
    { title: "Fed signals steady rates", category: "Macro" },
    { title: "Tech earnings beat expectations", category: "Earnings" },
  ],
  watchNext: { title: "FOMC Minutes", time: "Tomorrow", impact: "high" },
  dataStatus: "live",
  dataTimestamp: "Dec 22, 10:00 AM",
};

describe("DailyBriefShareCard", () => {
  it("renders the share card with all sections", () => {
    render(<DailyBriefShareCard data={mockShareCardData} />);

    expect(screen.getByTestId("share-card")).toBeInTheDocument();
    expect(screen.getByText("OSM Fin — Daily Brief")).toBeInTheDocument();
    expect(screen.getByText(/Risk-on conditions/)).toBeInTheDocument();
    expect(screen.getByText("Favorable Conditions")).toBeInTheDocument();
  });

  it("displays what changed bullets", () => {
    render(<DailyBriefShareCard data={mockShareCardData} />);

    expect(screen.getByText("Regime shifted to Risk-On")).toBeInTheDocument();
    expect(screen.getByText("Fed tone shifted more hawkish over the past week")).toBeInTheDocument();
  });

  it("displays lens impact when focus assets exist", () => {
    render(<DailyBriefShareCard data={mockShareCardData} />);

    expect(screen.getByText(/Policy risk/)).toBeInTheDocument();
    expect(screen.getByText("AAPL")).toBeInTheDocument();
  });

  it("displays headlines with categories", () => {
    render(<DailyBriefShareCard data={mockShareCardData} />);

    expect(screen.getByText("Fed signals steady rates")).toBeInTheDocument();
    expect(screen.getByText("Macro")).toBeInTheDocument();
    expect(screen.getByText("Tech earnings beat expectations")).toBeInTheDocument();
  });

  it("displays watch next section", () => {
    render(<DailyBriefShareCard data={mockShareCardData} />);

    expect(screen.getByText("FOMC Minutes")).toBeInTheDocument();
    expect(screen.getByText(/Tomorrow/)).toBeInTheDocument();
  });

  it("displays data status badge for live data", () => {
    render(<DailyBriefShareCard data={mockShareCardData} />);

    expect(screen.getByText("Live Data")).toBeInTheDocument();
  });

  it("displays mock data status when data is mock", () => {
    const mockData = { ...mockShareCardData, dataStatus: "mock" as const };
    render(<DailyBriefShareCard data={mockData} />);

    expect(screen.getByText("Mock Data")).toBeInTheDocument();
  });

  it("displays partial data status when data is partial", () => {
    const partialData = { ...mockShareCardData, dataStatus: "partial" as const };
    render(<DailyBriefShareCard data={partialData} />);

    expect(screen.getByText("Partial Data")).toBeInTheDocument();
  });

  it("shows placeholder when no focus assets", () => {
    const noAssetsData = { ...mockShareCardData, focusAssets: [], lensImpact: [] };
    render(<DailyBriefShareCard data={noAssetsData} />);

    expect(screen.getByText("Add focus assets to see lens impact")).toBeInTheDocument();
  });

  it("shows placeholder when no changes", () => {
    const noChangesData = { ...mockShareCardData, whatChanged: [] };
    render(<DailyBriefShareCard data={noChangesData} />);

    expect(screen.getByText("No major changes")).toBeInTheDocument();
  });

  it("shows disclaimer in footer", () => {
    render(<DailyBriefShareCard data={mockShareCardData} />);

    expect(screen.getByText("Informational only. Not investment advice.")).toBeInTheDocument();
  });
});

describe("generateTextSummary", () => {
  it("generates correct text summary format", () => {
    const summary = generateTextSummary(mockShareCardData);

    expect(summary).toContain("OSM Fin Daily Brief");
    expect(summary).toContain("MARKET CALL:");
    expect(summary).toContain("Risk-on conditions");
    expect(summary).toContain("KEY DRIVERS:");
    expect(summary).toContain("Regime shifted to Risk-On");
    expect(summary).toContain("WATCH NEXT:");
    expect(summary).toContain("FOMC Minutes");
    expect(summary).toContain("Data Status: Live");
    expect(summary).toContain("Informational only. Not investment advice.");
  });

  it("includes mock status in summary", () => {
    const mockData = { ...mockShareCardData, dataStatus: "mock" as const };
    const summary = generateTextSummary(mockData);

    expect(summary).toContain("Data Status: Mock");
  });

  it("handles no changes gracefully", () => {
    const noChangesData = { ...mockShareCardData, whatChanged: [] };
    const summary = generateTextSummary(noChangesData);

    expect(summary).toContain("No major changes today");
  });
});
