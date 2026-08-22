import type {
  FarmModule,
  FarmOperationRecord,
  OperationPriority,
  OperationValue,
  OperationValues,
} from "@/types";

export type OperationFieldType =
  | "text"
  | "number"
  | "date"
  | "time"
  | "textarea"
  | "select"
  | "animal"
  | "staff"
  | "checkbox";

export interface OperationFieldOption {
  value: string;
  label: string;
}

export interface OperationFieldDefinition {
  key: string;
  label: string;
  type: OperationFieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  section?: string;
  unit?: string;
  min?: number;
  step?: number;
  options?: OperationFieldOption[];
  /** Fields staff may change after a task has been assigned. */
  staffEditable?: boolean;
}

export interface FarmModuleDefinition {
  module: FarmModule;
  route: string;
  label: string;
  singular: string;
  description: string;
  prefix: string;
  permission: "Farm Operations";
  fields: OperationFieldDefinition[];
  primaryField: string;
  dateField: string;
  statusField?: string;
  priorityField?: string;
  animalField?: string;
  assignedToField?: string;
  approvalRequired?: boolean;
  adminCreatesOnly?: boolean;
  emptyTitle: string;
  emptyDescription: string;
}

const select = (values: Array<string | [string, string]>): OperationFieldOption[] =>
  values.map((value) =>
    Array.isArray(value) ? { value: value[0], label: value[1] } : { value, label: value },
  );

const animalTypes = select([
  ["cattle", "Cattle"],
  ["pig", "Pig"],
  ["chicken", "Chicken / poultry"],
  ["goat", "Goat"],
  ["sheep", "Sheep"],
  ["other", "Other"],
]);

const sexes = select([["female", "Female"], ["male", "Male"]]);
const priorities = select([
  ["low", "Low"],
  ["medium", "Medium"],
  ["high", "High"],
  ["critical", "Critical"],
]);

export const FARM_MODULES: Record<FarmModule, FarmModuleDefinition> = {
  weight: {
    module: "weight",
    route: "/weights",
    label: "Weight & growth",
    singular: "weight record",
    description: "Track every weigh-in and see growth over time instead of one static weight.",
    prefix: "WGT",
    permission: "Farm Operations",
    primaryField: "animalId",
    dateField: "date",
    animalField: "animalId",
    fields: [
      { key: "animalId", label: "Animal", type: "animal", required: true, section: "Weigh-in" },
      { key: "date", label: "Date weighed", type: "date", required: true, section: "Weigh-in" },
      { key: "previousWeight", label: "Previous weight", type: "number", min: 0, step: 0.1, unit: "kg", section: "Measurements" },
      { key: "currentWeight", label: "Current weight", type: "number", required: true, min: 0, step: 0.1, unit: "kg", section: "Measurements" },
      { key: "bodyCondition", label: "Body condition", type: "select", options: select(["Excellent", "Good", "Fair", "Poor", "Critical"]), section: "Measurements" },
      { key: "growthNotes", label: "Growth notes", type: "textarea", placeholder: "Diet, condition or growth observations", section: "Notes" },
    ],
    emptyTitle: "No weights recorded",
    emptyDescription: "Record the first weigh-in to begin this animal's growth history.",
  },
  breeding: {
    module: "breeding",
    route: "/breeding",
    label: "Breeding & reproduction",
    singular: "breeding record",
    description: "Monitor mating, pregnancy, expected births, outcomes and offspring links.",
    prefix: "BRD",
    permission: "Farm Operations",
    primaryField: "femaleAnimalId",
    dateField: "breedingDate",
    statusField: "pregnancyStatus",
    animalField: "femaleAnimalId",
    fields: [
      { key: "femaleAnimalId", label: "Female / mother animal", type: "animal", required: true, section: "Animals" },
      { key: "maleAnimalId", label: "Male / partner animal", type: "animal", section: "Animals" },
      { key: "breedingDate", label: "Breeding date", type: "date", required: true, section: "Breeding" },
      { key: "method", label: "Breeding method", type: "select", options: select(["Natural", "Artificial insemination", "Unknown"]), section: "Breeding" },
      { key: "pregnancyStatus", label: "Pregnancy status", type: "select", required: true, options: select([["planned", "Planned"], ["awaiting-check", "Awaiting check"], ["confirmed", "Confirmed pregnant"], ["not-pregnant", "Not pregnant"], ["completed", "Birth completed"]]), section: "Pregnancy" },
      { key: "pregnancyCheckDate", label: "Pregnancy check date", type: "date", section: "Pregnancy" },
      { key: "expectedBirthDate", label: "Expected birth date", type: "date", section: "Pregnancy" },
      { key: "actualBirthDate", label: "Actual birth date", type: "date", section: "Outcome" },
      { key: "offspringCount", label: "Number of offspring", type: "number", min: 0, step: 1, section: "Outcome" },
      { key: "offspringTags", label: "Offspring IDs / tags", type: "text", placeholder: "Separate multiple tags with commas", section: "Outcome" },
      { key: "complications", label: "Problems / complications", type: "textarea", section: "Outcome" },
      { key: "outcome", label: "Outcome", type: "textarea", section: "Outcome" },
      { key: "notes", label: "Breeding notes", type: "textarea", section: "Notes" },
    ],
    emptyTitle: "No breeding records",
    emptyDescription: "Create a breeding record to monitor pregnancy and expected births.",
  },
  birth: {
    module: "birth",
    route: "/births",
    label: "Births",
    singular: "birth record",
    description: "Register a newborn and automatically create its permanent animal profile.",
    prefix: "BTH",
    permission: "Farm Operations",
    primaryField: "tagNumber",
    dateField: "birthDate",
    animalField: "motherId",
    fields: [
      { key: "motherId", label: "Mother", type: "animal", required: true, section: "Parents" },
      { key: "fatherId", label: "Father (where known)", type: "animal", section: "Parents" },
      { key: "animalType", label: "Animal type", type: "select", required: true, options: animalTypes, section: "New animal" },
      { key: "birthDate", label: "Birth date", type: "date", required: true, section: "New animal" },
      { key: "sex", label: "Sex", type: "select", required: true, options: sexes, section: "New animal" },
      { key: "breed", label: "Breed", type: "text", required: true, section: "New animal" },
      { key: "birthWeight", label: "Birth weight", type: "number", min: 0, step: 0.1, unit: "kg", section: "New animal" },
      { key: "tagNumber", label: "Tag / animal ID", type: "text", required: true, section: "New animal" },
      { key: "name", label: "Name / nickname", type: "text", section: "New animal" },
      { key: "colour", label: "Colour / identifying features", type: "text", section: "New animal" },
      { key: "location", label: "Current location", type: "text", required: true, section: "New animal" },
      { key: "healthNotes", label: "Birth health notes", type: "textarea", section: "Health" },
    ],
    emptyTitle: "No births recorded",
    emptyDescription: "Record a new birth and the system will create the animal's permanent profile.",
  },
  acquisition: {
    module: "acquisition",
    route: "/acquisitions",
    label: "Animal acquisitions",
    singular: "acquisition",
    description: "Record purchased or transferred-in animals with seller, cost and transport evidence.",
    prefix: "ACQ",
    permission: "Farm Operations",
    primaryField: "tagNumber",
    dateField: "purchaseDate",
    approvalRequired: true,
    fields: [
      { key: "animalType", label: "Animal type", type: "select", required: true, options: animalTypes, section: "Animal" },
      { key: "tagNumber", label: "Tag / animal ID", type: "text", required: true, section: "Animal" },
      { key: "name", label: "Name / nickname", type: "text", section: "Animal" },
      { key: "breed", label: "Breed", type: "text", required: true, section: "Animal" },
      { key: "sex", label: "Sex", type: "select", required: true, options: sexes, section: "Animal" },
      { key: "estimatedAge", label: "Age / estimated age", type: "text", section: "Animal" },
      { key: "weight", label: "Weight", type: "number", min: 0, step: 0.1, unit: "kg", section: "Animal" },
      { key: "purchaseDate", label: "Purchase / acquisition date", type: "date", required: true, section: "Acquisition" },
      { key: "purchasePrice", label: "Purchase price", type: "number", min: 0, step: 0.01, unit: "E", section: "Acquisition" },
      { key: "seller", label: "Seller / source", type: "text", required: true, section: "Acquisition" },
      { key: "sellerContact", label: "Seller contact", type: "text", section: "Acquisition" },
      { key: "purchasedFor", label: "Purchased by / for", type: "text", section: "Acquisition" },
      { key: "transportInformation", label: "Transport information", type: "textarea", section: "Acquisition" },
      { key: "location", label: "Current farm location", type: "text", required: true, section: "Farm record" },
      { key: "notes", label: "Notes", type: "textarea", section: "Farm record" },
    ],
    emptyTitle: "No acquisitions recorded",
    emptyDescription: "Add a purchased or transferred-in animal with its complete acquisition history.",
  },
  movement: {
    module: "movement",
    route: "/movements",
    label: "Sales & transfers",
    singular: "sale or transfer",
    description: "Keep animals in history when they leave; their status is updated, never silently removed.",
    prefix: "MOV",
    permission: "Farm Operations",
    primaryField: "animalId",
    dateField: "movementDate",
    statusField: "movementType",
    animalField: "animalId",
    approvalRequired: true,
    fields: [
      { key: "animalId", label: "Animal", type: "animal", required: true, section: "Movement" },
      { key: "movementType", label: "Movement type", type: "select", required: true, options: select([["sold", "Sale"], ["transferred", "Transfer"], ["deceased", "Death / loss"]]), section: "Movement" },
      { key: "movementDate", label: "Sale / transfer date", type: "date", required: true, section: "Movement" },
      { key: "buyerRecipient", label: "Buyer / recipient", type: "text", section: "Recipient" },
      { key: "salePrice", label: "Sale price", type: "number", min: 0, step: 0.01, unit: "E", section: "Recipient" },
      { key: "destination", label: "Destination", type: "text", section: "Recipient" },
      { key: "reason", label: "Reason", type: "textarea", required: true, section: "Details" },
      { key: "documentReference", label: "Supporting document reference", type: "text", section: "Details" },
      { key: "notes", label: "Notes", type: "textarea", section: "Details" },
    ],
    emptyTitle: "No sales or transfers",
    emptyDescription: "Record an animal leaving the farm without deleting its history.",
  },
  feed: {
    module: "feed",
    route: "/feed",
    label: "Feed management",
    singular: "feed transaction",
    description: "Track feed received, used, wasted and remaining, with automatic low-stock warnings.",
    prefix: "FED",
    permission: "Farm Operations",
    primaryField: "feedType",
    dateField: "date",
    statusField: "stockStatus",
    fields: [
      { key: "feedType", label: "Feed type", type: "text", required: true, section: "Feed" },
      { key: "transactionType", label: "Transaction", type: "select", required: true, options: select(["Received", "Used", "Stock count", "Adjustment"]), section: "Feed" },
      { key: "date", label: "Date", type: "date", required: true, section: "Feed" },
      { key: "openingQuantity", label: "Opening quantity", type: "number", min: 0, step: 0.1, section: "Quantity" },
      { key: "quantityReceived", label: "Quantity received", type: "number", min: 0, step: 0.1, section: "Quantity" },
      { key: "quantityUsed", label: "Quantity used", type: "number", min: 0, step: 0.1, section: "Quantity" },
      { key: "wastage", label: "Wastage", type: "number", min: 0, step: 0.1, section: "Quantity" },
      { key: "unit", label: "Unit", type: "select", required: true, options: select(["kg", "bags", "bales", "litres", "units"]), section: "Quantity" },
      { key: "remaining", label: "Quantity remaining", type: "number", min: 0, step: 0.1, hint: "Calculated automatically from opening + received − used − wastage.", section: "Quantity" },
      { key: "reorderLevel", label: "Low-stock level", type: "number", min: 0, step: 0.1, section: "Quantity" },
      { key: "supplier", label: "Supplier", type: "text", section: "Source & use" },
      { key: "cost", label: "Cost", type: "number", min: 0, step: 0.01, unit: "E", section: "Source & use" },
      { key: "animalGroup", label: "Animals / group receiving feed", type: "text", section: "Source & use" },
      { key: "storageLocation", label: "Storage location", type: "text", section: "Source & use" },
      { key: "notes", label: "Notes", type: "textarea", section: "Notes" },
    ],
    emptyTitle: "No feed transactions",
    emptyDescription: "Record feed received or used to start monitoring stock.",
  },
  inventory: {
    module: "inventory",
    route: "/inventory",
    label: "Farm inventory",
    singular: "inventory record",
    description: "Manage medicine, vaccines, tools, cleaning supplies, packaging, parts and other stock.",
    prefix: "INV",
    permission: "Farm Operations",
    primaryField: "itemName",
    dateField: "date",
    statusField: "stockStatus",
    fields: [
      { key: "itemName", label: "Item name", type: "text", required: true, section: "Item" },
      { key: "category", label: "Category", type: "select", required: true, options: select(["Medicine", "Vaccine", "Equipment", "Tools", "Cleaning supplies", "Packaging", "Spare parts", "Other supplies"]), section: "Item" },
      { key: "transactionType", label: "Transaction", type: "select", required: true, options: select(["Received", "Used", "Stock count", "Adjustment"]), section: "Item" },
      { key: "date", label: "Date", type: "date", required: true, section: "Item" },
      { key: "openingQuantity", label: "Opening quantity", type: "number", min: 0, step: 0.1, section: "Stock" },
      { key: "quantityReceived", label: "Quantity received", type: "number", min: 0, step: 0.1, section: "Stock" },
      { key: "quantityUsed", label: "Quantity used", type: "number", min: 0, step: 0.1, section: "Stock" },
      { key: "remaining", label: "Quantity remaining", type: "number", min: 0, step: 0.1, hint: "Calculated automatically.", section: "Stock" },
      { key: "reorderLevel", label: "Low-stock level", type: "number", min: 0, step: 0.1, section: "Stock" },
      { key: "unit", label: "Unit", type: "text", required: true, placeholder: "bottles, units, kg…", section: "Stock" },
      { key: "supplier", label: "Supplier", type: "text", section: "Details" },
      { key: "cost", label: "Cost", type: "number", min: 0, step: 0.01, unit: "E", section: "Details" },
      { key: "storageLocation", label: "Storage location", type: "text", section: "Details" },
      { key: "usedFor", label: "Animal / group / activity", type: "text", section: "Details" },
      { key: "notes", label: "Notes", type: "textarea", section: "Notes" },
    ],
    emptyTitle: "No inventory records",
    emptyDescription: "Record stock received or used to establish the farm inventory.",
  },
  milk: {
    module: "milk",
    route: "/milk-production",
    label: "Milk production",
    singular: "milk production record",
    description: "Capture morning and evening yield, waste, sales and on-farm use.",
    prefix: "MLK",
    permission: "Farm Operations",
    primaryField: "animalGroup",
    dateField: "date",
    animalField: "animalId",
    fields: [
      { key: "date", label: "Production date", type: "date", required: true, section: "Production" },
      { key: "animalId", label: "Animal (optional)", type: "animal", section: "Production" },
      { key: "animalGroup", label: "Animal / herd group", type: "text", required: true, section: "Production" },
      { key: "morningProduction", label: "Morning production", type: "number", min: 0, step: 0.1, unit: "L", section: "Yield" },
      { key: "eveningProduction", label: "Evening production", type: "number", min: 0, step: 0.1, unit: "L", section: "Yield" },
      { key: "totalProduction", label: "Total production", type: "number", min: 0, step: 0.1, unit: "L", hint: "Calculated automatically.", section: "Yield" },
      { key: "spoiledQuantity", label: "Spoiled / wasted", type: "number", min: 0, step: 0.1, unit: "L", section: "Allocation" },
      { key: "quantitySold", label: "Quantity sold", type: "number", min: 0, step: 0.1, unit: "L", section: "Allocation" },
      { key: "farmUse", label: "Used on farm", type: "number", min: 0, step: 0.1, unit: "L", section: "Allocation" },
      { key: "remaining", label: "Remaining", type: "number", min: 0, step: 0.1, unit: "L", hint: "Calculated automatically.", section: "Allocation" },
      { key: "notes", label: "Notes", type: "textarea", section: "Notes" },
    ],
    emptyTitle: "No milk production recorded",
    emptyDescription: "Record today's morning and evening milk production.",
  },
  eggs: {
    module: "eggs",
    route: "/egg-production",
    label: "Egg production",
    singular: "egg production record",
    description: "Track collected, good, damaged, sold, used and remaining eggs.",
    prefix: "EGG",
    permission: "Farm Operations",
    primaryField: "flock",
    dateField: "date",
    fields: [
      { key: "date", label: "Collection date", type: "date", required: true, section: "Collection" },
      { key: "flock", label: "Flock / poultry group", type: "text", required: true, section: "Collection" },
      { key: "eggsCollected", label: "Eggs collected", type: "number", required: true, min: 0, step: 1, section: "Collection" },
      { key: "goodEggs", label: "Good eggs", type: "number", min: 0, step: 1, section: "Quality" },
      { key: "damagedEggs", label: "Damaged / broken", type: "number", min: 0, step: 1, section: "Quality" },
      { key: "sold", label: "Sold", type: "number", min: 0, step: 1, section: "Allocation" },
      { key: "used", label: "Used on farm", type: "number", min: 0, step: 1, section: "Allocation" },
      { key: "remaining", label: "Remaining", type: "number", min: 0, step: 1, hint: "Calculated automatically from good eggs − sold − used.", section: "Allocation" },
      { key: "notes", label: "Notes", type: "textarea", section: "Notes" },
    ],
    emptyTitle: "No egg production recorded",
    emptyDescription: "Record today's egg collection and quality split.",
  },
  "daily-log": {
    module: "daily-log",
    route: "/daily-log",
    label: "Daily farm log",
    singular: "daily farm log",
    description: "A complete daily picture of feeding, cleaning, checks, events and observations.",
    prefix: "LOG",
    permission: "Farm Operations",
    primaryField: "date",
    dateField: "date",
    fields: [
      { key: "date", label: "Log date", type: "date", required: true, section: "Day" },
      { key: "shift", label: "Shift", type: "select", options: select(["Full day", "Morning", "Afternoon", "Night"]), section: "Day" },
      { key: "feedingCompleted", label: "Feeding completed", type: "checkbox", section: "Routine checks" },
      { key: "cleaningCompleted", label: "Cleaning completed", type: "checkbox", section: "Routine checks" },
      { key: "animalsChecked", label: "Animals checked", type: "checkbox", section: "Routine checks" },
      { key: "vaccinations", label: "Vaccinations", type: "textarea", section: "Animal events" },
      { key: "treatments", label: "Treatments", type: "textarea", section: "Animal events" },
      { key: "birthsDeaths", label: "Births / deaths", type: "textarea", section: "Animal events" },
      { key: "purchasesSales", label: "Purchases / sales", type: "textarea", section: "Farm events" },
      { key: "repairsDeliveries", label: "Repairs / deliveries", type: "textarea", section: "Farm events" },
      { key: "problems", label: "Problems noticed", type: "textarea", section: "Observations" },
      { key: "observations", label: "General observations", type: "textarea", required: true, section: "Observations" },
    ],
    emptyTitle: "No daily logs",
    emptyDescription: "Record today's work so management has a clear picture from anywhere.",
  },
  incident: {
    module: "incident",
    route: "/incidents",
    label: "Problems & incidents",
    singular: "incident report",
    description: "Report sick or missing animals, failures, shortages, security and urgent farm problems.",
    prefix: "INC",
    permission: "Farm Operations",
    primaryField: "category",
    dateField: "date",
    statusField: "status",
    priorityField: "severity",
    animalField: "animalId",
    fields: [
      { key: "category", label: "Problem type", type: "select", required: true, options: select(["Sick animal", "Missing animal", "Injured animal", "Equipment failure", "Water problem", "Electricity problem", "Feed shortage", "Security problem", "Disease concern", "Damaged property", "Other farm issue"]), section: "Incident" },
      { key: "date", label: "Date noticed", type: "date", required: true, section: "Incident" },
      { key: "time", label: "Time noticed", type: "time", section: "Incident" },
      { key: "location", label: "Location", type: "text", required: true, section: "Incident" },
      { key: "animalId", label: "Related animal", type: "animal", section: "Incident" },
      { key: "severity", label: "Severity", type: "select", required: true, options: priorities, section: "Assessment" },
      { key: "status", label: "Status", type: "select", required: true, options: select([["open", "Open"], ["investigating", "Investigating"], ["monitoring", "Monitoring"], ["resolved", "Resolved"]]), section: "Assessment", staffEditable: true },
      { key: "description", label: "Description", type: "textarea", required: true, section: "Details" },
      { key: "immediateAction", label: "Immediate action taken", type: "textarea", section: "Details", staffEditable: true },
      { key: "resolution", label: "Resolution / follow-up", type: "textarea", section: "Resolution", staffEditable: true },
    ],
    emptyTitle: "No incident reports",
    emptyDescription: "Problems reported by staff will appear here immediately for management review.",
  },
  task: {
    module: "task",
    route: "/tasks",
    label: "Tasks",
    singular: "task",
    description: "Administrators assign work; staff record progress, completion notes and evidence.",
    prefix: "TSK",
    permission: "Farm Operations",
    primaryField: "task",
    dateField: "assignedDate",
    statusField: "status",
    priorityField: "priority",
    assignedToField: "assignedTo",
    adminCreatesOnly: true,
    fields: [
      { key: "task", label: "Task", type: "text", required: true, section: "Assignment" },
      { key: "description", label: "Instructions", type: "textarea", required: true, section: "Assignment" },
      { key: "assignedTo", label: "Assigned to", type: "staff", required: true, section: "Assignment" },
      { key: "assignedDate", label: "Assigned date", type: "date", required: true, section: "Schedule" },
      { key: "dueDate", label: "Due date", type: "date", required: true, section: "Schedule" },
      { key: "priority", label: "Priority", type: "select", required: true, options: priorities, section: "Schedule" },
      { key: "status", label: "Status", type: "select", required: true, options: select([["pending", "Pending"], ["in-progress", "In progress"], ["completed", "Completed"], ["blocked", "Blocked"], ["cancelled", "Cancelled"]]), section: "Progress", staffEditable: true },
      { key: "completionDate", label: "Completion date", type: "date", section: "Progress", staffEditable: true },
      { key: "completionNote", label: "Completion / progress note", type: "textarea", section: "Progress", staffEditable: true },
    ],
    emptyTitle: "No tasks assigned",
    emptyDescription: "Administrators can assign operational work and follow completion here.",
  },
  equipment: {
    module: "equipment",
    route: "/equipment",
    label: "Equipment & machinery",
    singular: "equipment record",
    description: "A permanent asset register with condition, location, assignment and supporting files.",
    prefix: "EQU",
    permission: "Farm Operations",
    primaryField: "equipmentName",
    dateField: "purchaseDate",
    statusField: "condition",
    assignedToField: "assignedTo",
    fields: [
      { key: "equipmentName", label: "Equipment name", type: "text", required: true, section: "Asset" },
      { key: "category", label: "Category", type: "select", required: true, options: select(["Vehicle", "Machinery", "Dairy equipment", "Poultry equipment", "Tool", "Pump", "Generator", "Other"]), section: "Asset" },
      { key: "assetNumber", label: "Asset number", type: "text", required: true, section: "Asset" },
      { key: "serialNumber", label: "Serial number", type: "text", section: "Asset" },
      { key: "makeModel", label: "Make / model", type: "text", section: "Asset" },
      { key: "purchaseDate", label: "Purchase date", type: "date", required: true, section: "Purchase" },
      { key: "purchasePrice", label: "Purchase price", type: "number", min: 0, step: 0.01, unit: "E", section: "Purchase" },
      { key: "condition", label: "Current condition", type: "select", required: true, options: select([["good", "Good"], ["fair", "Fair"], ["needs-attention", "Needs attention"], ["out-of-service", "Out of service"]]), section: "Current status" },
      { key: "location", label: "Location", type: "text", required: true, section: "Current status" },
      { key: "assignedTo", label: "Assigned staff", type: "staff", section: "Current status" },
      { key: "nextMaintenanceDate", label: "Next maintenance date", type: "date", section: "Maintenance" },
      { key: "notes", label: "Notes", type: "textarea", section: "Notes" },
    ],
    emptyTitle: "No equipment registered",
    emptyDescription: "Add machinery and tools to protect the farm's asset history.",
  },
  maintenance: {
    module: "maintenance",
    route: "/maintenance",
    label: "Maintenance",
    singular: "maintenance record",
    description: "Track faults, repairs, parts, cost, technicians and upcoming service dates.",
    prefix: "MNT",
    permission: "Farm Operations",
    primaryField: "equipmentName",
    dateField: "reportedDate",
    statusField: "status",
    priorityField: "priority",
    fields: [
      { key: "equipmentName", label: "Equipment", type: "text", required: true, section: "Asset" },
      { key: "assetNumber", label: "Asset / serial number", type: "text", section: "Asset" },
      { key: "reportedDate", label: "Date reported", type: "date", required: true, section: "Issue" },
      { key: "problem", label: "Problem", type: "textarea", required: true, section: "Issue" },
      { key: "priority", label: "Priority", type: "select", required: true, options: priorities, section: "Issue" },
      { key: "status", label: "Status", type: "select", required: true, options: select([["reported", "Reported"], ["scheduled", "Scheduled"], ["in-repair", "In repair"], ["completed", "Completed"], ["unrepairable", "Unrepairable"]]), section: "Issue", staffEditable: true },
      { key: "repairDate", label: "Repair date", type: "date", section: "Repair", staffEditable: true },
      { key: "workPerformed", label: "Work performed", type: "textarea", section: "Repair", staffEditable: true },
      { key: "partsUsed", label: "Parts used", type: "textarea", section: "Repair", staffEditable: true },
      { key: "cost", label: "Repair cost", type: "number", min: 0, step: 0.01, unit: "E", section: "Repair", staffEditable: true },
      { key: "technician", label: "Technician", type: "text", section: "Repair", staffEditable: true },
      { key: "nextMaintenanceDate", label: "Next maintenance date", type: "date", section: "Follow-up", staffEditable: true },
      { key: "notes", label: "Notes", type: "textarea", section: "Follow-up", staffEditable: true },
    ],
    emptyTitle: "No maintenance records",
    emptyDescription: "Report equipment needing repair or record completed maintenance.",
  },
  expense: {
    module: "expense",
    route: "/expenses",
    label: "Farm expenses",
    singular: "expense",
    description: "Staff record operational costs and receipts; administrators review and approve them.",
    prefix: "EXP",
    permission: "Farm Operations",
    primaryField: "description",
    dateField: "date",
    statusField: "paymentStatus",
    approvalRequired: true,
    fields: [
      { key: "date", label: "Expense date", type: "date", required: true, section: "Expense" },
      { key: "category", label: "Category", type: "select", required: true, options: select(["Feed", "Veterinary", "Medicine / vaccines", "Equipment", "Repairs", "Fuel", "Utilities", "Transport", "Staff", "Farm supplies", "Other"]), section: "Expense" },
      { key: "description", label: "Description", type: "textarea", required: true, section: "Expense" },
      { key: "amount", label: "Amount", type: "number", required: true, min: 0, step: 0.01, unit: "E", section: "Payment" },
      { key: "supplier", label: "Supplier / payee", type: "text", section: "Payment" },
      { key: "paymentMethod", label: "Payment method", type: "select", options: select(["Cash", "EFT / bank transfer", "MTN MoMo", "E-Mali", "Credit", "Other"]), section: "Payment" },
      { key: "paymentStatus", label: "Payment status", type: "select", required: true, options: select([["paid", "Paid"], ["pending", "Pending payment"], ["partial", "Partially paid"]]), section: "Payment" },
      { key: "receiptNumber", label: "Receipt / invoice number", type: "text", section: "Supporting details" },
      { key: "relatedActivity", label: "Related farm activity", type: "text", section: "Supporting details" },
      { key: "notes", label: "Notes", type: "textarea", section: "Supporting details" },
    ],
    emptyTitle: "No farm expenses",
    emptyDescription: "Record an operational expense and attach its receipt for review.",
  },
};

export const FARM_MODULE_LIST = Object.values(FARM_MODULES);

export function moduleDefinition(module: FarmModule) {
  return FARM_MODULES[module];
}

export function defaultOperationValues(definition: FarmModuleDefinition, date = new Date()): Record<string, string | boolean> {
  const iso = date.toISOString().slice(0, 10);
  const defaults: Record<string, string | boolean> = {};
  for (const field of definition.fields) {
    if (field.type === "checkbox") defaults[field.key] = false;
    else if (field.type === "date" && field.key === definition.dateField) defaults[field.key] = iso;
    else defaults[field.key] = field.options?.[0]?.value || "";
  }
  if (definition.module === "incident") {
    defaults.severity = "medium";
    defaults.status = "open";
  }
  if (definition.module === "task") {
    defaults.priority = "medium";
    defaults.status = "pending";
  }
  return defaults;
}

function asNumber(values: OperationValues, key: string) {
  const value = values[key];
  const number = typeof value === "number" ? value : Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

/** Convert form strings to safe domain values and calculate production/stock totals. */
export function normalizeOperationValues(
  definition: FarmModuleDefinition,
  input: Record<string, string | boolean | number | null>,
): OperationValues {
  const values: OperationValues = {};
  for (const field of definition.fields) {
    const raw = input[field.key];
    if (field.type === "checkbox") values[field.key] = Boolean(raw);
    else if (field.type === "number") {
      if (raw === "" || raw == null) values[field.key] = null;
      else {
        const value = Number(raw);
        values[field.key] = Number.isFinite(value) ? Math.max(field.min ?? -Infinity, value) : null;
      }
    } else values[field.key] = typeof raw === "string" ? raw.trim() : String(raw ?? "");
  }

  if (definition.module === "feed") {
    const remaining = Math.max(0, asNumber(values, "openingQuantity") + asNumber(values, "quantityReceived") - asNumber(values, "quantityUsed") - asNumber(values, "wastage"));
    values.remaining = remaining;
    values.stockStatus = remaining <= asNumber(values, "reorderLevel") ? "low" : "in-stock";
  }
  if (definition.module === "inventory") {
    const remaining = Math.max(0, asNumber(values, "openingQuantity") + asNumber(values, "quantityReceived") - asNumber(values, "quantityUsed"));
    values.remaining = remaining;
    values.stockStatus = remaining <= asNumber(values, "reorderLevel") ? "low" : "in-stock";
  }
  if (definition.module === "milk") {
    const total = asNumber(values, "morningProduction") + asNumber(values, "eveningProduction");
    values.totalProduction = total;
    values.remaining = Math.max(0, total - asNumber(values, "spoiledQuantity") - asNumber(values, "quantitySold") - asNumber(values, "farmUse"));
  }
  if (definition.module === "eggs") {
    const collected = asNumber(values, "eggsCollected");
    const damaged = asNumber(values, "damagedEggs");
    const good = values.goodEggs == null ? Math.max(0, collected - damaged) : asNumber(values, "goodEggs");
    values.goodEggs = good;
    values.remaining = Math.max(0, good - asNumber(values, "sold") - asNumber(values, "used"));
  }
  return values;
}

export function validateOperationValues(definition: FarmModuleDefinition, values: OperationValues): string | null {
  for (const field of definition.fields) {
    if (!field.required) continue;
    const value = values[field.key];
    if (value == null || value === "") return `${field.label} is required.`;
    if (field.type === "number" && !Number.isFinite(Number(value))) return `${field.label} must be a number.`;
  }
  if (["feed", "inventory"].includes(definition.module)) {
    const quantityKeys = ["openingQuantity", "quantityReceived", "quantityUsed", "wastage"];
    if (quantityKeys.every((key) => values[key] == null)) return "Enter at least one stock quantity.";
  }
  if (definition.module === "milk" && values.morningProduction == null && values.eveningProduction == null) {
    return "Enter morning or evening milk production.";
  }
  if (definition.module === "expense" && Number(values.amount || 0) <= 0) return "Expense amount must be greater than zero.";
  return null;
}

export function makeOperationReference(definition: FarmModuleDefinition, now = new Date()) {
  const day = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, "0");
  return `${definition.prefix}-${day}-${random}`;
}

export function operationCoreFields(
  definition: FarmModuleDefinition,
  values: OperationValues,
  resolveAnimal: (id: string) => string = (id) => id,
  resolveStaff: (id: string) => string = (id) => id,
): Pick<FarmOperationRecord, "title" | "date" | "summary" | "status" | "priority" | "animalId" | "animalLabel" | "relatedAnimalIds" | "assignedTo" | "assignedToName" | "dueDate"> {
  const animalId = definition.animalField ? String(values[definition.animalField] || "") : "";
  const assignedTo = definition.assignedToField ? String(values[definition.assignedToField] || "") : "";
  const primary = String(values[definition.primaryField] || definition.singular);
  const animalLabel = animalId ? resolveAnimal(animalId) : "";
  const title = definition.primaryField.toLowerCase().includes("animalid") && animalLabel ? animalLabel : primary;
  const priorityValue = definition.priorityField ? String(values[definition.priorityField] || "") : "";
  const relatedAnimalIds = definition.fields
    .filter((field) => field.type === "animal")
    .map((field) => String(values[field.key] || ""))
    .filter(Boolean);

  return {
    title: title || definition.singular,
    date: String(values[definition.dateField] || new Date().toISOString().slice(0, 10)),
    summary: operationSummary(definition, values),
    status: definition.statusField ? String(values[definition.statusField] || "recorded") : "recorded",
    priority: (["low", "medium", "high", "critical"] as string[]).includes(priorityValue)
      ? (priorityValue as OperationPriority)
      : undefined,
    animalId: animalId || undefined,
    animalLabel: animalLabel || undefined,
    relatedAnimalIds: relatedAnimalIds.length ? Array.from(new Set(relatedAnimalIds)) : undefined,
    assignedTo: assignedTo || undefined,
    assignedToName: assignedTo ? resolveStaff(assignedTo) : undefined,
    dueDate: typeof values.dueDate === "string" && values.dueDate ? values.dueDate : undefined,
  };
}

export function operationSummary(definition: FarmModuleDefinition, values: OperationValues) {
  const entries = definition.fields
    .filter((field) => ![definition.primaryField, definition.dateField].includes(field.key))
    .filter((field) => field.type !== "textarea" && field.type !== "checkbox")
    .map((field) => ({ field, value: values[field.key] }))
    .filter(({ value }) => value !== "" && value != null)
    .slice(0, 3)
    .map(({ field, value }) => `${field.label}: ${formatOperationValue(field, ["animal", "staff"].includes(field.type) ? values[`${field.key}Label`] || value : value)}`);
  return entries.join(" · ");
}

export function formatOperationValue(field: OperationFieldDefinition, value: OperationValue) {
  if (value == null || value === "") return "—";
  if (field.type === "checkbox") return value ? "Completed" : "Not completed";
  const option = field.options?.find((item) => item.value === String(value));
  const display = option?.label || String(value);
  if (!field.unit) return display;
  return field.unit === "E" ? `E${Number(value).toLocaleString("en-SZ", { maximumFractionDigits: 2 })}` : `${display} ${field.unit}`;
}

export type AttentionTone = "critical" | "warning" | "good" | "neutral";

export function operationAttention(record: FarmOperationRecord, today = new Date()): { tone: AttentionTone; label: string } {
  if (record.archived) return { tone: "neutral", label: "Archived" };
  if (record.priority === "critical") return { tone: "critical", label: "Critical" };
  if (record.module === "incident" && !["resolved", "closed"].includes(record.status)) {
    return { tone: record.priority === "high" ? "critical" : "warning", label: record.priority === "high" ? "High priority" : "Open" };
  }
  if (["feed", "inventory"].includes(record.module) && record.status === "low") return { tone: "critical", label: "Low stock" };
  if (record.module === "equipment" && ["needs-attention", "out-of-service"].includes(record.status)) return { tone: "critical", label: "Needs attention" };
  if (record.module === "maintenance" && !["completed", "unrepairable"].includes(record.status)) return { tone: "warning", label: "Outstanding" };
  if (record.module === "task" && !["completed", "cancelled"].includes(record.status)) {
    const due = record.dueDate ? new Date(`${record.dueDate}T23:59:59`) : null;
    if (due && due.getTime() < today.getTime()) return { tone: "critical", label: "Overdue" };
    return { tone: "warning", label: record.status === "in-progress" ? "In progress" : "Pending" };
  }
  if (record.reviewStatus === "pending") return { tone: "warning", label: "Awaiting review" };
  if (record.reviewStatus === "rejected") return { tone: "critical", label: "Changes requested" };
  if (record.reviewStatus === "approved") return { tone: "good", label: "Approved" };
  return { tone: "good", label: "Recorded" };
}
