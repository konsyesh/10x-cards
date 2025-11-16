"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { fetchJson, ApiError } from "@/lib/http/http.fetcher";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const verifyOtpSchema = z.object({
  email: z.string().email("Podaj poprawny e-mail").min(1, "E-mail jest wymagany"),
  token: z
    .string()
    .min(6, "Kod musi mieć 6 cyfr")
    .max(6, "Kod musi mieć 6 cyfr")
    .regex(/^\d+$/, "Kod musi składać się tylko z cyfr"),
});

type VerifyOtpFormData = z.infer<typeof verifyOtpSchema>;

interface VerifyEmailFormProps extends React.ComponentProps<"div"> {
  email: string;
  onVerified?: () => void;
}

export function VerifyEmailForm({ className, email, onVerified, ...props }: VerifyEmailFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<VerifyOtpFormData>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: {
      email,
      token: "",
    },
  });

  const onSubmit = async (data: VerifyOtpFormData) => {
    setIsLoading(true);

    try {
      await fetchJson<{ user_id: string; message: string }>("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          email: data.email,
          token: data.token,
          type: "signup",
        }),
      });

      toast.success("E-mail zweryfikowany", {
        description: "Przekierowywanie...",
      });

      // Przekieruj do strony głównej po weryfikacji
      if (onVerified) {
        onVerified();
      } else {
        window.location.href = "/generate";
      }
    } catch (err) {
      setIsLoading(false);

      if (err instanceof ApiError) {
        if (err.problem.status === 400) {
          const meta = err.problem.meta as { fieldErrors?: Record<string, string[]> } | undefined;
          if (meta?.fieldErrors) {
            const firstError = Object.values(meta.fieldErrors)[0]?.[0];
            toast.error("Błąd walidacji", {
              description: firstError || "Sprawdź poprawność wprowadzonego kodu",
            });
          } else {
            toast.error("Nieprawidłowy kod", {
              description: err.problem.detail || "Sprawdź poprawność wprowadzonego kodu",
            });
          }
        } else if (err.problem.status === 410) {
          toast.error("Kod wygasł", {
            description: "Kod weryfikacyjny wygasł. Zarejestruj się ponownie.",
          });
        } else {
          toast.error("Błąd weryfikacji", {
            description: err.problem.detail || err.problem.title,
          });
        }
      } else {
        toast.error("Błąd weryfikacji", {
          description: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.",
        });
      }
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Potwierdź adres e-mail</CardTitle>
          <CardDescription>
            Wprowadź 6-cyfrowy kod weryfikacyjny wysłany na adres <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <FieldGroup>
                <FormField
                  control={form.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem>
                      <Field>
                        <FieldLabel htmlFor={field.name}>Kod weryfikacyjny</FieldLabel>
                        <FieldDescription>
                          Wprowadź 6-cyfrowy kod z e-maila lub kliknij w link aktywacyjny
                        </FieldDescription>
                        <FieldContent>
                          <FormControl>
                            <Input
                              id={field.name}
                              type="text"
                              placeholder="123456"
                              maxLength={6}
                              disabled={isLoading}
                              className="text-center text-2xl tracking-widest font-mono"
                              {...field}
                              onChange={(e) => {
                                // Tylko cyfry
                                const value = e.target.value.replace(/\D/g, "");
                                field.onChange(value);
                              }}
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
                    {isLoading ? "Weryfikowanie..." : "Zweryfikuj kod"}
                  </Button>
                  <FieldDescription className="text-center">
                    Nie otrzymałeś kodu?{" "}
                    <a href="/auth/register" className="underline-offset-4 hover:underline text-primary">
                      Zarejestruj się ponownie
                    </a>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
