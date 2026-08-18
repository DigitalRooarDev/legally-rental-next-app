import { Suspense } from "react";
import MyAccount from "@/components/my-account";

export const metadata = {
  title: "My Account",
  robots: { index: false },
};

export default function MyAccountPage() {
  // `<MyAccount />` reads `?tab=`, so it needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <MyAccount />
    </Suspense>
  );
}
