"use client";

import { useRouter } from "next/navigation";
import { ProductForm } from "@/components/store/ProductForm";
import { useToast } from "@/contexts/ToastContext";
import { createProduct } from "@/lib/firebase/data";

export default function NewProductPage() {
  const router = useRouter();
  const { showToast } = useToast();

  return (
    <div className="dashboard-stack">
      <section className="dashboard-section-title">
        <div>
          <h2>Add product</h2>
          <p>Create a new item for the online shop.</p>
        </div>
      </section>
      <ProductForm
        submitLabel="Save product"
        onCancel={() => router.push("/products")}
        onSubmit={async (values) => {
          await createProduct(values);
          showToast("Product added", "success");
          router.push("/products");
        }}
      />
    </div>
  );
}
