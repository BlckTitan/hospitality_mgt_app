import { FieldErrors, UseFormRegister } from "react-hook-form";
import InputComponent from "../../../../../shared/input";
import {
  ROLE_DESCRIPTION_SUMMARY_MAX,
  ROLE_QUALIFICATIONS_MAX,
  ROLE_REPORTS_TO_MAX,
  ROLE_RESPONSIBILITIES_MAX,
} from "../../../../../convex/lib/roleText";

type DescriptionForm = {
  reportsTo?: string;
  descriptionSummary?: string;
  responsibilities?: string;
  qualifications?: string;
};

export function DescriptionFields({
  register,
  errors,
}: {
  register: UseFormRegister<any>;
  errors: FieldErrors<DescriptionForm>;
}) {
  return (
    <fieldset className="w-full border rounded p-4 mb-4">
      <legend className="px-2 font-semibold">Description</legend>
      <div className="w-full mb-3">
        <InputComponent
          id="reportsTo"
          label="Reports to"
          type="text"
          inputWidth="w-full"
          placeholder="Who this role reports to (optional)"
          maxLength={ROLE_REPORTS_TO_MAX}
          register={register("reportsTo")}
          error={errors.reportsTo}
        />
      </div>
      <div className="w-full mb-3">
        <label htmlFor="descriptionSummary">Summary</label>
        <textarea
          id="descriptionSummary"
          {...register("descriptionSummary")}
          rows={4}
          maxLength={ROLE_DESCRIPTION_SUMMARY_MAX}
          className="w-full border rounded p-2"
          placeholder="What this role is for (optional)"
        />
        {errors.descriptionSummary && (
          <span className="text-red-500 text-sm">{errors.descriptionSummary.message}</span>
        )}
      </div>
      <div className="w-full mb-3">
        <label htmlFor="responsibilities">Responsibilities</label>
        <textarea
          id="responsibilities"
          {...register("responsibilities")}
          rows={6}
          maxLength={ROLE_RESPONSIBILITIES_MAX}
          className="w-full border rounded p-2"
          placeholder="What this role is responsible for (optional)"
        />
        {errors.responsibilities && (
          <span className="text-red-500 text-sm">{errors.responsibilities.message}</span>
        )}
      </div>
      <div className="w-full">
        <label htmlFor="qualifications">Qualifications</label>
        <textarea
          id="qualifications"
          {...register("qualifications")}
          rows={5}
          maxLength={ROLE_QUALIFICATIONS_MAX}
          className="w-full border rounded p-2"
          placeholder="Experience, skills, or credentials (optional)"
        />
        {errors.qualifications && (
          <span className="text-red-500 text-sm">{errors.qualifications.message}</span>
        )}
      </div>
    </fieldset>
  );
}
