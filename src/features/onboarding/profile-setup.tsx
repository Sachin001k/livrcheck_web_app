"use client";
// Port of lib/screens/profile_setup_screen.dart: name, age (required), gender,
// height, weight. Shown once after sign-up, and again from "Edit profile"
// (EditProfileSheet), where it saves and closes.
import { useState, type FormEvent } from "react";
import { Button, Sheet, cx } from "@/components/ui";
import { useSession } from "@/components/session";
import { useT } from "@/lib/i18n";
import { isProfileComplete, saveProfile, type Profile } from "@/lib/data";
import { describeError, signOut } from "@/lib/auth";
import { PageFrame, Spinner } from "./page-frame";

const GENDERS = [
  ["male", "genderMale"],
  ["female", "genderFemale"],
  ["other", "genderOther"],
  ["prefer_not", "genderPreferNot"],
] as const;

const format = (v: number | null | undefined) =>
  v == null ? "" : String(v);

/** Full-page setup (first run) or edit page, depending on `initial`. */
export function ProfileSetupScreen({ initial, onSaved }: { initial?: Profile | null; onSaved: () => void }) {
  const { t } = useT();
  const editing = initial ? isProfileComplete(initial) : false;
  return (
    <PageFrame
      title={t(editing ? "editProfile" : "setupTitle")}
      maxWidth={520}
      action={!editing ? <Button variant="text" onClick={() => void signOut()}>{t("signOut")}</Button> : undefined}
    >
      <div className="py-4">
        <ProfileForm initial={initial} onSaved={onSaved} />
      </div>
    </PageFrame>
  );
}

/** "Edit profile" as a sheet over the current page. */
export function EditProfileSheet({ open, onClose, initial, onSaved }: {
  open: boolean; onClose: () => void; initial: Profile; onSaved: () => void;
}) {
  const { t } = useT();
  return (
    <Sheet open={open} onClose={onClose} title={t("editProfile")} maxWidth={520}>
      <ProfileForm initial={initial} onSaved={() => { onSaved(); onClose(); }} />
    </Sheet>
  );
}

export function ProfileForm({ initial, onSaved }: { initial?: Profile | null; onSaved: () => void }) {
  const { t, lang } = useT();
  const { session } = useSession();
  const editing = initial ? isProfileComplete(initial) : false;
  const metaName = session?.user.user_metadata?.full_name;
  const [name, setName] = useState(initial?.fullName ?? (typeof metaName === "string" ? metaName : ""));
  const [age, setAge] = useState(initial?.age != null ? String(initial.age) : "");
  const [height, setHeight] = useState(format(initial?.heightCm));
  const [weight, setWeight] = useState(format(initial?.weightKg));
  const [gender, setGender] = useState<string | null>(initial?.gender ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e?: FormEvent) => {
    e?.preventDefault();
    const n = name.trim();
    const a = /^\d+$/.test(age.trim()) ? parseInt(age.trim(), 10) : NaN;
    if (!n) return setError(t("nameRequiredError"));
    if (!Number.isFinite(a) || a < 1 || a > 120) return setError(t("ageRequiredError"));
    const h = parseFloat(height.trim());
    const w = parseFloat(weight.trim());
    setBusy(true);
    setError(null);
    try {
      await saveProfile({
        fullName: n, age: a, gender,
        heightCm: Number.isFinite(h) && h > 0 ? h : null,
        weightKg: Number.isFinite(w) && w > 0 ? w : null,
        language: lang,
      });
      onSaved();
    } catch (err) {
      setError(describeError(err, t("genericError"), lang));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} noValidate className="flex flex-col">
      {!editing && <p className="mb-6">{t("setupSubtitle")}</p>}
      <Field label={t("fullNameLabel")} value={name} onChange={setName} autoComplete="name" />
      <div className="h-4" />
      <Field
        label={t("ageLabel")} value={age} inputMode="numeric"
        onChange={(v) => setAge(v.replace(/\D/g, ""))}
      />
      <div className="mt-4 mb-2">{t("genderLabel")}</div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("genderLabel")}>
        {GENDERS.map(([value, key]) => {
          const on = gender === value;
          return (
            <button
              key={value} type="button" role="radio" aria-checked={on}
              onClick={() => setGender(value)}
              className={cx(
                "min-h-10 rounded-lg border px-4 text-sm font-medium transition",
                on ? "border-teal-dark bg-mint text-teal-dark" : "border-line bg-white hover:bg-mint/50",
              )}
            >
              {on && "✓ "}{t(key)}
            </button>
          );
        })}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Field label={t("heightLabel")} value={height} onChange={setHeight} inputMode="decimal" />
        <Field label={t("weightLabel")} value={weight} onChange={setWeight} inputMode="decimal" />
      </div>
      {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
      <button
        type="submit" disabled={busy}
        className="mt-6 flex min-h-12 items-center justify-center rounded-full bg-teal-dark py-3.5 font-semibold text-white transition hover:bg-[#184c45] disabled:opacity-60"
      >
        {busy ? <Spinner /> : t(editing ? "save" : "continueButton")}
      </button>
    </form>
  );
}

function Field({ label, value, onChange, inputMode, autoComplete }: {
  label: string; value: string; onChange: (v: string) => void;
  inputMode?: "numeric" | "decimal" | "text"; autoComplete?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      <input
        value={value} inputMode={inputMode} autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-12 w-full rounded-lg border border-black/30 bg-white px-3 text-base outline-none focus:border-2 focus:border-teal-dark"
      />
    </label>
  );
}
