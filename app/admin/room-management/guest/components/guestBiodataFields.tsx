import { FieldErrors, UseFormRegister } from "react-hook-form";
import InputComponent from "../../../../../shared/input";
import SelectComponent from "../../../../../shared/select";
import { states_lga } from "../../../../../lib/data";

export type GuestBiodataValues = {
  occupation?: string;
  stateOfOrigin?: string;
  includeSpouse?: boolean;
  spouseFirstName?: string;
  spouseLastName?: string;
  spousePhone?: string;
  spouseOccupation?: string;
};

const rowClassName =
  "w-full h-fit flex flex-col lg:flex-row lg:justify-start lg:items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4";

const stateOptions = [
  { value: "", label: "Not specified" },
  ...states_lga.map((row) => ({ value: row.state, label: row.state })),
];

export function GuestBiodataFields({
  register,
  errors,
  includeSpouse,
}: {
  register: UseFormRegister<GuestBiodataValues>;
  errors: FieldErrors<GuestBiodataValues>;
  includeSpouse: boolean;
}) {
  return (
    <>
      <div className={rowClassName}>
        <InputComponent
          id="occupation"
          label="Occupation"
          type="string"
          inputWidth="w-1/2"
          placeholder="Occupation"
          register={register("occupation")}
          error={errors.occupation}
        />
        <SelectComponent
          id="stateOfOrigin"
          label="State of origin"
          selectWidth="w-1/2"
          register={register("stateOfOrigin")}
          error={errors.stateOfOrigin}
          options={stateOptions}
        />
      </div>

      <label className="mb-4 flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("includeSpouse")} />
        Add spouse biodata
      </label>

      {includeSpouse && (
        <div className="mb-4 rounded border border-gray-200 p-3">
          <div className={rowClassName}>
            <InputComponent
              id="spouseFirstName"
              label="Spouse first name *"
              type="string"
              inputWidth="w-1/2"
              placeholder="First name"
              register={register("spouseFirstName")}
              error={errors.spouseFirstName}
            />
            <InputComponent
              id="spouseLastName"
              label="Spouse last name *"
              type="string"
              inputWidth="w-1/2"
              placeholder="Last name"
              register={register("spouseLastName")}
              error={errors.spouseLastName}
            />
          </div>
          <div className={rowClassName}>
            <InputComponent
              id="spousePhone"
              label="Spouse phone"
              type="tel"
              inputWidth="w-1/2"
              register={register("spousePhone")}
              error={errors.spousePhone}
            />
            <InputComponent
              id="spouseOccupation"
              label="Spouse occupation"
              type="string"
              inputWidth="w-1/2"
              placeholder="Occupation"
              register={register("spouseOccupation")}
              error={errors.spouseOccupation}
            />
          </div>
        </div>
      )}
    </>
  );
}

export function spousePayload(data: GuestBiodataValues) {
  if (!data.includeSpouse) return null;
  return {
    firstName: data.spouseFirstName!.trim(),
    lastName: data.spouseLastName!.trim(),
    phone: data.spousePhone?.trim() || undefined,
    occupation: data.spouseOccupation?.trim() || undefined,
  };
}
