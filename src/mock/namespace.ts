// Every question branch is served from the same origin (localhost:3002), so
// browser storage is namespaced per branch to keep sibling starters from
// reading each other's databases or mock clock.
export const STORAGE_NAMESPACE = "gcal-recurring-events";
