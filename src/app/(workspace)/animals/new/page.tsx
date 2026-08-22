"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { useState } from "react";
import { AnimalForm, type AnimalFormValues } from "@/components/farm/AnimalForm";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useToast } from "@/contexts/ToastContext";
import { createAnimal } from "@/lib/firebase/data";
import { friendlyError } from "@/lib/utils";

export default function NewAnimalPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (values: AnimalFormValues) => {
    setSaving(true);
    setError("");
    try {
      const ref = await createAnimal({
        animalId: values.animalId,
        tagNumber: values.tagNumber,
        name: values.name,
        animalType: values.animalType,
        breed: values.breed,
        sex: values.sex,
        dateOfBirth: values.dateOfBirth,
        estimatedAge: values.estimatedAge,
        colour: values.colour,
        identifyingFeatures: values.identifyingFeatures,
        registrationType: values.registrationType,
        datePurchased: values.datePurchased,
        acquisitionDate: values.acquisitionDate,
        purchasePrice: values.purchasePrice,
        supplier: values.supplier,
        sellerContact: values.sellerContact,
        purchasedFor: values.purchasedFor,
        transportInformation: values.transportInformation,
        location: values.location,
        weight: values.weight,
        status: values.status,
        healthStatus: values.healthStatus,
        statusDate: values.statusDate,
        statusReason: values.statusReason,
        notes: values.notes,
        photo: values.photo,
        photoPath: values.photoPath,
      });
      showToast("Animal saved.", "success");
      router.replace(`/animals/${ref.id}`);
    } catch (cause) {
      setError(friendlyError(cause));
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute roles={["staff", "admin"]} permission="Animals">
      <div className="dashboard-stack">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <span>
            <Link href="/animals">Animals</Link>
          </span>
          <span aria-current="page">Add animal</span>
        </nav>
        <div className="dashboard-panel">
          <div className="section-row" style={{ marginBottom: 20 }}>
            <div>
              <h2>Add animal</h2>
              <p>Record the animal&apos;s details, then upload its photograph to Cloudinary.</p>
            </div>
            <Link className="button button-ghost" href="/animals">
              <ArrowLeft size={16} /> Back
            </Link>
          </div>
          {error && (
            <div className="form-alert error" style={{ marginBottom: 16 }}>
              <CircleAlert size={17} /> {error}
            </div>
          )}
          <AnimalForm onSubmit={submit} saving={saving} onCancel={() => router.push("/animals")} />
        </div>
      </div>
    </ProtectedRoute>
  );
}
