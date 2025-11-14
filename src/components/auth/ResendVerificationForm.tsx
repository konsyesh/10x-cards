"use client";

import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { EmailSchema } from "@/services/auth/auth.schema";
import { fetchJson, ApiError } from "@/lib/http/http.fetcher";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Form, FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { Field, FieldGroup, FieldLabel, FieldContent, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const schema = z.object({ email: EmailSchema });
type FormData = z.infer<typeof schema>;

export function ResendVerificationForm() {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await fetchJson("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email: data.email }),
      });
      toast.success("Wysłano ponownie link", {
        description: "Sprawdź skrzynkę e‑mail.",
      });
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error("Nie udało się wysłać", { description: err.problem.detail || err.problem.title });
      } else {
        toast.error("Nie udało się wysłać", { description: "Spróbuj ponownie." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wyślij ponownie link aktywacyjny</CardTitle>
        <CardDescription>Podaj e‑mail użyty podczas rejestracji.</CardDescription>
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
                      <FieldLabel htmlFor={field.name}>E‑mail</FieldLabel>
                      <FieldContent>
                        <FormControl>
                          <Input id={field.name} type="email" placeholder="twoj@email.pl" disabled={isLoading} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FieldContent>
                    </Field>
                  </FormItem>
                )}
              />
              <Field>
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? "Wysyłanie..." : "Wyślij ponownie"}
                </Button>
                <FieldDescription className="text-center">
                  Masz kod? Możesz też zweryfikować ręcznie wprowadzając kod z e‑maila.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

