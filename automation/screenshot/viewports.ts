import type { ViewportDefinition } from "./types";

export const DESKTOP_VIEWPORT: ViewportDefinition = {
  name: "desktop",
  width: 1920,
  height: 1080,
};

export const LAPTOP_VIEWPORT: ViewportDefinition = {
  name: "laptop",
  width: 1440,
  height: 900,
};

export const TABLET_VIEWPORT: ViewportDefinition = {
  name: "tablet",
  width: 820,
  height: 1180,
};

export const MOBILE_VIEWPORT: ViewportDefinition = {
  name: "mobile",
  width: 393,
  height: 852,
};

export const DASHBOARD_VIEWPORTS = {
  desktop: DESKTOP_VIEWPORT,
  laptop: LAPTOP_VIEWPORT,
  tablet: TABLET_VIEWPORT,
  mobile: MOBILE_VIEWPORT,
} as const;

export const ALL_DASHBOARD_VIEWPORTS: ViewportDefinition[] = [
  DESKTOP_VIEWPORT,
  LAPTOP_VIEWPORT,
  TABLET_VIEWPORT,
  MOBILE_VIEWPORT,
];
