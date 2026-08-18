import ProductGrid from "@/components/theme/ProductGrid";

/**
 * Listing page body — same `<ProductBox />` as the home rails, grid layout instead.
 *
 * @param {object} props
 * @param {string} props.title
 * @param {Array<object>} props.products
 */
export default function ProductList({ title, products }) {
  return (
    <section className="product-section">
      <div className="container">
        <div className="product-head d-flex justify-content-between align-items-center">
          <div className="product-title">
            <h1 className="section-title d-flex align-items-center">{title}</h1>
          </div>
        </div>

        <ProductGrid
          products={products}
          columns={4}
          emptyMessage="No rentals available right now."
        />
      </div>
    </section>
  );
}
