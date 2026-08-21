import type {
  AnimalHealthStatus,
  AnimalStatus,
  AnimalType,
  HealthRecordType,
} from "@/types";

export const BUSINESS = {
  name: "The Branch Farm",
  slogan: "Nayi Plug",
  established: 2026,
  location: "GG67+P95 Mahlabane, Eswatini",
  phoneDisplay: "+268 79777668",
  phoneLink: "+26879777668",
  whatsappDisplay: "+268 76581804",
  whatsappLink: "26876581804",
  currency: "E",
} as const;

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

export const ANIMAL_TYPES: SelectOption<AnimalType>[] = [
  { value: "cattle", label: "Cattle" },
  { value: "pig", label: "Pig" },
  { value: "chicken", label: "Chicken / flock" },
  { value: "goat", label: "Goat" },
  { value: "sheep", label: "Sheep" },
  { value: "other", label: "Other" },
];

export const ANIMAL_STATUSES: SelectOption<AnimalStatus>[] = [
  { value: "active", label: "Active" },
  { value: "sold", label: "Sold" },
  { value: "deceased", label: "Deceased" },
  { value: "transferred", label: "Transferred" },
];

export const HEALTH_STATUSES: SelectOption<AnimalHealthStatus>[] = [
  { value: "healthy", label: "Healthy" },
  { value: "under-observation", label: "Under observation" },
  { value: "sick", label: "Sick" },
  { value: "injured", label: "Injured" },
  { value: "recovering", label: "Recovering" },
];

export const HEALTH_RECORD_TYPES: SelectOption<HealthRecordType>[] = [
  { value: "observation", label: "Observation" },
  { value: "problem", label: "Problem" },
  { value: "vaccination", label: "Vaccination" },
  { value: "treatment", label: "Treatment" },
  { value: "examination", label: "Examination" },
  { value: "other", label: "Other" },
];

export const ACTIVITY_TYPES = [
  "Feeding",
  "Cleaning",
  "Vaccination",
  "Animal inspection",
  "Milk collection",
  "Egg collection",
  "Stock arrival",
  "Stock usage",
  "Repairs",
  "General activity",
] as const;

export const DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  pdf: "PDF",
  image: "Image",
  word: "Word document",
  excel: "Spreadsheet",
  video: "Video",
  other: "Other file",
};

function toLabels<T extends string>(options: SelectOption<T>[]): Record<T, string> {
  return options.reduce(
    (acc, option) => {
      acc[option.value] = option.label;
      return acc;
    },
    {} as Record<T, string>,
  );
}

export const ANIMAL_TYPE_LABELS = toLabels(ANIMAL_TYPES);
export const ANIMAL_STATUS_LABELS = toLabels(ANIMAL_STATUSES);
export const HEALTH_STATUS_LABELS = toLabels(HEALTH_STATUSES);
export const HEALTH_RECORD_TYPE_LABELS = toLabels(HEALTH_RECORD_TYPES);

export const STATUS_LABELS: Record<string, string> = {
  ...ANIMAL_TYPE_LABELS,
  ...ANIMAL_STATUS_LABELS,
  ...HEALTH_STATUS_LABELS,
  ...HEALTH_RECORD_TYPE_LABELS,
  ...DOCUMENT_CATEGORY_LABELS,
  active: "Active",
  healthy: "Healthy",
  "under-observation": "Under observation",
  sick: "Sick",
  injured: "Injured",
  recovering: "Recovering",
  sold: "Sold",
  deceased: "Deceased",
  transferred: "Transferred",
  admin: "Administrator",
  staff: "Staff",
  user: "Pending approval",
  disabled: "Disabled",
};
