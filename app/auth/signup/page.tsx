import { SignupForm } from "@/components/auth/signup-form";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import Image from "next/image";

const LoginPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-transparent">
            <Image
              src="/icons/icon.png"
              alt="iCustomer's company logo"
              width={156}
              height={114}
            />
          </div>

          <div>
            <CardTitle className="text-2xl">
              Create a OneSource account
            </CardTitle>
            <CardDescription className="mt-2">
              Discover, enrich, and prospect using our agentic tools
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <SignupForm />
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
