export const ITEM_CATEGORIES = [
  { value: "furniture", label: "Furniture" },
  { value: "electronics", label: "Electronics" },
  { value: "clothing", label: "Clothing" },
  { value: "books", label: "Books" },
  { value: "household", label: "Household" },
  { value: "sports", label: "Sports" },
  { value: "toys", label: "Toys" },
  { value: "other", label: "Other" },
];

export const ITEM_CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like new" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
];

export function categoryLabel(value) {
  return ITEM_CATEGORIES.find((item) => item.value === value)?.label ?? value;
}

export function conditionLabel(value) {
  return ITEM_CONDITIONS.find((item) => item.value === value)?.label ?? value;
}
