"use client";

import Link from "next/link";
import { PawPrint } from "lucide-react";
import { ANIMAL_STATUS_LABELS, ANIMAL_TYPE_LABELS } from "@/lib/constants";
import type { Animal } from "@/types";

export function AnimalCard({ animal }: { animal: Animal }) {
  const typeLabel = ANIMAL_TYPE_LABELS[animal.animalType] || animal.animalType;
  const statusLabel = ANIMAL_STATUS_LABELS[animal.status] || animal.status;
  return (
    <Link href={`/animals/${animal.id}`} className="animal-card" aria-label={`View ${typeLabel} ${animal.animalId}`}>
      <div className="animal-card-photo">
        {animal.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={animal.photo} alt={`${animal.name || animal.animalId} photo`} />
        ) : (
          <span className="placeholder"><PawPrint size={40} /></span>
        )}
        <span className={`status-badge status-${animal.status}`}>{statusLabel}</span>
      </div>
      <div className="animal-card-body">
        <h3>{animal.name || `${typeLabel} ${animal.animalId}`}</h3>
        <span className="sub">
          {typeLabel} · #{animal.animalId}
          {animal.tagNumber ? ` · Tag ${animal.tagNumber}` : ""}
        </span>
        <div className="animal-card-meta">
          <span><small>Breed</small><strong>{animal.breed || "—"}</strong></span>
          <span><small>Sex</small><strong>{animal.sex}</strong></span>
          <span><small>Weight</small><strong>{animal.weight != null ? `${animal.weight} kg` : "—"}</strong></span>
          <span><small>Location</small><strong>{animal.location || "—"}</strong></span>
        </div>
      </div>
    </Link>
  );
}
