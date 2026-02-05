import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 bg-">
      <div className="rounded-lg bg-white p-8 shadow-lg">
        <h1 className="text-4xl font-bold text-blue-600">Welcome Home!</h1>
        <p className="mt-4 text-gray-600">
          Tailwind CSS 3.x is working perfectly!
        </p>
        {/* Input Field */}
        <Input
          label="Full Name"
          name="name"
          placeholder="John Doe"
          className="mb-4"
          required
        />
        {/* Button */}
        <div className="flex justify-center">
          <Button className="px-7">Sign Up</Button>
        </div>
      </div>
    </div>
  );
}
