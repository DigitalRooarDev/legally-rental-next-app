import { Suspense } from "react";
import Login from "@/components/auth/Login";

export const metadata = {
  title: "Login",
  description: "Sign in to your Legally Rental account to manage bookings and your wishlist.",
  robots: { index: false },
};

export default function LoginPage() {
  // `<Login />` reads `?redirect=`, so it needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  );
}
