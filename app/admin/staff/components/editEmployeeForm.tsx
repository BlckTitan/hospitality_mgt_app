import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { Button } from "react-bootstrap";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { formSchema } from "./validation";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import InputComponent from "../../../../shared/input";
import DatepickerComponent from "../../../../shared/datepicker";
import SelectComponent from "../../../../shared/select";
import UserAutocomplete, { applyLinkedUserToStaff } from "../../../../shared/userAutocomplete";
import { roles, states_lga } from "../../../../lib/data";
import { usePermissions } from "../../../../hooks/usePermissions";
import { fieldRowClassName } from "../../../../shared/field";

type FormData = {
  id: Id<"staffs">;
  DoB: Date | null;
  dateRecruited: Date | null;
  firstName: string;
  lastName: string;
  role: string | null;
  address: string;
  phone: string;
  email?: string;
  stateOfOrigin: string;
  LGA: string;
  dateTerminated?: Date | null;
  employmentStatus: string;
  salary?: number;
  department?: string;
  employmentType?: string;
  managerId?: string;
  position?: string;
  userId?: string;
  nationalId?: string;
  idType?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelationship?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  probationEndDate?: string;
};

const DEPARTMENTS = [
  { value: "front-office", label: "Front office" },
  { value: "housekeeping", label: "Housekeeping" },
  { value: "fnb", label: "Food & beverage" },
  { value: "maintenance", label: "Maintenance" },
  { value: "finance", label: "Finance" },
  { value: "admin", label: "Admin" },
  { value: "other", label: "Other" },
];

export function FormComponent(props: {
  id: Id<"staffs">;
  firstName: string;
  lastName: string;
  phone: string;
  DoB: string;
  LGA: string;
  email?: string;
  employmentStatus: string;
  address: string;
  dateTerminated?: string;
  dateRecruited: string;
  salary?: number;
  department?: string;
  role: string;
  stateOfOrigin: string;
  userId?: string;
  employmentType?: string;
  managerId?: string;
  position?: string;
  employeeNumber?: string;
  nationalId?: string;
  idType?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelationship?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  probationEndDate?: string;
  payType?: string;
  paymentMethod?: string;
  hourlyRate?: number;
  taxId?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  routingCode?: string;
}) {
  const { isAuthenticated } = useConvexAuth();
  const updateStaff = useMutation(api.staff.updateStaff);
  const upsertPayHistory = useMutation(api.staff.upsertPayHistory);
  const terminateStaff = useMutation(api.staff.terminateStaff);
  const managers = useQuery(
    api.staff.listManagers,
    isAuthenticated ? { excludeStaffId: props.id } : "skip",
  );
  const { hasGranularPermission } = usePermissions();
  const canPay = hasGranularPermission("staff.compensation.update");
  const [staffState, setStaffState] = useState<string>(props.stateOfOrigin);

  const { control, register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      dateTerminated: props.dateTerminated ? new Date(props.dateTerminated) : null,
      email: props.email,
      firstName: props.firstName,
      lastName: props.lastName,
      phone: props.phone,
      DoB: props.DoB ? new Date(props.DoB) : null,
      stateOfOrigin: props.stateOfOrigin,
      LGA: props.LGA,
      address: props.address,
      salary: props.salary,
      employmentStatus: props.employmentStatus === "terminated" ? "terminated" : "active",
      dateRecruited: props.dateRecruited ? new Date(props.dateRecruited) : null,
      role: props.role,
      department: props.department || "other",
      employmentType: props.employmentType || "full-time",
      managerId: props.managerId || "",
      position: props.position || "",
      userId: props.userId || "",
      nationalId: props.nationalId || "",
      idType: props.idType || "",
      emergencyName: props.emergencyName || "",
      emergencyPhone: props.emergencyPhone || "",
      emergencyRelationship: props.emergencyRelationship || "",
      contractStartDate: props.contractStartDate || "",
      contractEndDate: props.contractEndDate || "",
      probationEndDate: props.probationEndDate || "",
    },
  });

  const [payType, setPayType] = useState(props.payType || "salary");
  const [paymentMethod, setPaymentMethod] = useState(props.paymentMethod || "cash");
  const [hourlyRate, setHourlyRate] = useState(String(props.hourlyRate || ""));
  const [baseSalary, setBaseSalary] = useState(String(props.salary || props.salary || ""));
  const [taxId, setTaxId] = useState(props.taxId || "");
  const [bankName, setBankName] = useState(props.bankName || "");
  const [accountName, setAccountName] = useState(props.accountName || "");
  const [accountNumber, setAccountNumber] = useState(props.accountNumber || "");
  const [routingCode, setRoutingCode] = useState(props.routingCode || "");

  const linkedUserId = watch("userId");

  const onSubmit: SubmitHandler<FormData | FieldValues> = async (data) => {
    try {
      const response = await updateStaff({
        id: props.id,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        DoB: data.DoB ? data.DoB.toISOString() : new Date().toISOString(),
        stateOfOrigin: data.stateOfOrigin,
        address: data.address,
        LGA: data.LGA,
        email: data.email || undefined,
        employmentStatus: data.employmentStatus === "terminated" ? "terminated" : "active",
        dateTerminated:
          data.employmentStatus === "terminated" ? new Date().toISOString() : undefined,
        role: data.role,
        department: data.department,
        employmentType: (data.employmentType || "full-time") as
          | "full-time"
          | "part-time"
          | "casual"
          | "contractor",
        position: data.position || undefined,
        managerId: data.managerId ? (data.managerId as Id<"staffs">) : null,
        nationalId: data.nationalId || undefined,
        idType: data.idType
          ? (data.idType as "nin" | "passport" | "drivers_license" | "other")
          : undefined,
        emergencyName: data.emergencyName || undefined,
        emergencyPhone: data.emergencyPhone || undefined,
        emergencyRelationship: data.emergencyRelationship || undefined,
        contractStartDate: data.contractStartDate || undefined,
        contractEndDate: data.contractEndDate || undefined,
        probationEndDate: data.probationEndDate || undefined,
        userId: data.userId ? (data.userId as Id<"users">) : null,
      });

      if (response.success === false) {
        toast.error(response.message);
        return;
      }

      if (canPay) {
        const pay = await upsertPayHistory({
          id: props.id,
          payType: payType as "hourly" | "salary" | "mixed",
          baseSalary: baseSalary ? Number(baseSalary) : undefined,
          hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
          paymentMethod: paymentMethod as "bank" | "cash" | "mobile_money" | "check",
          taxId: taxId || undefined,
          bankName: bankName || undefined,
          accountName: accountName || undefined,
          accountNumber: accountNumber || undefined,
          routingCode: routingCode || undefined,
        });
        if (pay.success === false) {
          toast.error(pay.message);
          return;
        }
      }

      toast.success("Staff updated successfully");
      setTimeout(() => {
        window.location.href = "/admin/staff";
      }, 1500);
    } catch (error) {
      console.error("Edit staff failed:", error);
      toast.error("Failed to update staff. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-4">
      <h5 className="mb-3">Identity</h5>
      <div className={fieldRowClassName}>
        <InputComponent
          id="firstName"
          label="First Name"
          type="string"
          inputWidth="w-1/2"
          register={register("firstName", { required: true })}
          error={errors.firstName}
        />
        <InputComponent
          id="lastName"
          label="Last Name"
          type="string"
          inputWidth="w-1/2"
          register={register("lastName", { required: true })}
          error={errors.lastName}
        />
      </div>
      <div className={fieldRowClassName}>
        <InputComponent
          id="phone"
          label="Phone"
          inputWidth="w-1/3"
          type="tel"
          register={register("phone", { required: true })}
          error={errors.phone}
        />
        <DatepickerComponent
          id="DoB"
          label="Date of Birth"
          dateWidth="w-1/3"
          name="DoB"
          control={control}
          error={errors.DoB}
        />
        <InputComponent
          id="email"
          label="Email"
          inputWidth="w-1/3"
          type="email"
          register={register("email")}
          error={errors.email}
        />
      </div>
      <div className={fieldRowClassName}>
        <SelectComponent
          id="stateOfOrigin"
          label="State of Origin"
          defaultText="select state of origin"
          data={states_lga}
          setStaffState={setStaffState}
          selectWidth="w-1/3"
          register={register("stateOfOrigin", { required: true })}
          error={errors.stateOfOrigin}
        />
        <div className="w-full lg:w-1/3">
          <label htmlFor="LGA">Local Government Area</label>
          <select defaultValue={props.LGA} {...register("LGA", { required: true })}>
            <option disabled value="">
              - select local government area -
            </option>
            {states_lga &&
              staffState !== "" &&
              states_lga
                .filter((item) => item.state === staffState)
                .map((item) =>
                  item.lgas.map((lga, index) => (
                    <option key={index} value={lga}>
                      {lga}
                    </option>
                  )),
                )}
          </select>
        </div>
        <InputComponent
          id="address"
          label="Address"
          inputWidth="w-1/3"
          type="address"
          register={register("address", { required: true })}
          error={errors.address}
        />
      </div>

      <h5 className="mb-3 mt-4">Employment</h5>
      {props.employeeNumber ? (
        <p className="text-sm text-slate-600 mb-2">Employee number {props.employeeNumber} (immutable)</p>
      ) : null}
      <div className={fieldRowClassName}>
        <div className="w-full lg:w-1/3">
          <label htmlFor="role">Job title</label>
          <select className="border rounded p-2 w-full" {...register("role", { required: true })}>
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>
        <SelectComponent
          id="department"
          label="Department"
          selectWidth="w-1/3"
          register={register("department")}
          options={DEPARTMENTS}
        />
        <SelectComponent
          id="employmentType"
          label="Employment type"
          selectWidth="w-1/3"
          register={register("employmentType")}
          options={[
            { value: "full-time", label: "Full-time" },
            { value: "part-time", label: "Part-time" },
            { value: "casual", label: "Casual" },
            { value: "contractor", label: "Contractor" },
          ]}
        />
      </div>
      <div className={fieldRowClassName}>
        <SelectComponent
          id="managerId"
          label="Manager"
          selectWidth="w-1/3"
          defaultText="No manager"
          register={register("managerId")}
          options={(managers ?? []).map((row) => ({ value: row._id, label: `${row.name} (${row.role})` }))}
        />
        <InputComponent
          id="position"
          label="Position (optional)"
          inputWidth="w-1/3"
          type="string"
          register={register("position")}
        />
        <SelectComponent
          id="idType"
          label="ID type"
          selectWidth="w-1/3"
          defaultText="Select ID type"
          register={register("idType")}
          options={[
            { value: "nin", label: "NIN" },
            { value: "passport", label: "Passport" },
            { value: "drivers_license", label: "Driver's license" },
            { value: "other", label: "Other" },
          ]}
        />
      </div>
      <div className={fieldRowClassName}>
        <InputComponent
          id="nationalId"
          label="National ID"
          inputWidth="w-1/3"
          type="string"
          register={register("nationalId")}
        />
        <InputComponent
          id="contractStartDate"
          label="Contract start"
          inputWidth="w-1/3"
          type="date"
          register={register("contractStartDate")}
        />
        <InputComponent
          id="contractEndDate"
          label="Contract end"
          inputWidth="w-1/3"
          type="date"
          register={register("contractEndDate")}
        />
      </div>
      <div className={fieldRowClassName}>
        <InputComponent
          id="probationEndDate"
          label="Probation end"
          inputWidth="w-1/3"
          type="date"
          register={register("probationEndDate")}
        />
      </div>

      <h5 className="mb-3 mt-4">Emergency contact</h5>
      <div className={fieldRowClassName}>
        <InputComponent
          id="emergencyName"
          label="Name"
          inputWidth="w-1/3"
          type="string"
          register={register("emergencyName")}
        />
        <InputComponent
          id="emergencyPhone"
          label="Phone"
          inputWidth="w-1/3"
          type="tel"
          register={register("emergencyPhone")}
        />
        <InputComponent
          id="emergencyRelationship"
          label="Relationship"
          inputWidth="w-1/3"
          type="string"
          register={register("emergencyRelationship")}
        />
      </div>

      <h5 className="mb-3 mt-4">Login</h5>
      <div className={fieldRowClassName}>
        <UserAutocomplete
          value={linkedUserId}
          excludeStaffId={props.id}
          error={errors.userId}
          onChange={(nextUserId, user) => {
            setValue("userId", nextUserId ?? "");
            if (user) {
              applyLinkedUserToStaff(
                user,
                { email: watch("email") },
                (name, nextValue) => setValue(name as keyof FormData, nextValue as never),
              );
            }
          }}
        />
      </div>

      {canPay && (
        <>
          <h5 className="mb-3 mt-4">Pay and bank</h5>
          <p className="text-sm text-slate-600 mb-2">
            Changing rates writes a Pay history row. It does not silently overwrite past payrolls.
          </p>
          <div className={fieldRowClassName}>
            <label className="flex flex-col text-sm w-full lg:w-1/3">
              Pay type
              <select className="border rounded p-2" value={payType} onChange={(e) => setPayType(e.target.value)}>
                <option value="salary">Salary</option>
                <option value="hourly">Hourly</option>
                <option value="mixed">Mixed</option>
              </select>
            </label>
            <label className="flex flex-col text-sm w-full lg:w-1/3">
              Base salary
              <input className="border rounded p-2" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} />
            </label>
            <label className="flex flex-col text-sm w-full lg:w-1/3">
              Hourly rate
              <input className="border rounded p-2" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
            </label>
          </div>
          <div className={fieldRowClassName}>
            <label className="flex flex-col text-sm w-full lg:w-1/3">
              Payment method
              <select
                className="border rounded p-2"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="mobile_money">Mobile money</option>
                <option value="check">Check</option>
              </select>
            </label>
            <label className="flex flex-col text-sm w-full lg:w-1/3">
              Tax ID
              <input className="border rounded p-2" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
            </label>
            <label className="flex flex-col text-sm w-full lg:w-1/3">
              Bank name
              <input className="border rounded p-2" value={bankName} onChange={(e) => setBankName(e.target.value)} />
            </label>
          </div>
          <div className={fieldRowClassName}>
            <label className="flex flex-col text-sm w-full lg:w-1/3">
              Account name
              <input className="border rounded p-2" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
            </label>
            <label className="flex flex-col text-sm w-full lg:w-1/3">
              Account number
              <input className="border rounded p-2" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
            </label>
            <label className="flex flex-col text-sm w-full lg:w-1/3">
              Routing code
              <input className="border rounded p-2" value={routingCode} onChange={(e) => setRoutingCode(e.target.value)} />
            </label>
          </div>
        </>
      )}

      <div className="flex gap-2 mt-4">
        <Button type="submit" variant="dark">
          Save
        </Button>
        {props.employmentStatus !== "terminated" && (
          <Button
            type="button"
            variant="outline-danger"
            onClick={async () => {
              if (!confirm("Terminate this staff member?")) return;
              const result = await terminateStaff({ id: props.id });
              if (result.success) {
                toast.success(result.message);
                window.location.href = "/admin/staff";
              } else toast.error(result.message);
            }}
          >
            Terminate
          </Button>
        )}
      </div>
    </form>
  );
}
