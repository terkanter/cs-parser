import { authClient } from "@/shared/auth/auth-client";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Toaster } from "@/shared/components/ui/sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { z } from "zod";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignupSchema = z.infer<typeof signupSchema>;

function signup(values: SignupSchema) {
  return authClient.signUp.email({
    email: values.email,
    password: values.password,
    name: values.name,
  });
}

export const SignupPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const form = useForm<SignupSchema>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    resolver: zodResolver(signupSchema),
  });

  const onSubmit: SubmitHandler<SignupSchema> = (values) => {
    setLoading(true);
    signup(values)
      .then(() => {
        setLoading(false);
        toast.success("Account created successfully!");
        navigate("/login");
      })
      .catch((error) => {
        setLoading(false);
        const errorMessage =
          typeof error === "string"
            ? error
            : typeof error === "undefined" || !error.message
              ? "Failed to create account. Please try again."
              : error.message;
        toast.error(errorMessage);
      });
  };

  return (
    <div className="min-h-screen flex">
      <div className="container relative grid flex-col items-center justify-center sm:max-w-none lg:px-0">
        <div className="lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
              <p className="text-sm text-muted-foreground">Enter your details to create your account</p>
            </div>
            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  {...form.register("name")}
                  aria-invalid={!!form.formState.errors.name}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  {...form.register("email")}
                  aria-invalid={!!form.formState.errors.email}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  {...form.register("password")}
                  aria-invalid={!!form.formState.errors.password}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create account"}
              </Button>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-primary"
                    onClick={() => navigate("/login")}
                  >
                    Sign in
                  </Button>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
};
