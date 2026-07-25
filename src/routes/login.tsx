import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Brand } from "@/components/common/Brand";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/constants/routes.constant";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/auth.service";
import { ApiError } from "@/services/rest.service";

const schema = z.object({
  userId: z.string().trim().min(1, "User ID is required").max(64),
  password: z.string().min(1, "Password is required").max(128),
});

type FormValues = z.infer<typeof schema>;

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — PrepRoute" },
      { name: "description", content: "Sign in with your PrepRoute admin credentials." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { signIn, isAuthenticated, ready } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (ready && isAuthenticated) navigate({ to: ROUTES.DASHBOARD, replace: true });
  }, [ready, isAuthenticated, navigate]);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const res = await authService.login(values);
      const { token, user } = res.data;
      signIn(token, user ?? { userId: values.userId });
      toast.success("Welcome back!");
      navigate({ to: ROUTES.DASHBOARD, replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Unable to sign in";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-svh bg-background">
      <div className="absolute right-4 top-4 z-10 md:right-8 md:top-6">
        <ThemeToggle />
      </div>

      <div className="mx-auto grid min-h-svh max-w-6xl items-center gap-8 px-4 py-10 lg:grid-cols-2 lg:gap-0 lg:px-8">
        {/* Left — Figma illustration panel */}
        <div className="hidden lg:flex flex-col items-center justify-center rounded-2xl bg-accent/60 px-10 py-16">
          <LoginIllustration />
        </div>

        {/* Right — white login card */}
        <div className="flex justify-center lg:justify-end">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10">
            <Brand className="mb-10" />

            <h1 className="text-3xl font-bold tracking-tight text-foreground">Login</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Use your company provided Login credentials
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="userId" className="font-semibold">
                  User ID
                </Label>
                <Input
                  id="userId"
                  autoComplete="username"
                  placeholder="Enter User ID"
                  className="h-11"
                  {...register("userId")}
                  aria-invalid={!!errors.userId}
                />
                {errors.userId && (
                  <p className="text-xs text-destructive">{errors.userId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="font-semibold">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter Password"
                    className="h-11 pr-10"
                    {...register("password")}
                    aria-invalid={!!errors.password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <button
                type="button"
                className="text-sm font-medium text-primary hover:underline"
                onClick={() =>
                  toast.info("Please contact your administrator to reset your password.")
                }
              >
                Forgot password?
              </button>

              <Button type="submit" className="h-11 w-full text-base" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Login
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Hourglass character + laptop — matches the Figma login illustration style. */
function LoginIllustration() {
  return (
    <svg viewBox="0 0 420 340" className="w-full max-w-md text-primary" fill="none" aria-hidden>
      {/* Desk */}
      <rect x="40" y="250" width="340" height="10" rx="3" className="fill-muted-foreground/25" />
      <rect x="70" y="260" width="8" height="50" className="fill-muted-foreground/20" />
      <rect x="342" y="260" width="8" height="50" className="fill-muted-foreground/20" />

      {/* Hourglass body */}
      <path
        d="M155 70 h70 l-28 70 28 70 h-70 l28-70 -28-70 z"
        className="fill-primary/20 stroke-primary"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M170 95 h40 l-12 35 12 35 h-40 l12-35 -12-35 z" className="fill-primary/40" />
      {/* Caps */}
      <rect x="150" y="58" width="80" height="14" rx="4" className="fill-primary" />
      <rect x="150" y="208" width="80" height="14" rx="4" className="fill-primary" />
      {/* Face */}
      <circle cx="178" cy="130" r="3.5" className="fill-foreground" />
      <circle cx="202" cy="130" r="3.5" className="fill-foreground" />
      <path
        d="M180 145 Q190 154 200 145"
        className="stroke-foreground"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Laptop */}
      <rect
        x="230"
        y="175"
        width="120"
        height="75"
        rx="6"
        className="fill-card stroke-border"
        strokeWidth="2"
      />
      <rect x="240" y="185" width="100" height="48" rx="3" className="fill-accent" />
      <rect x="250" y="195" width="70" height="4" rx="1" className="fill-primary/50" />
      <rect x="250" y="205" width="50" height="4" rx="1" className="fill-primary/40" />
      <rect x="250" y="215" width="60" height="4" rx="1" className="fill-primary/40" />
      <path d="M220 250 h140 l8 12 H212 z" className="fill-muted-foreground/30" />

      {/* Decorative marks */}
      <text x="300" y="90" className="fill-primary/50" fontSize="22" fontWeight="700">
        +
      </text>
      <circle cx="330" cy="120" r="4" className="fill-primary/35" />
      <circle cx="120" cy="100" r="3" className="fill-primary/30" />
    </svg>
  );
}
