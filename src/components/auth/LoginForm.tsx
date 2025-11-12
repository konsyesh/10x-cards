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

const loginSchema = z.object({
  email: z.string().email("Podaj poprawny e-mail").min(1, "E-mail jest wymagany"),
  password: z.string().min(1, "Hasło jest wymagane"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps extends React.ComponentProps<"div"> {
  redirectTo?: string;
}

export function LoginForm({ className, redirectTo, ...props }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const finalRedirectTo = redirectTo || searchParams?.get("redirectTo") || "/generate";

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      await fetchJson<{ user_id: string; email: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });

      toast.success("Zalogowano pomyślnie", {
        description: "Przekierowywanie...",
      });

      // Redirect po sukcesie
      window.location.href = finalRedirectTo;
    } catch (err) {
      setIsLoading(false);

      if (err instanceof ApiError) {
        // Dla błędów autoryzacji pokazujemy neutralny komunikat
        if (err.problem.status === 401 || err.problem.status === 403) {
          toast.error("Nieprawidłowy e-mail lub hasło");
        } else {
          toast.error("Błąd logowania", {
            description: err.problem.detail || err.problem.title,
          });
        }
      } else {
        toast.error("Błąd logowania", {
          description: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.",
        });
      }
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Zaloguj się do konta</CardTitle>
          <CardDescription>
            Wprowadź swój e-mail i hasło, aby się zalogować
          </CardDescription>
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
                        <div className="flex items-center">
                          <FieldLabel htmlFor={field.name}>Hasło</FieldLabel>
                          <a
                            href="/auth/reset-password"
                            className="ml-auto inline-block text-sm underline-offset-4 hover:underline text-muted-foreground"
                          >
                            Nie pamiętam hasła
                          </a>
                        </div>
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
                    {isLoading ? "Logowanie..." : "Zaloguj"}
                  </Button>
                  <FieldDescription className="text-center">
                    Nie masz konta?{" "}
                    <a
                      href="/auth/register"
                      className="underline-offset-4 hover:underline text-primary"
                    >
                      Zarejestruj się
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

