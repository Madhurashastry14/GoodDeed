export const REQUEST_CATEGORIES = [
  { value: "food", label: "Food" },
  { value: "clothing", label: "Clothing" },
  { value: "household", label: "Household" },
  { value: "hygiene", label: "Hygiene" },
  { value: "school_supplies", label: "School supplies" },
  { value: "baby_care", label: "Baby care" },
  { value: "other", label: "Other" },
];

export const REQUEST_URGENCIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
];

export const REQUEST_STATUS_LABELS = {
  draft: "Draft",
  pending_verification: "Pending verification",
  changes_requested: "Changes requested",
  rejected: "Rejected",
  open: "Approved",
  reserved: "Reserved",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
};

export const OFFER_STATUS_LABELS = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Not selected",
  withdrawn: "Withdrawn",
  cancelled: "Cancelled",
  completed: "Completed",
};

export function categoryLabel(value) {
  return (
    REQUEST_CATEGORIES.find((option) => option.value === value)?.label ??
    "Other"
  );
}

export function urgencyLabel(value) {
  return (
    REQUEST_URGENCIES.find((option) => option.value === value)?.label ??
    "Normal"
  );
}

export function requestStatusLabel(value) {
  return REQUEST_STATUS_LABELS[value] ?? value;
}

export function offerStatusLabel(value) {
  return OFFER_STATUS_LABELS[value] ?? value;
}
