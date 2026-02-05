import * as React from "react";
import { cn } from "@/lib/utils/cn";

// Card
export type CardProps = React.ComponentProps<"div">;

const Card = ({ className, ...props }: CardProps) => {
  return (
    <div
      className={cn(
        "rounded-lg border border-gray-200 bg-white shadow-sm",
        className,
      )}
      {...props}
    />
  );
};

// Card Heading
export type CardHeaderProps = React.ComponentProps<"div">;

const CardHeader = ({ className, ...props }: CardHeaderProps) => {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  );
};

// Card Title
export type CardTitleProps = React.ComponentProps<"h3">;

const CardTitle = ({ className, ...props }: CardTitleProps) => {
  return (
    <h3
      className={cn(
        "text-2xl font-semibold leading-none tracking-tight",
        className,
      )}
      {...props}
    />
  );
};

// Card Description
export type CardDescProps = React.ComponentProps<"p">;

const CardDescription = ({ className, ...props }: CardDescProps) => {
  return <p className={cn("text-sm text-gray-500", className)} {...props} />;
};

// Card Content
export type CardContentProps = React.ComponentProps<"div">;

const CardContent = ({ className, ...props }: CardContentProps) => {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
};

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
