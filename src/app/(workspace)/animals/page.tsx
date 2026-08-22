"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnimalCard } from "@/components/farm/AnimalCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { useAuth } from "@/contexts/AuthContext";
import { ANIMAL_CATEGORIES } from "@/lib/constants";
import { watchAnimals } from "@/lib/firebase/data";
import { cn } from "@/lib/utils";
import type { Animal } from "@/types";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "cattle", label: "Cattle" },
  { value: "goat", label: "Goats" },
  { value: "pig", label: "Pigs" },
  { value: "chicken", label: "Poultry" },
  { value: "other", label: "Other" },
];

export default function AnimalsPage() {
  const { isAdmin } = useAuth();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const stop = watchAnimals((list) => {
      setAnimals(list);
      setLoading(false);
    });
    return () => stop();
  }, []);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return animals.filter((animal) => {
      const matchesFilter = filter === "all" || animal.animalType === filter;
      const matchesSearch =
        !term ||
        [animal.animalId, animal.name, animal.breed, animal.tagNumber, animal.location]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      return matchesFilter && matchesSearch;
    });
  }, [animals, filter, search]);

  return (
    <div className="dashboard-stack">
      <section className="dashboard-section-title">
        <div>
          <h2>Animals</h2>
          <p>Simple Animals management — Categories: {ANIMAL_CATEGORIES.join(", ")}. Add Animal: Animal ID, Type, Name/Tag, Breed, Sex, Date Born, Date Acquired, Purchase Price, Current Status, Notes, Photo. Status: Active, Sold, Transferred, Deceased, Other.</p>
        </div>
        {isAdmin && (
          <Link className="button button-primary" href="/animals/new">
            <Plus size={18} /> Add animal
          </Link>
        )}
      </section>

      <div className="farm-toolbar">
        <div className="search-field">
          <Search size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by ID, name, breed, tag, location…" aria-label="Search animals" />
        </div>
      </div>

      <div className="filter-scroll" role="tablist" aria-label="Filter by animal type">
        {FILTERS.map((option) => (
          <button key={option.value} type="button" className={cn(filter === option.value && "active")} onClick={() => setFilter(option.value)}>
            {option.label}
          </button>
        ))}
      </div>

      {loading ? <Loading label="Loading animals…" /> : visible.length ? (
        <div className="animal-grid">
          {visible.map((animal) => (
            <AnimalCard key={animal.id} animal={animal} />
          ))}
        </div>
      ) : animals.length ? (
        <EmptyState icon={Search} title="No matching animals" description="Try different search or filter." />
      ) : (
        <EmptyState icon={Plus} title="No animals yet" description="Add first animal: Animal ID, Type, Name/Tag, Breed, Sex, Date Born, Date Acquired, Purchase Price, Current Status, Notes, Photo." action={isAdmin ? <Link className="button button-primary" href="/animals/new"><Plus size={18} /> Add animal</Link> : undefined} />
      )}
    </div>
  );
}
