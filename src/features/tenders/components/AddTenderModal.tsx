"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import SimpleModal from "@/shared/ui/SimpleModal";
import LocationInput from "@/features/scraping/components/LocationInput";
import { useTheme } from "@/shared/contexts/ThemeContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
}

interface FormState {
  title: string;
  organization: string;
  source_url: string;
  closing_date: string;
  location: string;
  category: string;
  description: string;
}

const EMPTY: FormState = {
  title: "",
  organization: "",
  source_url: "",
  closing_date: "",
  location: "",
  category: "",
  description: "",
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-text-lo">
        {label}
        {required && <span className="ml-0.5 text-status-danger">*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT_CLS =
  "w-full rounded-xl border border-app-border bg-surface px-3 py-2 text-sm text-text-hi placeholder:text-text-lo focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30 transition-colors";

export default function AddTenderModal({ isOpen, onClose, onAdded }: Props) {
  const { resolvedMode: mode } = useTheme();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [countries, setCountries] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && countries.length === 0) {
      fetch("/api/countries").then((r) => r.json()).then((d) => {
        if (Array.isArray(d)) setCountries(d.map((c: any) => c.country_name).sort());
      }).catch(() => {});
    }
  }, [isOpen, countries.length]);

  const isDirty = Object.values(form).some(Boolean);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleClose = () => {
    setForm(EMPTY);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/tenders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to add tender.");
        return;
      }
      toast.success("Tender added.");
      setForm(EMPTY);
      onAdded();
      onClose();
    } catch {
      toast.error("Network error — could not add tender.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Tender"
      subtitle="Manually add a tender that wasn't picked up by the scraper"
      hasUnsavedChanges={isDirty}
      width="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Title" required>
          <input
            type="text"
            className={INPUT_CLS}
            placeholder="e.g. Provision of ICT Equipment"
            value={form.title}
            onChange={set("title")}
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Organisation">
            <input
              type="text"
              className={INPUT_CLS}
              placeholder="e.g. UNICEF Kenya"
              value={form.organization}
              onChange={set("organization")}
            />
          </Field>
          <Field label="Category">
            <input
              type="text"
              className={INPUT_CLS}
              placeholder="e.g. ICT, Consultancy"
              value={form.category}
              onChange={set("category")}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Location">
            <LocationInput
              value={form.location}
              onChange={(v) => setForm((prev) => ({ ...prev, location: v }))}
              countries={countries}
              placeholder="e.g. Nairobi, Kenya"
              mode={mode}
            />
          </Field>
          <Field label="Closing date">
            <input
              type="date"
              className={INPUT_CLS}
              value={form.closing_date}
              onChange={set("closing_date")}
            />
          </Field>
        </div>

        <Field label="Source URL">
          <input
            type="url"
            className={INPUT_CLS}
            placeholder="https://…"
            value={form.source_url}
            onChange={set("source_url")}
          />
        </Field>

        <Field label="Description">
          <textarea
            rows={3}
            className={INPUT_CLS + " resize-none"}
            placeholder="Brief description of the tender scope…"
            value={form.description}
            onChange={set("description")}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-app-border px-4 py-2 text-sm text-text-lo transition-colors hover:border-brand-500/30 hover:text-text-hi"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !form.title.trim()}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-brand-500/90 disabled:opacity-50"
          >
            {saving ? (
              <Icon icon="solar:refresh-broken" width={14} className="animate-spin" />
            ) : (
              <Icon icon="solar:add-circle-broken" width={14} />
            )}
            {saving ? "Adding…" : "Add tender"}
          </button>
        </div>
      </form>
    </SimpleModal>
  );
}
