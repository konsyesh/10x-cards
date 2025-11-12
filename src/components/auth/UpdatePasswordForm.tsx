"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { fetchJson, ApiError } from "@/lib/http/http.fetcher";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const updatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Hasło musi mieć co najmniej 8 znaków")
      .max(72, "Hasło nie może przekraczać 72 znaków")
      .regex(/[A-Za-z]/, "Hasło musi zawierać co najmniej jedną literę")
      .regex(/[0-9]/, "Hasło musi zawierać co najmniej jedną cyfrę"),
    confirmPassword: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są identyczne",
    path: ["confirmPassword"],
  });

type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;

interface UpdatePasswordFormProps extends React.ComponentProps<"div"> {}

export function UpdatePasswordForm({ className, ...props }: UpdatePasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: UpdatePasswordFormData) => {
    setIsLoading(true);

    try {
      await fetchJson<{ message: string }>("/api/auth/update-password", {
        method: "POST",
        body: JSON.stringify({
          password: data.password,
          confirmPassword: data.confirmPassword,
        }),
      });

      toast.success("Hasło zostało zaktualizowane", {
        description: "Możesz się teraz zalogować",
      });

      // Redirect do logowania po sukcesie
      setTimeout(() => {
        window.location.href = "/auth/login";
      }, 1500);
    } catch (err) {
      setIsLoading(false);

      if (err instanceof ApiError) {
        // Link wygasł lub jest nieprawidłowy
        if (err.problem.status === 401 || err.problem.status === 410) {
          toast.error("Link wygasł lub jest nieprawidłowy", {
            description: "Poproś o nowy link resetujący hasło",
          });
        } else if (err.problem.status === 400) {
          // Błędy walidacji
          const meta = err.problem.meta as { fieldErrors?: Record<string, string[]> } | undefined;
          if (meta?.fieldErrors) {
            const firstError = Object.values(meta.fieldErrors)[0]?.[0];
            toast.error("Błąd walidacji", {
              description: firstError || "Sprawdź poprawność wprowadzonych danych",
            });
          } else {
            toast.error("Błąd walidacji", {
              description: err.problem.detail || "Sprawdź poprawność wprowadzonych danych",
            });
          }
        } else {
          toast.error("Błąd aktualizacji hasła", {
            description: err.problem.detail || err.problem.title,
          });
        }
      } else {
        toast.error("Błąd aktualizacji hasła", {
          description: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.",
        });
      }
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Ustaw nowe hasło</CardTitle>
          <CardDescription>
            Wprowadź nowe hasło dla swojego konta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <FieldGroup>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <Field>
                        <FieldLabel htmlFor={field.name}>Nowe hasło</FieldLabel>
                        <FieldDescription>
                          Minimum 8 znaków, co najmniej jedna litera i jedna cyfra
                        </FieldDescription>
                        <FieldContent>
                          <FormControl>
                            <Input
                              id={field.name}
                              type="password"
                              disabled={isLoading}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FieldContent>
                      </Field>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <Field>
                        <FieldLabel htmlFor={field.name}>Potwierdź nowe hasło</FieldLabel>
                        <FieldContent>
                          <FormControl>
                            <Input
                              id={field.name}
                              type="password"
                              disabled={isLoading}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FieldContent>
                      </Field>
                    </FormItem>
                  )}
                />

                <Field>
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? "Aktualizowanie..." : "Zaktualizuj hasło"}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

