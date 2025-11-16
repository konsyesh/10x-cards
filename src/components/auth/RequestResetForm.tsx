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

const resetPasswordSchema = z.object({
  email: z.string().email("Podaj poprawny e-mail").min(1, "E-mail jest wymagany"),
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

type RequestResetFormProps = React.ComponentProps<"div">;

export function RequestResetForm({ className, ...props }: RequestResetFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);

    try {
      await fetchJson<{ message: string }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(data),
      });

      setIsSuccess(true);
      toast.success("Wiadomość wysłana", {
        description: "Jeśli adres istnieje w systemie, wysłaliśmy wiadomość z linkiem resetującym",
      });
    } catch (err) {
      setIsLoading(false);

      if (err instanceof ApiError) {
        toast.error("Błąd", {
          description: err.problem.detail || err.problem.title,
        });
      } else {
        toast.error("Błąd", {
          description: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.",
        });
      }
    }
  };

  if (isSuccess) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader>
            <CardTitle>Sprawdź skrzynkę e-mail</CardTitle>
            <CardDescription>
              Jeśli adres istnieje w systemie, wysłaliśmy wiadomość z linkiem resetującym hasło
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldDescription className="text-center">
                  <a href="/auth/login" className="underline-offset-4 hover:underline text-primary">
                    Powrót do logowania
                  </a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Reset hasła</CardTitle>
          <CardDescription>Wprowadź swój adres e-mail, a wyślemy Ci link do resetowania hasła</CardDescription>
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

                <Field>
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? "Wysyłanie..." : "Wyślij link resetujący"}
                  </Button>
                  <FieldDescription className="text-center">
                    <a href="/auth/login" className="underline-offset-4 hover:underline text-primary">
                      Powrót do logowania
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
