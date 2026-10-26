const LETTER = /[A-Za-z]/;
const PERSON_NAME = /^[A-Za-z]+(?:[ '\-][A-Za-z]+)*$/;

export const PHONE_PATTERN = /^\+?\d{10,15}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function hasLetter(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return true;
  return LETTER.test(trimmed);
}

export function isPersonName(value: string | null | undefined): boolean {
  const trimmed = value?.trim().replace(/\s+/g, " ") ?? "";
  if (!trimmed) return false;
  return PERSON_NAME.test(trimmed);
}

export function firstError(errors: Record<string, string>): string | null {
  return Object.values(errors).find(Boolean) ?? null;
}

export function personNameError(
  label: string,
  value: string | undefined,
  required: boolean,
): string | null {
  const trimmed = value?.trim().replace(/\s+/g, " ") ?? "";
  if (!trimmed) return required ? `${label} is required` : null;
  if (trimmed.length < 2) return `${label} must be at least 2 characters`;
  if (trimmed.length > 100) return `${label} is too long`;
  if (!isPersonName(trimmed)) {
    return `${label} must contain only letters, spaces, hyphens, and apostrophes`;
  }
  return null;
}

export function moneyError(
  label: string,
  value: string | number | undefined | null,
  required: boolean,
): string | null {
  if (value === undefined || value === null || value === "") {
    return required ? `${label} is required` : null;
  }
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return `${label} must be a number`;
  if (amount < 0) return `${label} cannot be negative`;
  return null;
}

export function positionError(value?: string): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  if (trimmed.length < 2) return "Position must be at least 2 characters";
  if (trimmed.length > 80) return "Position is too long";
  if (!hasLetter(trimmed)) return "Position cannot be numbers only";
  return null;
}

export function nationalIdError(idType?: string, nationalId?: string): string | null {
  const type = idType?.trim() ?? "";
  const id = nationalId?.trim() ?? "";
  if (!type && !id) return null;
  if (!type) return "Select an ID type";
  if (!["nin", "passport", "drivers_license", "other"].includes(type)) return "Select a valid ID type";
  if (!id) return "National ID is required";
  if (type === "nin" && !/^\d{11}$/.test(id)) return "NIN must be 11 digits";
  if (type === "passport" && !/^[A-Za-z0-9]{6,12}$/.test(id)) return "Enter a valid passport number";
  if (type === "drivers_license" && !/^[A-Za-z0-9-]{5,20}$/.test(id)) {
    return "Enter a valid driver's license number";
  }
  if (type === "other" && (id.length < 3 || id.length > 30)) return "Enter a valid ID number";
  return null;
}

export function contractDateError(start?: string, end?: string, probation?: string): string | null {
  const startTime = parseDate(start);
  const endTime = parseDate(end);
  const probationTime = parseDate(probation);
  if (start?.trim() && startTime === null) return "Enter a valid contract start date";
  if (end?.trim() && endTime === null) return "Enter a valid contract end date";
  if (probation?.trim() && probationTime === null) return "Enter a valid probation end date";
  if (startTime !== null && endTime !== null && endTime < startTime) {
    return "Contract end must be on or after the start date";
  }
  if (startTime !== null && probationTime !== null && probationTime < startTime) {
    return "Probation end must be on or after the contract start";
  }
  if (endTime !== null && probationTime !== null && probationTime > endTime) {
    return "Probation end must be on or before the contract end";
  }
  return null;
}

export function emergencyContactError(name?: string, phone?: string, relationship?: string): string | null {
  const trimmedName = name?.trim() ?? "";
  const trimmedPhone = phone?.trim() ?? "";
  const trimmedRelationship = relationship?.trim() ?? "";
  if (!trimmedName && !trimmedPhone && !trimmedRelationship) return null;
  const nameError = personNameError("Emergency name", trimmedName, true);
  if (nameError) return nameError;
  if (!trimmedPhone) return "Emergency phone is required";
  if (!PHONE_PATTERN.test(trimmedPhone)) return "Enter a valid emergency phone number";
  if (trimmedRelationship) {
    const relationshipError = personNameError("Relationship", trimmedRelationship, false);
    if (relationshipError) return relationshipError;
  }
  return null;
}

export function contactChangeError(phone?: string, address?: string): string | null {
  const trimmedPhone = phone?.trim() ?? "";
  const trimmedAddress = address?.trim() ?? "";
  if (!trimmedPhone && !trimmedAddress) return "Enter a phone number or address";
  if (trimmedPhone && !PHONE_PATTERN.test(trimmedPhone)) return "Enter a valid phone number";
  if (trimmedAddress && trimmedAddress.length < 5) return "Address must be at least 5 characters";
  if (trimmedAddress.length > 500) return "Address is too long";
  return null;
}

export type PayInput = {
  payType?: string;
  paymentMethod?: string;
  baseSalary?: string | number | null;
  hourlyRate?: string | number | null;
  taxId?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  routingCode?: string;
  requireAmounts?: boolean;
};

export function payDetailErrors(input: PayInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const paymentMethod = input.paymentMethod?.trim() || "cash";
  const requireAmounts = input.requireAmounts !== false;

  if (requireAmounts) {
    const payType = input.payType?.trim() || "salary";
    if (!["hourly", "salary", "mixed"].includes(payType)) errors.payType = "Select a pay type";
    const salaryMessage = moneyError(
      "Base salary",
      input.baseSalary,
      payType === "salary" || payType === "mixed",
    );
    if (salaryMessage) errors.baseSalary = salaryMessage;
    const hourlyMessage = moneyError(
      "Hourly rate",
      input.hourlyRate,
      payType === "hourly" || payType === "mixed",
    );
    if (hourlyMessage) errors.hourlyRate = hourlyMessage;
  }

  if (!["bank", "cash", "mobile_money", "check"].includes(paymentMethod)) {
    errors.paymentMethod = "Select a payment method";
  }

  const taxId = input.taxId?.trim() ?? "";
  if (taxId && !/^[A-Za-z0-9/-]{3,30}$/.test(taxId)) errors.taxId = "Enter a valid tax ID";

  const bankName = input.bankName?.trim() ?? "";
  if (paymentMethod === "bank" && !bankName) {
    errors.bankName = "Bank name is required for bank payment";
  } else if (bankName) {
    namedTextError("Bank name", bankName, errors, "bankName");
  }

  const accountName = input.accountName?.trim() ?? "";
  if (paymentMethod === "bank" && !accountName) {
    errors.accountName = "Account name is required for bank payment";
  } else if (accountName) {
    namedTextError("Account name", accountName, errors, "accountName");
  }

  const accountMessage = accountNumberError(paymentMethod, input.accountNumber);
  if (accountMessage) errors.accountNumber = accountMessage;

  const routingCode = input.routingCode?.trim() ?? "";
  if (routingCode && !/^[A-Za-z0-9-]{3,20}$/.test(routingCode)) {
    errors.routingCode = "Enter a valid routing code";
  }

  return errors;
}

export function staffProfileError(input: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  position?: string;
  salary?: number;
  DoB?: string;
  nationalId?: string;
  idType?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelationship?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  probationEndDate?: string;
}): string | null {
  return (
    personNameError("First name", input.firstName, true) ||
    personNameError("Last name", input.lastName, true) ||
    phoneError(input.phone) ||
    emailError(input.email) ||
    addressError(input.address) ||
    dateOfBirthError(input.DoB) ||
    positionError(input.position) ||
    moneyError("Salary", input.salary, false) ||
    nationalIdError(input.idType, input.nationalId) ||
    emergencyContactError(input.emergencyName, input.emergencyPhone, input.emergencyRelationship) ||
    contractDateError(input.contractStartDate, input.contractEndDate, input.probationEndDate)
  );
}

export function changeRequestError(kind: string, payload: unknown): string | null {
  const record =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const text = (key: string) => (typeof record[key] === "string" ? (record[key] as string) : undefined);
  if (kind === "contact") return contactChangeError(text("phone"), text("address"));
  if (kind === "emergency") {
    return emergencyContactError(text("emergencyName"), text("emergencyPhone"), text("emergencyRelationship"));
  }
  if (kind === "bank") {
    return firstError(
      payDetailErrors({
        paymentMethod: text("paymentMethod") || "bank",
        bankName: text("bankName"),
        accountName: text("accountName"),
        accountNumber: text("accountNumber"),
        routingCode: text("routingCode"),
        taxId: text("taxId"),
        requireAmounts: false,
      }),
    );
  }
  return "Unknown change request";
}

function namedTextError(
  label: string,
  value: string,
  errors: Record<string, string>,
  key: string,
): boolean {
  if (value.length < 2 || value.length > 100) {
    errors[key] = `${label} must be 2 to 100 characters`;
    return false;
  }
  if (!hasLetter(value)) {
    errors[key] = `${label} cannot be numbers only`;
    return false;
  }
  return true;
}

function accountNumberError(paymentMethod: string, value?: string): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return paymentMethod === "bank" ? "Account number is required for bank payment" : null;
  }
  if (!/^\d+$/.test(trimmed)) return "Account number must contain only digits";
  if (paymentMethod === "bank" && !/^\d{10}$/.test(trimmed)) return "Bank account number must be 10 digits";
  if (trimmed.length < 6 || trimmed.length > 20) return "Enter a valid account number";
  return null;
}

function phoneError(value?: string): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "Phone number is required";
  if (!PHONE_PATTERN.test(trimmed)) return "Enter a valid phone number";
  return null;
}

function emailError(value?: string): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  if (trimmed.length > 254 || !EMAIL_PATTERN.test(trimmed)) return "Please enter a valid email address";
  return null;
}

function addressError(value?: string): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "Address is required";
  if (trimmed.length < 5) return "Address must be at least 5 characters";
  if (trimmed.length > 500) return "Address is too long";
  return null;
}

function dateOfBirthError(value?: string): string | null {
  if (!value?.trim()) return "Date of birth is required";
  const time = Date.parse(value);
  if (Number.isNaN(time)) return "Enter a valid date of birth";
  if (time > Date.now()) return "Date of birth cannot be in the future";
  return null;
}

function parseDate(value?: string): number | null {
  if (!value?.trim()) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}
