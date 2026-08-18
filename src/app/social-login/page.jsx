import { Suspense } from "react";
import SocialLogin from "@/components/auth/SocialLogin";

export const metadata = {
  title: "Signing you in",
  robots: { index: false },
};

export default function SocialLoginPage() {
  // `<SocialLogin />` reads `?token=` and `?type=`, so it needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <SocialLogin />
    </Suspense>
  );
}
