import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

vi.mock("@legendapp/list/react", () => import("./legend-list-double"));

afterEach(() => {
  cleanup();
});
