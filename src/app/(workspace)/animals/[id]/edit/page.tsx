"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { AnimalForm, type AnimalFormValues } from "@/components/farm/AnimalForm";
import { Loading } from "@/components/ui/Loading";
import { useToast } from "@/contexts/ToastContext";
import { getAnimal, updateAnimal } from "@/lib/firebase/data";
import type { Animal } from "@/types";

export default function EditAnimalPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { showToast } = useToast();
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getAnimal(id).then((value) => {
      setAnimal(value);
      setLoading(false);
    });
  }, [id]);

  const submit = async (values: AnimalFormValues) => {
    if (!animal) return;
    setSaving(true);
    setError("");
    try {
      const { id: _id, ...base } = animal;
      void _id;
      await updateAnimal(id, {
        ...base,
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
      showToast("Animal updated.", "success");
      router.replace(`/animals/${id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update the animal.");
      setSaving(false);
    }
  };

  if (loading) return <Loading label="Loading animal…" />;

  if (!animal) {
    return (
      <div className="access-state page-shell">
        <h1>Animal not found</h1>
        <Link className="button button-primary" href="/animals">
          Back to animals
        </Link>
      </div>
    );
  }

  return (
    <div className="dashboard-stack">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <span>
          <Link href="/animals">Animals</Link>
        </span>
        <span>
          <Link href={`/animals/${id}`}>{animal.name || animal.animalId}</Link>
        </span>
        <span aria-current="page">Edit</span>
      </nav>
      <div className="dashboard-panel">
        <div className="section-row" style={{ marginBottom: 20 }}>
          <div>
            <h2>Edit animal</h2>
            <p>Update the record for {animal.name || animal.animalId}.</p>
          </div>
          <Link className="button button-ghost" href={`/animals/${id}`}>
            <ArrowLeft size={16} /> Back
          </Link>
        </div>
        {error && (
          <div className="form-alert error" style={{ marginBottom: 16 }}>
            <CircleAlert size={17} /> {error}
          </div>
        )}
        <AnimalForm defaults={animal} onSubmit={submit} saving={saving} onCancel={() => router.push(`/animals/${id}`)} />
      </div>
    </div>
  );
}
