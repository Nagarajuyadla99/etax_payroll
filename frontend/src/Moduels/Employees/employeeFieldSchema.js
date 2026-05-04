// Single source of truth for employee input (manual + bulk upload).
// Keep this file DRY: any future field added here can render everywhere.

export const EMPLOYEE_FIELDS = [
  {
    key: "employee_code",
    label: "Employee Code",
    required: false,
    type: "string",
    group: "Basic",
    hint: "Unique code (recommended). Example: EMP-001",
    example: "EMP-001",
    bulk: { required: true, headerAliases: ["employee_code", "employee code", "emp_code", "code"] },
  },
  {
    key: "first_name",
    label: "First Name",
    required: true,
    type: "string",
    group: "Basic",
    example: "Aarav",
    bulk: { required: true, headerAliases: ["first_name", "first name", "firstname", "name_first"] },
  },
  {
    key: "last_name",
    label: "Last Name",
    required: false,
    type: "string",
    group: "Basic",
    example: "Sharma",
    bulk: { required: false, headerAliases: ["last_name", "last name", "lastname", "surname"] },
  },
  {
    key: "email",
    label: "Email",
    required: true,
    type: "email",
    group: "Basic",
    hint: "Must be a valid email address.",
    example: "aarav@company.com",
    bulk: { required: true, headerAliases: ["email", "work_email", "work email", "email_address"] },
  },
  {
    key: "phone",
    label: "Phone",
    required: false,
    type: "phone",
    group: "Basic",
    hint: "Include country code if possible. Example: +91 9876543210",
    example: "+91 9876543210",
    bulk: { required: false, headerAliases: ["phone", "mobile_phone", "mobile", "contact"] },
  },
  {
    key: "date_of_birth",
    label: "Date of Birth",
    required: true,
    type: "date",
    group: "Basic",
    hint: "Format: YYYY-MM-DD",
    example: "1996-08-12",
    bulk: { required: true, headerAliases: ["date_of_birth", "dob", "birth_date", "birth date"] },
  },
  {
    key: "department_id",
    label: "Department",
    required: false, // conditionally required if departments exist
    type: "fk",
    group: "Organization",
    hint: "Use Department UUID, or provide Department Name and we’ll map it.",
    example: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    fk: { kind: "departments", idKey: "id", nameKey: "name" },
    bulk: {
      required: false,
      headerAliases: ["department_id", "department id", "dept_id"],
      secondaryNameKey: "department_name",
      secondaryHeaderAliases: ["department_name", "department", "dept", "department name"],
    },
  },
  {
    key: "designation_id",
    label: "Designation",
    required: false, // conditionally required if designations exist
    type: "fk",
    group: "Organization",
    hint: "Use Designation UUID, or provide Designation Name and we’ll map it.",
    example: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    fk: { kind: "designations", idKey: "id", nameKey: "name" },
    bulk: {
      required: false,
      headerAliases: ["designation_id", "designation id", "desig_id"],
      secondaryNameKey: "designation_name",
      secondaryHeaderAliases: ["designation_name", "designation", "role", "designation name", "title"],
    },
  },
  {
    key: "location_id",
    label: "Location",
    required: false, // conditionally required if locations exist
    type: "fk",
    group: "Organization",
    hint: "Use Location UUID, or provide Location Name and we’ll map it.",
    example: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    fk: { kind: "locations", idKey: "id", nameKey: "name" },
    bulk: {
      required: false,
      headerAliases: ["location_id", "location id", "work_location_id"],
      secondaryNameKey: "location_name",
      secondaryHeaderAliases: ["location_name", "location", "work location", "location name"],
    },
  },
];

export const EMPLOYEE_GROUPS = [
  { key: "Basic", title: "Basic details" },
  { key: "Organization", title: "Organization" },
];

export function normaliseHeader(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export function getBulkTargetFields() {
  return EMPLOYEE_FIELDS.filter((f) => f.bulk);
}

export function getCanonicalBulkHeaders({ includeSecondaryNameColumns = true } = {}) {
  const headers = [];
  for (const f of getBulkTargetFields()) {
    headers.push(f.key);
    if (includeSecondaryNameColumns && f.bulk?.secondaryNameKey) {
      headers.push(f.bulk.secondaryNameKey);
    }
  }
  return headers;
}

export function getSampleRows() {
  return [
    {
      employee_code: "EMP-001",
      first_name: "Aarav",
      last_name: "Sharma",
      email: "aarav@company.com",
      phone: "+91 9876543210",
      date_of_birth: "1996-08-12",
      department_id: "",
      department_name: "Engineering",
      designation_id: "",
      designation_name: "Software Engineer",
      location_id: "",
      location_name: "Bengaluru",
    },
    {
      employee_code: "EMP-002",
      first_name: "Diya",
      last_name: "Patel",
      email: "diya.patel@company.com",
      phone: "+91 9998887776",
      date_of_birth: "1994-02-03",
      department_id: "",
      department_name: "HR",
      designation_id: "",
      designation_name: "HR Executive",
      location_id: "",
      location_name: "Mumbai",
    },
    {
      employee_code: "EMP-003",
      first_name: "Ibrahim",
      last_name: "Khan",
      email: "ibrahim.khan@company.com",
      phone: "+91 7000012345",
      date_of_birth: "1992-11-25",
      department_id: "",
      department_name: "Finance",
      designation_id: "",
      designation_name: "Accountant",
      location_id: "",
      location_name: "Delhi",
    },
  ];
}