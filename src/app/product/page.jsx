import ProductList from "@/components/rental/ProductList";
import { getBuyerDashboard } from "@/actions/getBuyerDashboard";
import { dedupeProducts } from "@/utils/mappers";

export const metadata = {
  title: "All rentals",
  description: "Browse every rental listing available on Legally Rental.",
};

export default async function ProductListingPage() {
  const { data } = await getBuyerDashboard();

  const products = dedupeProducts([...data.topServices, ...data.properties, ...data.vehicles]);

  return <ProductList title="All Rentals" products={products} />;
}
