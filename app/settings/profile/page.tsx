"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

import {
  getCurrentProfileAvatar,
  removeCustomProfileAvatar,
  updateProfile,
  uploadProfileAvatar,
  type UpdateProfileInput,
} from "@/lib/supabase/profile";

interface ProfileForm extends UpdateProfileInput {
  email: string;
}

export default function EditProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarLoading, setAvatarLoading] =
    useState(false);

  const [error, setError] = useState<string | null>(
    null
  );

  const [avatarUrl, setAvatarUrl] = useState<
    string | null
  >(null);

  const [providerAvatarUrl, setProviderAvatarUrl] =
    useState<string | null>(null);

  const [form, setForm] = useState<ProfileForm>({
    name: "",
    username: "",
    bio: "",
    website: "",
    location: "",
    locationPublic: false,
    skills: "",
    interests: "",
    role: "",
    status: "",
    email: "",
  });

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (userError || !user) {
        router.replace("/auth");
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select(`
            name,
            username,
            email,
            bio,
            website,
            location,
            location_public,
            skills,
            interests,
            role,
            status,
            avatar_url,
            provider_avatar_url
          `)
          .eq("id", user.id)
          .maybeSingle();

      if (!mounted) return;

      if (profileError) {
        console.error(
          "Error loading profile:",
          profileError
        );

        setError(
          "Unable to load your profile."
        );

        setLoading(false);
        return;
      }

      if (!profile) {
        setError(
          "Your profile could not be found."
        );

        setLoading(false);
        return;
      }

      setForm({
        name: profile.name ?? "",
        username: profile.username ?? "",
        bio: profile.bio ?? "",
        website: profile.website ?? "",
        location: profile.location ?? "",
        locationPublic:
          profile.location_public ?? false,
        skills: profile.skills ?? "",
        interests: profile.interests ?? "",
        role: profile.role ?? "",
        status: profile.status ?? "",
        email:
          profile.email ??
          user.email ??
          "",
      });

      setAvatarUrl(
        profile.avatar_url ??
          profile.provider_avatar_url ??
          null
      );

      setProviderAvatarUrl(
        profile.provider_avatar_url ?? null
      );

      setLoading(false);
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  const updateField = <
    K extends keyof ProfileForm
  >(
    field: K,
    value: ProfileForm[K]
  ): void => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError(null);
  };

  /*
   * ==========================================================
   * CHANGE AVATAR
   * ==========================================================
   */

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    setError(null);
    setAvatarLoading(true);

    const result =
      await uploadProfileAvatar(file);

    if (result.error) {
      setError(result.error);
      setAvatarLoading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    setAvatarUrl(result.avatarUrl);

    setAvatarLoading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /*
   * ==========================================================
   * REMOVE CUSTOM AVATAR
   * ==========================================================
   */

  const handleRemoveAvatar = async () => {
    if (avatarLoading) return;

    setError(null);
    setAvatarLoading(true);

    const result =
      await removeCustomProfileAvatar();

    if (result.error) {
      setError(result.error);
      setAvatarLoading(false);
      return;
    }

    setAvatarUrl(
      result.avatarUrl ??
        providerAvatarUrl
    );

    setAvatarLoading(false);
  };

  /*
   * ==========================================================
   * SAVE PROFILE
   * ==========================================================
   */

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setError(null);

    const input: UpdateProfileInput = {
      name: form.name,
      username: form.username,
      bio: form.bio,
      website: form.website,
      location: form.location,
      locationPublic:
        form.locationPublic,
      skills: form.skills,
      interests: form.interests,
      role: form.role,
      status: form.status,
    };

    const result =
      await updateProfile(input);

    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }

    const username = form.username
      .trim()
      .toLowerCase();

    router.replace(
      `/profile/${username}`
    );

    router.refresh();
  };

  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f5f7] px-5 py-12">
        <div className="mx-auto w-full max-w-[980px]">
          <div className="flex items-center justify-between">
            <div className="h-10 w-56 animate-pulse rounded-lg bg-black/10" />
            <div className="h-11 w-20 animate-pulse rounded-xl bg-black/10" />
          </div>

          <div className="mt-8 rounded-3xl bg-white p-8 sm:p-14">
            <div className="h-8 w-28 animate-pulse rounded bg-black/10" />

            <div className="mt-10 space-y-5">
              <div className="h-[72px] animate-pulse rounded-xl bg-black/5" />
              <div className="h-[72px] animate-pulse rounded-xl bg-black/5" />
              <div className="h-[72px] animate-pulse rounded-xl bg-black/5" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-5 pb-24 pt-12 text-[#1d1d1f]">
      <form
        onSubmit={handleSubmit}
        className="mx-auto w-full max-w-[980px]"
      >
        {/* Page header */}

        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[40px] font-semibold leading-none tracking-tight text-[#1d1d1f]">
            Edit Profile
          </h1>

          <div className="flex items-center gap-3">
            <Link
              href={`/profile/${form.username}`}
              className="text-[14px] font-medium text-[#1d1d1f]/70 transition-colors hover:text-[#1d1d1f]"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[#1d1d1f] px-6 text-[16px] font-medium text-white transition-colors hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* Card */}

        <div className="mt-9 rounded-3xl bg-white px-6 py-10 sm:px-10 md:px-14 md:py-14">
          <h2 className="text-[32px] font-semibold leading-none tracking-tight text-[#1d1d1f]">
            Profile
          </h2>

          {/* =================================================
              PROFILE IMAGE
              ================================================= */}

          <Row title="Profile Image" first>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[#e8e8ed]">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={form.name || "Profile"}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-medium text-[#6e6e73]">
                    {form.name
                      .trim()
                      .slice(0, 1)
                      .toUpperCase() ||
                      "U"}
                  </div>
                )}

                {avatarLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="text-[10px] font-medium text-white">
                      Updating...
                    </span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                disabled={avatarLoading}
                className="rounded-xl bg-[#ececef] px-5 py-3 text-[18px] font-normal text-[#1d1d1f] transition-colors hover:bg-[#e2e2e6] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Change Avatar
              </button>

              {avatarUrl &&
                avatarUrl !==
                  providerAvatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={avatarLoading}
                    className="rounded-xl px-3 py-3 text-[15px] text-[#0066cc] transition-colors hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Use account photo
                  </button>
                )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <p className="mt-3 text-[13px] text-[#6e6e73]">
              JPG, PNG or WebP. Maximum size 5 MB.
            </p>
          </Row>

          {/* =================================================
              PROFILE DETAILS
              ================================================= */}

          <Row title="Profile Details">
            <div className="space-y-5">
              <Field
                label="Name"
                value={form.name}
                onChange={(value) =>
                  updateField("name", value)
                }
                placeholder="Your name"
                maxLength={80}
              />

              <Field
                label="Username"
                value={form.username}
                onChange={(value) =>
                  updateField(
                    "username",
                    value
                  )
                }
                placeholder="username"
                maxLength={30}
                muted
              />

              <Field
                label="Email"
                value={form.email}
                onChange={() => {}}
                type="email"
                readOnly
                muted
              />

              <Field
                label="Website"
                value={form.website}
                onChange={(value) =>
                  updateField(
                    "website",
                    value
                  )
                }
                placeholder="https://example.com"
                maxLength={200}
                type="url"
              />

              <div>
                <Field
                  label="Location"
                  value={form.location}
                  onChange={(value) =>
                    updateField(
                      "location",
                      value
                    )
                  }
                  placeholder="e.g. Haryana, India"
                  maxLength={100}
                />

                <label className="mt-3 flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.locationPublic}
                    onChange={(event) =>
                      updateField(
                        "locationPublic",
                        event.target.checked
                      )
                    }
                    className="h-5 w-5 cursor-pointer rounded-[5px] accent-[#0066cc]"
                  />

                  <span className="text-[18px] text-[#1d1d1f]">
                    Show my location.
                  </span>
                </label>
              </div>
            </div>
          </Row>

          {/* =================================================
              ABOUT
              ================================================= */}

          <Row title="About">
            <TextareaField
              label="Bio"
              value={form.bio}
              onChange={(value) =>
                updateField("bio", value)
              }
              placeholder="Tell people who you are..."
              maxLength={500}
              rows={5}
            />
          </Row>

          {/* =================================================
              DEVELOPER PROFILE
              ================================================= */}

          <Row
            title="Developer Profile"
            description="Share what you work with and what interests you."
          >
            <div className="space-y-5">
              <Field
                label="Role"
                value={form.role}
                onChange={(value) =>
                  updateField("role", value)
                }
                placeholder="e.g. Student, Software Engineer"
                maxLength={100}
              />

              <Field
                label="Status"
                value={form.status}
                onChange={(value) =>
                  updateField(
                    "status",
                    value
                  )
                }
                placeholder="e.g. Learning, Building, Open to opportunities"
                maxLength={100}
              />

              <TextareaField
                label="Skills"
                value={form.skills}
                onChange={(value) =>
                  updateField(
                    "skills",
                    value
                  )
                }
                placeholder="e.g. TypeScript, React, C++, PostgreSQL"
                maxLength={500}
                rows={3}
              />

              <TextareaField
                label="Interests"
                value={form.interests}
                onChange={(value) =>
                  updateField(
                    "interests",
                    value
                  )
                }
                placeholder="e.g. Systems, Open Source, Distributed Systems"
                maxLength={500}
                rows={3}
              />
            </div>
          </Row>

          {/* =================================================
              ERROR
              ================================================= */}

          {error && (
            <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-[14px] leading-5 text-red-700">
                {error}
              </p>
            </div>
          )}
        </div>
      </form>
    </main>
  );
}

/*
 * ============================================================
 * ROW  (label column on the left, controls on the right)
 * ============================================================
 */

interface RowProps {
  title: string;
  description?: string;
  first?: boolean;
  children: React.ReactNode;
}

function Row({
  title,
  description,
  first = false,
  children,
}: RowProps) {
  return (
    <div
      className={
        "grid grid-cols-1 gap-4 py-8 md:grid-cols-[36fr_64fr] md:gap-6 " +
        (first
          ? "mt-4 border-t-0"
          : "border-t border-[#d2d2d7]")
      }
    >
      <div>
        <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
          {title}
        </h3>

        {description && (
          <p className="mt-3 max-w-[260px] text-[17px] leading-[1.4] text-[#1d1d1f]">
            {description}
          </p>
        )}
      </div>

      <div className="min-w-0">{children}</div>
    </div>
  );
}

/*
 * ============================================================
 * FIELD  (small label on top, value below, all in one box)
 * ============================================================
 */

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  type?: string;
  readOnly?: boolean;
  muted?: boolean;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  type = "text",
  readOnly = false,
  muted = false,
}: FieldProps) {
  return (
    <label
      className={
        "block rounded-xl border border-[#86868b] px-4 pb-2.5 pt-2.5 transition-colors focus-within:border-[#0066cc] focus-within:ring-1 focus-within:ring-[#0066cc] " +
        (muted
          ? "border-[#d2d2d7] bg-[#fafafa]"
          : "bg-white")
      }
    >
      <span className="block text-[15px] leading-tight text-[#6e6e73]">
        {label}
      </span>

      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        maxLength={maxLength}
        className={
          "mt-0.5 block w-full bg-transparent p-0 text-[22px] leading-tight outline-none placeholder:text-[#86868b] " +
          (muted
            ? "text-[#6e6e73]"
            : "text-[#1d1d1f]")
        }
      />
    </label>
  );
}

/*
 * ============================================================
 * TEXTAREA FIELD
 * ============================================================
 */

interface TextareaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  rows = 4,
}: TextareaFieldProps) {
  return (
    <label className="block rounded-xl border border-[#86868b] bg-white px-4 pb-2.5 pt-2.5 transition-colors focus-within:border-[#0066cc] focus-within:ring-1 focus-within:ring-[#0066cc]">
      <span className="flex items-center justify-between text-[15px] leading-tight text-[#6e6e73]">
        <span>{label}</span>

        {maxLength && (
          <span className="text-[12px]">
            {value.length}/{maxLength}
          </span>
        )}
      </span>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        className="mt-1 block w-full resize-none bg-transparent p-0 text-[20px] leading-[1.35] text-[#1d1d1f] outline-none placeholder:text-[#86868b]"
      />
    </label>
  );
}