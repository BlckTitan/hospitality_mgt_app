import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { SubmitHandler, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { formSchema, CLOCK_METHOD_OPTIONS } from "./validation";
import { toast } from "sonner";
import InputComponent from "../../../../shared/input";
import DatepickerComponent from "../../../../shared/datepicker";
import SelectComponent from "../../../../shared/select";
import UserAutocomplete, { applyLinkedUserToStaff } from "../../../../shared/userAutocomplete";
import { roles, states_lga } from "../../../../lib/data";
import { Button, Modal } from "react-bootstrap";
import { Id } from "../../../../convex/_generated/dataModel";
import { usePermissions } from "../../../../hooks/usePermissions";
import { fieldRowClassName } from "../../../../shared/field";

type FormData = {
  DoB: Date | null;
  dateRecruited: Date | null;
  firstName: string;
  lastName: string;
  role: string | null;
  department?: string;
  employmentType: "full-time" | "part-time" | "casual" | "contractor";
  managerId?: string;
  position?: string;
  address: string;
  phone: string;
  email?: string;
  stateOfOrigin: string;
  LGA: string;
  salary?: number;
  userId?: string;
  clockMethod?: string;
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

export function FormComponent() {
  const { isAuthenticated } = useConvexAuth();
  const createStaff = useMutation(api.staff.createStaff);
  const managers = useQuery(api.staff.listManagers, isAuthenticated ? {} : "skip");
  const { hasGranularPermission } = usePermissions();
  const canPay = hasGranularPermission("staff.compensation.update");
  const [staffState, setStaffState] = useState<string>("");

  const { control, register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      DoB: null,
      firstName: "",
      lastName: "",
      role: null,
      address: "",
      email: "",
      phone: "",
      stateOfOrigin: "",
      LGA: "",
      dateRecruited: new Date(),
      salary: 0,
      department: "other",
      employmentType: "full-time",
      userId: "",
      managerId: "",
      position: "",
      clockMethod: "",
    },
  });

  const linkedUserId = watch("userId");

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await createStaff({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        DoB: data.DoB ? data.DoB.toISOString() : new Date().toISOString(),
        stateOfOrigin: data.stateOfOrigin,
        address: data.address,
        LGA: data.LGA,
        email: data.email || undefined,
        employmentStatus: "active",
        dateRecruited: data.dateRecruited
          ? data.dateRecruited.toISOString()
          : new Date().toISOString(),
        salary: Number(data.salary || 0),
        role: data.role ?? "Supervisor",
        department: data.department,
        employmentType: data.employmentType,
        position: data.position || undefined,
        managerId: data.managerId ? (data.managerId as Id<"staffs">) : undefined,
        ...(data.userId ? { userId: data.userId as Id<"users"> } : {}),
        ...(data.clockMethod
          ? { clockMethod: data.clockMethod as "self" | "supervisor" | "kiosk" }
          : {}),
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success(response.message);
        setTimeout(() => {
          window.location.href = "/admin/staff";
        }, 1500);
      }
    } catch (error) {
      console.error("Add new staff failed:", error);
      toast.error("Failed to add new staff. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="createStaffForm">
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
          <select defaultValue="" {...register("LGA", { required: true })}>
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
          {errors.LGA && <span className="text-red-500 text-sm">This field is required</span>}
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

      <div className={fieldRowClassName}>
        <div className="w-full lg:w-1/3">
          <label htmlFor="role">Job title</label>
          <select className="border rounded p-2 w-full" defaultValue="" {...register("role", { required: true })}>
            <option disabled value="">
              - select job title -
            </option>
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          {errors.role && <span className="text-red-500 text-sm">This field is required</span>}
        </div>
        <SelectComponent
          id="department"
          label="Department"
          selectWidth="w-1/3"
          defaultText="select department"
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
        <DatepickerComponent
          id="dateRecruited"
          label="Hire date"
          dateWidth="w-1/3"
          name="dateRecruited"
          control={control}
          error={errors.dateRecruited}
        />
        <InputComponent
          id="position"
          label="Position (optional)"
          inputWidth="w-1/3"
          type="string"
          register={register("position")}
        />
        <SelectComponent
          id="managerId"
          label="Manager"
          selectWidth="w-1/3"
          defaultText="No manager"
          register={register("managerId")}
          options={(managers ?? []).map((row) => ({ value: row._id, label: `${row.name} (${row.role})` }))}
        />
      </div>

      <div className={fieldRowClassName}>
        <SelectComponent
          id="clockMethod"
          label="Attendance clock"
          selectWidth="w-1/3"
          defaultText="Default (self if login linked)"
          register={register("clockMethod")}
          options={CLOCK_METHOD_OPTIONS}
        />
      </div>

      {canPay && (
        <div className={fieldRowClassName}>
          <InputComponent
            id="salary"
            label="Opening salary"
            inputWidth="w-1/3"
            type="number"
            register={register("salary")}
            error={errors.salary}
          />
        </div>
      )}

      <div className={fieldRowClassName}>
        <UserAutocomplete
          value={linkedUserId}
          error={errors.userId}
          onChange={(userId, user) => {
            setValue("userId", userId ?? "");
            if (user) {
              applyLinkedUserToStaff(
                user,
                { email: watch("email") },
                (name, value) => setValue(name as keyof FormData, value as never),
              );
            }
          }}
        />
      </div>

      <Modal.Footer>
        <Button type="submit" variant="dark">
          Submit
        </Button>
      </Modal.Footer>
    </form>
  );
}
