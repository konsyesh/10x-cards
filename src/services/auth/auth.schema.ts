import { z } from "zod";

export const EmailSchema = z.string().email("Podaj poprawny e-mail").min(1, "E-mail jest wymagany");

export const PasswordSchema = z
  .string()
  .min(8, "Hasło musi mieć co najmniej 8 znaków")
  .max(72, "Hasło nie może przekraczać 72 znaków")
  .regex(/[A-Za-z]/, "Hasło musi zawierać co najmniej jedną literę")
  .regex(/[0-9]/, "Hasło musi zawierać co najmniej jedną cyfrę");

export const RegisterCredentialsSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});

export const RegisterFormSchema = RegisterCredentialsSchema.extend({
  confirmPassword: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "Musisz zaakceptować regulamin",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Hasła nie są identyczne",
  path: ["confirmPassword"],
});

export type RegisterFormData = z.infer<typeof RegisterFormSchema>;
