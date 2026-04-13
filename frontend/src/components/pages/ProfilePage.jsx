import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Mail, Phone, Save, ShieldCheck, User } from "lucide-react";

import { AuthContext } from "../../Moduels/Context/AuthContext";
import { normalizeApiError } from "../../utils/normalizeApiError";
import { InputWithIcon } from "../ui/FieldWithIcon";
import { ToastStack, useToastStack } from "../ui/ToastStack";
import UserAvatar from "../user/UserAvatar";
import { loadProfileImage, saveProfileImage } from "../user/profileImageStore";

function getRole(me, fallbackRole) {
  return (me?.role || me?.user?.role || fallbackRole || "employee").toLowerCase();
}

function getOrgName(me) {
  return me?.organisation?.name || me?.user?.organisation?.name || "—";
}

function getEmail(me) {
  return me?.user?.email || me?.employee?.email || me?.email || "";
}

function getName(me) {
  if (!me) return "";
  if (me.user) return me.user.full_name || me.user.username || "";
  if (me.employee) {
    const parts = [me.employee.first_name, me.employee.last_name].filter(Boolean);
    return parts.join(" ") || "";
  }
  return me.full_name || "";
}

export default function ProfilePage() {
  const { user: me, role: authRole } = useContext(AuthContext);
  const { toasts, addToast, removeToast } = useToastStack();

  const role = useMemo(() => getRole(me, authRole), [me, authRole]);
  const orgName = useMemo(() => getOrgName(me), [me]);

  const [saving, setSaving] = useState(false);
  const [imageSrc, setImageSrc] = useState(() => loadProfileImage(me));
  const [imageDraft, setImageDraft] = useState(null);

  const fileRef = useRef(null);

  const [form, setForm] = useState(() => ({
    name: getName(me),
    email: getEmail(me),
    phone: "",
  }));

  useEffect(() => {
    setImageSrc(loadProfileImage(me));
    setForm({
      name: getName(me),
      email: getEmail(me),
      phone: "",
    });
  }, [me]);

  const avatarSrc = imageDraft || imageSrc;

  const onPickImage = async (file) => {
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) {
      addToast("Please choose an image file", "error");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      addToast("Image must be under 3MB", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setImageDraft(result);
    };
    reader.onerror = () => addToast("Failed to read image", "error");
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!form.name.trim()) {
      addToast("Name is required", "error");
      return;
    }

    try {
      setSaving(true);

      // API-ready structure:
      // - When backend supports profile updates, replace the timeout with an API call.
      await new Promise((r) => setTimeout(r, 450));

      if (imageDraft) {
        saveProfileImage(me, imageDraft);
        setImageSrc(imageDraft);
        setImageDraft(null);
      }

      addToast("Profile updated successfully", "success");
    } catch (err) {
      addToast(normalizeApiError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      <ToastStack toasts={toasts} onRemove={removeToast} />

      <header className="mb-6 sm:mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          My profile
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage your profile details and photo.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-900/5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="transition duration-200 ease-out">
                <UserAvatar name={form.name || "User"} src={avatarSrc} size={72} roundedClassName="rounded-2xl" />
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click?.()}
                className="absolute -bottom-2 -right-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-900/10 transition duration-200 hover:scale-[1.03] hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 active:scale-[0.98]"
                aria-label="Upload profile photo"
              >
                <Camera className="h-4 w-4" strokeWidth={2} aria-hidden />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickImage(e.target.files?.[0] || null)}
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{form.name || "—"}</p>
              <p className="mt-0.5 text-sm text-slate-600">{form.email || "—"}</p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200/80">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                <span className="capitalize">{role}</span>
              </div>
            </div>
          </div>

          {imageDraft ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="text-xs font-medium text-slate-600">Preview ready</span>
              <button
                type="button"
                className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition duration-200 hover:bg-slate-50"
                onClick={() => setImageDraft(null)}
                disabled={saving}
              >
                Discard
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
            <InputWithIcon
              icon={User}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Full name"
              autoComplete="name"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
            <InputWithIcon
              icon={Mail}
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="Email"
              autoComplete="email"
              readOnly
              inputClassName="bg-slate-50"
            />
            <p className="mt-1 text-xs text-slate-500">Email is managed by your organisation admin.</p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Phone</label>
            <InputWithIcon
              icon={Phone}
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="Phone number"
              autoComplete="tel"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Organisation</label>
            <InputWithIcon
              icon={ShieldCheck}
              value={orgName}
              readOnly
              inputClassName="bg-slate-50"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-900/10 transition duration-200 hover:scale-[1.02] hover:bg-indigo-700 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 active:scale-[0.98] disabled:opacity-50"
          >
            <Save className="h-4 w-4" aria-hidden />
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </section>
    </div>
  );
}

