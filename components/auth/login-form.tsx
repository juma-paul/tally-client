"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api/auth";
import Link from "next/link";
import { GoogleIcon } from "@/components/GoogleIcon";

export const LoginForm = () => {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  // Form validation
  const validateForm = () => {
    const errors: typeof fieldErrors = {};

    if (!email.trim()) errors.email = "Enter an email address.";
    if (!password.trim()) errors.password = "Password is required.";

    return { errors, isValid: Object.keys(errors).length === 0 };
  };

  // Handle form submission
  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { errors, isValid } = validateForm();

    if (!isValid) {
      setFieldErrors(errors);
      setError(null);
      return;
    }

    setFieldErrors({});
    setIsLoading(true);
    setError(null);

    try {
      await authApi.login({ email, password });
      router.push("/dashboard");
    } catch (err: any) {
      if (err?.fields) {
        setFieldErrors(fieldErrors);
      } else {
        setError(err.message || "Login failed. Please try again.");
        setTimeout(() => setError(""), 3000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Implement Google OAuth
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <Input
        type="email"
        label="Email address"
        placeholder="example@email.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setFieldErrors((prev) => ({ ...prev, email: undefined }));
        }}
        disabled={isLoading}
        error={fieldErrors.email}
        required
      />

      <Input
        type="password"
        label="Password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setFieldErrors((prev) => ({ ...prev, password: undefined }));
        }}
        disabled={isLoading}
        error={fieldErrors.password}
        required
      />

      <Button
        type="submit"
        className="w-full bg-[#2966BC]"
        disabled={isLoading}
      >
        {isLoading ? "Logging in..." : " Log in"}
      </Button>

      {/* Separator */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">OR</span>
        </div>
      </div>

      {/* Google Login */}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleLogin}
        disabled={isLoading}
      >
        <GoogleIcon />
        Continue with Google
      </Button>

      {/* Link to Sign up page */}
      <p className="text-center text-sm text-gray-600">
        Don't have an account?{" "}
        <Link
          href="/auth/signup"
          className="font-medium text-blue-600 hover:text-blue-500"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
};
