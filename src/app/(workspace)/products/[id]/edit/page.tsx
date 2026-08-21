"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loading } from "@/components/ui/Loading";
import { ProductForm } from "@/components/store/ProductForm";
import { useToast } from "@/contexts/ToastContext";
import { getProduct, updateProduct } from "@/lib/firebase/data";
import type { Product } from "@/types";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProduct(params.id).then((found) => {
      setProduct(found);
      setLoading(false);
    });
  }, [params.id]);

  if (loading) {
    return (
      <div className="dashboard-stack">
        <Loading label="Loading product…" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="dashboard-stack">
        <div className="empty-state compact">
          <h3>Product not found</h3>
          <p>This product may have been removed.</p>
          <button className="button button-primary" onClick={() => router.push("/products")}>
            Back to products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-stack">
      <section className="dashboard-section-title">
        <div>
          <h2>Edit product</h2>
          <p>Update the details for “{product.name}”.</p>
        </div>
      </section>
      <ProductForm
        initial={product}
        submitLabel="Save changes"
        onCancel={() => router.push("/products")}
        onSubmit={async (values) => {
          await updateProduct(product.id, values);
          showToast("Product updated", "success");
          router.push("/products");
        }}
      />
    </div>
  );
}
