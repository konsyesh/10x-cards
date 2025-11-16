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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { VerifyEmailForm } from "./VerifyEmailForm";
import { RegisterFormSchema, type RegisterFormData } from "@/services/auth/auth.schema";

type RegisterFormProps = React.ComponentProps<"div">;

export function RegisterForm({ className, ...props }: RegisterFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string>("");

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(RegisterFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);

    try {
      const response = await fetchJson<{ user_id?: string; message: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      // Jeśli zwrócono user_id, oznacza to automatyczne zalogowanie
      if (response.user_id) {
        setIsLoading(false);
        toast.success("Rejestracja udana", {
          description: "Przekierowywanie...",
        });
        window.location.href = "/generate";
      } else {
        // Wymagane potwierdzenie e-mail - reset isLoading i pokaż formularz weryfikacji
        setIsLoading(false);
        setShowVerification(true);
        setRegisteredEmail(data.email);
        toast.success("Sprawdź skrzynkę e-mail", {
          description: response.message || "Wprowadź kod weryfikacyjny z e-maila lub kliknij w link",
        });
      }
    } catch (err) {
      setIsLoading(false);

      if (err instanceof ApiError) {
        // Konflikt - email już istnieje
        if (err.problem.status === 409) {
          toast.error("Konto z tym adresem e-mail już istnieje");
        } else if (err.problem.status === 400) {
          // Błędy walidacji - pokaż szczegóły z meta jeśli dostępne
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
          toast.error("Błąd rejestracji", {
            description: err.problem.detail || err.problem.title,
          });
        }
      } else {
        toast.error("Błąd rejestracji", {
          description: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.",
        });
      }
    }
  };

  // Jeśli wymagana weryfikacja, pokaż formularz weryfikacji
  if (showVerification && registeredEmail) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <VerifyEmailForm
          email={registeredEmail}
          onVerified={() => {
            window.location.href = "/generate";
          }}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Utwórz konto</CardTitle>
          <CardDescription>Wprowadź swoje dane, aby utworzyć nowe konto</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <FieldGroup>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <Field>
                        <FieldLabel htmlFor={field.name}>E-mail</FieldLabel>
                        <FieldContent>
                          <FormControl>
                            <Input
                              id={field.name}
                              type="email"
                              placeholder="twoj@email.pl"
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
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <Field>
                        <FieldLabel htmlFor={field.name}>Hasło</FieldLabel>
                        <FieldDescription>Minimum 8 znaków, co najmniej jedna litera i jedna cyfra</FieldDescription>
                        <FieldContent>
                          <FormControl>
                            <Input id={field.name} type="password" disabled={isLoading} {...field} />
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
                        <FieldLabel htmlFor={field.name}>Potwierdź hasło</FieldLabel>
                        <FieldContent>
                          <FormControl>
                            <Input id={field.name} type="password" disabled={isLoading} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FieldContent>
                      </Field>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="acceptTerms"
                  render={({ field }) => (
                    <FormItem>
                      <Field orientation="horizontal">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isLoading} />
                        </FormControl>
                        <FieldContent>
                          <FormLabel className="cursor-pointer">
                            Akceptuję{" "}
                            <a
                              href="#"
                              className="underline-offset-4 hover:underline text-primary"
                              onClick={(e) => {
                                e.preventDefault();
                                // TODO: Link do regulaminu/privacy policy (US-027)
                              }}
                            >
                              regulamin i politykę prywatności
                            </a>
                          </FormLabel>
                          <FormMessage />
                        </FieldContent>
                      </Field>
                    </FormItem>
                  )}
                />

                <Field>
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? "Rejestrowanie..." : "Zarejestruj się"}
                  </Button>
                  <FieldDescription className="text-center">
                    Masz już konto?{" "}
                    <a href="/auth/login" className="underline-offset-4 hover:underline text-primary">
                      Zaloguj się
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
