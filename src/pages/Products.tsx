import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Product {
  id: string;
  name: string;
  price_cents: number;
  image?: string;
  description: string;
}

const BASE = import.meta.env.VITE_API_URL;

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch(`${BASE}/api/products/`);
        if (!response.ok) throw new Error("Failed to fetch products");
        const productsData = await response.json();
        setProducts(productsData);
      } catch (err) {
        setError("Failed to load products");
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  const formatPrice = (cents: number) => {
    return `R${(cents / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-silver-600">Loading products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-black mb-8">Products</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="border-silver-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl text-black">{product.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {product.image && (
                    <div className="w-full h-48 bg-silver-100 rounded-lg flex items-center justify-center">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  )}
                  {product.description && (
                    <p className="text-silver-600 text-sm">{product.description}</p>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-black">
                      {formatPrice(product.price_cents)}
                    </span>
                    <button className="bg-black text-white px-4 py-2 rounded-sm hover:bg-charcoal-800 transition-colors text-sm">
                      Add to Cart
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-12">
            <p className="text-silver-600">No products available at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
