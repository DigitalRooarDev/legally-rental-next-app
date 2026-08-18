import Home from "@/components/home";
import { getBuyerDashboard } from "@/actions/getBuyerDashboard";

export const metadata = {
  title: "Rent property, vehicles, equipment & fashion in Nigeria",
};

export default async function HomePage() {
  // Deduped with the root layout's call by `cache()` — one API request per render.
  const { data, error } = await getBuyerDashboard();

  return <Home data={data} error={error} />;
}
