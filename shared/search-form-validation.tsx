import * as yup from "yup";

export const searchFormSchema = yup.object().shape({
    search: yup
    .string()
    .trim()
    .min(2, "Search string must be at least 2 characters")
    .matches(/^[A-Za-z\s]+$/, "Search string must contain only letters")
    .required("Search string is required"),
})