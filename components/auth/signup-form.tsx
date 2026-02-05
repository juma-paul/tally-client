"use client";

import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/GoogleIcon";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/auth";

export const SignupForm = () => {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    agree?: string;
  }>({});

  console.log(agree);

  //   Form validation
  const validateForm = () => {
    const errors: typeof fieldErrors = {};

    if (!firstName.trim()) errors.firstName = "First name is required.";
    if (!lastName.trim()) errors.lastName = "Last name is required.";
    if (!email.trim()) errors.email = "Enter an email address.";
    if (!password.trim()) errors.password = "Password is required.";
    if (!confirmPassword.trim())
      errors.confirmPassword = "Please confirm your password.";
    if (password !== confirmPassword)
      errors.confirmPassword = "Passwords don't match.";
    if (!agree) errors.agree = "You must agree to the terms and conditions.";

    return { errors, isValid: Object.keys(errors).length === 0 };
  };

  // Form Submission
  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { errors, isValid } = validateForm();

    if (!isValid) {
      setFieldErrors(errors);
      setError(null);
      return;
    }

    setFieldErrors({});
    setLoading(true);
    setError(null);

    try {
      await authApi.signup({
        firstName,
        lastName,
        email,
        password,
        confirmPassword,
        agree,
      });
      router.push("/dashboard");
    } catch (err: any) {
      if (err?.fields) {
        setFieldErrors(fieldErrors);
      } else {
        setError(err.message || "Signup failed. Please try again.");
        setTimeout(() => setError(""), 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  //   Google OAuth
  const handleGoogleOAuth = () => {
    // TODO: implement functionality
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <div className="flex gap-4">
        <Input
          type="text"
          value={firstName}
          onChange={(e) => {
            setFirstName(e.target.value);
            setFieldErrors((prev) => ({ ...prev, firstName: undefined }));
          }}
          label="First name"
          placeholder="John"
          disabled={loading}
          error={fieldErrors.firstName}
          required
        />
        <Input
          type="text"
          value={lastName}
          onChange={(e) => {
            setLastName(e.target.value);
            setFieldErrors((prev) => ({ ...prev, lastName: undefined }));
          }}
          label="Last name"
          placeholder="Doe"
          error={fieldErrors.lastName}
          disabled={loading}
        />
      </div>
      <Input
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setFieldErrors((prev) => ({ ...prev, email: undefined }));
        }}
        label="Email address"
        placeholder="onesource@icustomer.ai"
        disabled={loading}
        error={fieldErrors.email}
        required
      />
      <Input
        type="password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setFieldErrors((prev) => ({ ...prev, password: undefined }));
        }}
        label="Password"
        placeholder="••••••••"
        disabled={loading}
        error={fieldErrors.password}
        required
      />
      <Input
        type="password"
        value={confirmPassword}
        onChange={(e) => {
          setConfirmPassword(e.target.value);
          setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
        }}
        label="Confirm password"
        placeholder="••••••••"
        disabled={loading}
        error={fieldErrors.confirmPassword}
        required
      />
      <Input
        type="checkbox"
        checked={agree}
        onChange={(e) => {
          setAgree(e.target.checked);
          setFieldErrors((prev) => ({ ...prev, agree: undefined }));
        }}
        label="By checking this form, you agree with OneSource's terms and conditions."
        disabled={loading}
        error={fieldErrors.agree}
        required
      />
      {/* Signup button */}
      <Button className="w-full" type="submit" disabled={loading}>
        {loading ? "Signing up..." : "Sign up"}
      </Button>

      {/* Divider */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-3 text-gray-500">OR</span>
        </div>
      </div>

      {/* Google OAuth */}
      <Button
        className="w-full"
        type="button"
        variant="outline"
        disabled={loading}
        onClick={handleGoogleOAuth}
      >
        <GoogleIcon />
        Continue with Google
      </Button>

      {/* Link to login page */}
      <p className="text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="font-medium text-blue-600 hover:text-blue-500"
        >
          Log in
        </Link>
      </p>
    </form>
  );
};
