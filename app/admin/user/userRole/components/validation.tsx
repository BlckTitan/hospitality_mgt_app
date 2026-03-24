import * as yup from "yup";

export const formSchema = yup.object().shape({
  userId: yup
    .string()
    .required("User is required"),

  roleId: yup
    .string()
    .required("Role is required"),

  propertyId: yup
    .string()
    .required("Property is required"),

  assignedBy: yup
    .string()
    .required("Assigned by is required"),
});

