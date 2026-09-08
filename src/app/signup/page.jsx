import SignUp from "@/components/auth/SignUp";

export const metadata = {
  title: "Register",
  description: "Create a Legally Rental account to book rentals and save your favourites.",
  robots: { index: false },
};

export default function SignUpPage() {
  return <SignUp />;
}
