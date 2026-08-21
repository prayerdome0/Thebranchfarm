"use client";

import Link from "next/link";
import {
  Activity as ActivityIcon,
  FileText,
  HeartPulse,
  PawPrint,
  Plus,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getActivities,
  getAnimals,
  getFarmDocuments,
  getHealthRecords,
  getUsers,
} from "@/lib/firebase/data";
import { formatDisplayDate } from "@/lib/utils";
import type { ActivityRecord, Animal, FarmDocument, HealthRecord, UserProfile } from "@/types";

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [health, setHealth] = useState<HealthRecord[]>([]);
  const [documents, setDocuments] = useState<FarmDocument[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [staff, setStaff] = useState<UserProfile[]>([]);

  useEffect(() => {
    getAnimals().then(setAnimals);
    getHealthRecords().then(setHealth);
    getFarmDocuments().then(setDocuments);
    getActivities().then(setActivities);
    if (isAdmin) getUsers().then(setStaff);
  }, [isAdmin]);

  const activeCount = animals.filter((animal) => animal.status === "active").length;
  const attentionCount = animals.filter(
    (animal) => ["sick", "injured", "under-observation"].includes(animal.healthStatus),
  ).length;
  const staffCount = staff.filter(
    (member) => (member.role === "staff" || member.role === "admin") && member.status === "active",
  ).length;

  const stats = [
    { label: "Animals", value: animals.length, icon: PawPrint, href: "/animals" },
    { label: "Active animals", value: activeCount, icon: PawPrint, href: "/animals" },
    { label: "Need attention", value: attentionCount, icon: HeartPulse, href: "/health", warning: attentionCount > 0 },
    { label: "Health records", value: health.length, icon: Stethoscope, href: "/health" },
    { label: "Documents", value: documents.length, icon: FileText, href: "/documents" },
    ...(isAdmin ? [{ label: "Staff", value: staffCount, icon: UsersRound, href: "/staff" }] : []),
  ];

  return (
    <div className="dashboard-stack">
      <section className="dashboard-welcome">
        <div>
          <span>Farm dashboard</span>
          <h2>Good day, {user?.fullName?.split(" ")[0] || "team"}.</h2>
          <p>Here is a live view of the farm — animals, health, staff, documents and activity.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {isAdmin && (
            <Link className="button button-light" href="/animals/new">
              <Plus size={18} /> Add animal
            </Link>
          )}
          <Link className="button button-glass" href="/health">
            <Stethoscope size={18} /> Animal health
          </Link>
        </div>
      </section>

      <section className="stat-grid farm-stats">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article key={stat.label} className={stat.warning ? "warning" : ""}>
              <span>
                <Icon size={21} />
              </span>
              <div>
                <small>{stat.label}</small>
                <strong>{stat.value}</strong>
              </div>
            </article>
          );
        })}
      </section>

      <section className="dashboard-two-columns">
        <div className="dashboard-panel">
          <div className="section-row">
            <div>
              <h2>Recent health records</h2>
              <p>Problems, observations and treatments from the team.</p>
            </div>
            <Link className="text-link" href="/health">
              View all
            </Link>
          </div>
          {health.length ? (
            <div className="activity-feed" style={{ marginTop: 14 }}>
              {health.slice(0, 5).map((record) => (
                <article key={record.id}>
                  <span>
                    <Stethoscope size={16} />
                  </span>
                  <div>
                    <strong>{record.problem}</strong>
                    <p>{record.animalLabel || record.animalId}</p>
                    <small>
                      {formatDisplayDate(record.date)} · {record.createdByName || "Team member"}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p style={{ marginTop: 14, fontSize: ".75rem" }}>
              No health records yet. Open an animal to add the first one.
            </p>
          )}
        </div>

        <div className="dashboard-panel">
          <div className="section-row">
            <div>
              <h2>Recent activity</h2>
              <p>Daily work recorded around the farm.</p>
            </div>
            <Link className="text-link" href="/activity">
              View all
            </Link>
          </div>
          {activities.length ? (
            <div className="activity-feed" style={{ marginTop: 14 }}>
              {activities.slice(0, 5).map((record) => (
                <article key={record.id}>
                  <span>
                    <ActivityIcon size={16} />
                  </span>
                  <div>
                    <strong>{record.activity}</strong>
                    <p>{record.notes}</p>
                    <small>
                      {formatDisplayDate(record.date)} · {record.createdByName || "Team member"}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p style={{ marginTop: 14, fontSize: ".75rem" }}>
              No activity recorded yet. Log feeding, cleaning, inspections and more.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
