import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { AlertCircle } from "lucide-react";

export type InputProps = React.ComponentProps<"input"> & {
  label?: string;
  error?: string;
};

function Input({ className, type, label, error, ...props }: InputProps) {
  const isCheckbox = type === "checkbox";

  return (
    <div className="w-full">
      {isCheckbox ? (
        <div className="space-y-1.5">
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className={cn(
                "mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 disabled:cursor-not-allowed",
                error && "ring-2 ring-red-500",
                className,
              )}
              {...props}
            />
            <span>{label}</span>
          </label>
          {error && <p className="ml-6 text-xs text-red-600">{error}</p>}
        </div>
      ) : (
        <>
          {label && (
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label}
              {props.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}

          <input
            type={type}
            className={cn(
              "flex h-10 w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm",
              "placeholder:text-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-red-500 focus:ring-red-500",
              className,
            )}
            {...props}
          />

          {error && (
            <p
              role="alert"
              className="mt-1 flex items-center gap-1 text-sm text-red-600"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{error}</span>
            </p>
          )}
        </>
      )}
    </div>
  );
}

export { Input };
