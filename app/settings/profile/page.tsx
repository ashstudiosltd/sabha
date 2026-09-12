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
  ) => {
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
      <main className="min-h-screen bg-[#FAFAF7] px-4 py-8">
        <div className="mx-auto w-full max-w-2xl">
          <div className="h-5 w-32 animate-pulse rounded bg-[#E6E3DA]" />

          <div className="mt-8 rounded-3xl border border-[#E6E3DA] bg-white p-6">
            <div className="h-7 w-48 animate-pulse rounded bg-[#E6E3DA]" />

            <div className="mt-8 flex justify-center">
              <div className="h-24 w-24 animate-pulse rounded-full bg-[#E6E3DA]" />
            </div>

            <div className="mt-8 space-y-6">
              <div className="h-11 animate-pulse rounded-xl bg-[#E6E3DA]" />
              <div className="h-11 animate-pulse rounded-xl bg-[#E6E3DA]" />
              <div className="h-28 animate-pulse rounded-xl bg-[#E6E3DA]" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAF7] px-4 py-8 pb-24">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}

        <div className="flex items-center justify-between">
          <Link
            href={`/profile/${form.username}`}
            className="text-[13px] font-medium text-[#5B5748] transition-colors hover:text-[#1B1B18]"
          >
            ← Back to profile
          </Link>

          <span className="text-[11px] uppercase tracking-[0.16em] text-[#A09B8D]">
            Settings
          </span>
        </div>

        {/* Main card */}

        <div className="mt-6 rounded-3xl border border-[#E6E3DA] bg-white p-5 shadow-sm sm:p-7">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8A8577]">
              Profile
            </p>

            <h1 className="mt-2 text-2xl font-medium tracking-tight text-[#1B1B18]">
              Edit your profile
            </h1>

            <p className="mt-2 max-w-lg text-[13px] leading-5 text-[#777264]">
              Keep your public identity up to date.
              Changes here will appear across Sabha.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-8"
          >
            {/* =================================================
                PROFILE PHOTO
                ================================================= */}

            <section>
              <div className="mb-4">
                <h2 className="text-[14px] font-medium text-[#1B1B18]">
                  Profile photo
                </h2>

                <p className="mt-1 text-[12px] text-[#8A8577]">
                  Your Google or GitHub photo is used
                  by default. You can replace it with
                  your own photo.
                </p>
              </div>

              <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#E6E3DA] bg-[#FAFAF7] p-5 sm:flex-row">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-[#E6E3DA] bg-[#E6E3DA]">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={form.name || "Profile"}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#2F4B3C] text-2xl font-medium text-[#FAFAF7]">
                      {form.name
                        .trim()
                        .slice(0, 1)
                        .toUpperCase() ||
                        "U"}
                    </div>
                  )}

                  {avatarLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <span className="text-[11px] font-medium text-white">
                        Updating...
                      </span>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <p className="text-[13px] font-medium text-[#1B1B18]">
                    {avatarUrl ===
                    providerAvatarUrl
                      ? "Account photo"
                      : "Custom profile photo"}
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-[#8A8577]">
                    JPG, PNG or WebP. Maximum size
                    5 MB.
                  </p>

                  <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                    <button
                      type="button"
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      disabled={avatarLoading}
                      className="rounded-full bg-[#1B1B18] px-4 py-2 text-[11.5px] font-medium text-[#FAFAF7] transition-all hover:bg-[#2F4B3C] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Change photo
                    </button>

                    {avatarUrl &&
                      avatarUrl !==
                        providerAvatarUrl && (
                        <button
                          type="button"
                          onClick={
                            handleRemoveAvatar
                          }
                          disabled={
                            avatarLoading
                          }
                          className="rounded-full border border-[#E6E3DA] px-4 py-2 text-[11.5px] font-medium text-[#5B5748] transition-all hover:border-[#7A2E2E] hover:text-[#7A2E2E] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Use account photo
                        </button>
                      )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={
                      handleAvatarChange
                    }
                    className="hidden"
                  />
                </div>
              </div>
            </section>

            {/* =================================================
                IDENTITY
                ================================================= */}

            <section>
              <div className="mb-4">
                <h2 className="text-[14px] font-medium text-[#1B1B18]">
                  Identity
                </h2>

                <p className="mt-1 text-[12px] text-[#8A8577]">
                  How people will recognize you.
                </p>
              </div>

              <div className="space-y-5">
                <Field
                  label="Name"
                  value={form.name}
                  onChange={(value) =>
                    updateField(
                      "name",
                      value
                    )
                  }
                  placeholder="Your name"
                  maxLength={80}
                />

                <div>
                  <label
                    htmlFor="username"
                    className="mb-2 block text-[12px] font-medium text-[#4F4B40]"
                  >
                    Username
                  </label>

                  <div className="flex overflow-hidden rounded-xl border border-[#E6E3DA] bg-[#FAFAF7] transition-colors focus-within:border-[#2F4B3C]">
                    <span className="flex items-center pl-3 text-[13px] text-[#A09B8D]">
                      @
                    </span>

                    <input
                      id="username"
                      type="text"
                      value={form.username}
                      onChange={(event) =>
                        updateField(
                          "username",
                          event.target.value
                        )
                      }
                      placeholder="username"
                      maxLength={30}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className="w-full bg-transparent px-2 py-3 text-[13px] text-[#1B1B18] outline-none placeholder:text-[#B0AB9D]"
                    />
                  </div>

                  <p className="mt-1.5 text-[11px] text-[#969082]">
                    Your username is also your public
                    profile URL.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-[12px] font-medium text-[#4F4B40]"
                  >
                    Account email
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    readOnly
                    className="w-full rounded-xl border border-[#E6E3DA] bg-[#F2F1EA] px-3 py-3 text-[13px] text-[#777264] outline-none"
                  />

                  <p className="mt-1.5 text-[11px] text-[#969082]">
                    Your account email is managed by
                    your authentication provider.
                  </p>
                </div>
              </div>
            </section>

            {/* =================================================
                ABOUT
                ================================================= */}

            <section>
              <div className="mb-4">
                <h2 className="text-[14px] font-medium text-[#1B1B18]">
                  About you
                </h2>

                <p className="mt-1 text-[12px] text-[#8A8577]">
                  Tell the community a little about
                  yourself.
                </p>
              </div>

              <div className="space-y-5">
                <TextareaField
                  label="Bio"
                  value={form.bio}
                  onChange={(value) =>
                    updateField(
                      "bio",
                      value
                    )
                  }
                  placeholder="Tell people who you are..."
                  maxLength={500}
                  rows={5}
                />

                <Field
                  label="Role"
                  value={form.role}
                  onChange={(value) =>
                    updateField(
                      "role",
                      value
                    )
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
              </div>
            </section>

            {/* =================================================
                DEVELOPER PROFILE
                ================================================= */}

            <section>
              <div className="mb-4">
                <h2 className="text-[14px] font-medium text-[#1B1B18]">
                  Developer profile
                </h2>

                <p className="mt-1 text-[12px] text-[#8A8577]">
                  Share what you work with and what
                  interests you.
                </p>
              </div>

              <div className="space-y-5">
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
                  rows={4}
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
                  rows={4}
                />
              </div>
            </section>

            {/* =================================================
                LINKS & LOCATION
                ================================================= */}

            <section>
              <div className="mb-4">
                <h2 className="text-[14px] font-medium text-[#1B1B18]">
                  Links & location
                </h2>

                <p className="mt-1 text-[12px] text-[#8A8577]">
                  Optional information for your public
                  profile.
                </p>
              </div>

              <div className="space-y-5">
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
                  <label
                    htmlFor="location"
                    className="mb-2 block text-[12px] font-medium text-[#4F4B40]"
                  >
                    Location
                  </label>

                  <input
                    id="location"
                    type="text"
                    value={form.location}
                    onChange={(event) =>
                      updateField(
                        "location",
                        event.target.value
                      )
                    }
                    placeholder="e.g. Haryana, India"
                    maxLength={100}
                    className="w-full rounded-xl border border-[#E6E3DA] bg-[#FAFAF7] px-3 py-3 text-[13px] text-[#1B1B18] outline-none transition-colors placeholder:text-[#B0AB9D] focus:border-[#2F4B3C]"
                  />

                  <label className="mt-3 flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={
                        form.locationPublic
                      }
                      onChange={(event) =>
                        updateField(
                          "locationPublic",
                          event.target.checked
                        )
                      }
                      className="h-4 w-4 accent-[#2F4B3C]"
                    />

                    <span className="text-[12px] text-[#5B5748]">
                      Show my location publicly
                    </span>
                  </label>
                </div>
              </div>
            </section>

            {/* =================================================
                ERROR
                ================================================= */}

            {error && (
              <div className="rounded-xl border border-[#E7CACA] bg-[#FFF7F7] px-4 py-3">
                <p className="text-[12px] leading-5 text-[#7A2E2E]">
                  {error}
                </p>
              </div>
            )}

            {/* =================================================
                ACTIONS
                ================================================= */}

            <div className="flex flex-col-reverse gap-3 border-t border-[#E6E3DA] pt-6 sm:flex-row sm:justify-end">
              <Link
                href={`/profile/${form.username}`}
                className="inline-flex items-center justify-center rounded-full border border-[#E6E3DA] px-5 py-2.5 text-[12.5px] font-medium text-[#5B5748] transition-all duration-150 hover:border-[#1B1B18] hover:text-[#1B1B18] active:scale-95"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-full bg-[#1B1B18] px-6 py-2.5 text-[12.5px] font-medium text-[#FAFAF7] transition-all duration-150 hover:bg-[#2F4B3C] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

/*
 * ============================================================
 * FIELD
 * ============================================================
 */

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  type?: string;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  type = "text",
}: FieldProps) {
  return (
    <div>
      <label className="mb-2 block text-[12px] font-medium text-[#4F4B40]">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full rounded-xl border border-[#E6E3DA] bg-[#FAFAF7] px-3 py-3 text-[13px] text-[#1B1B18] outline-none transition-colors placeholder:text-[#B0AB9D] focus:border-[#2F4B3C]"
      />
    </div>
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
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-[12px] font-medium text-[#4F4B40]">
          {label}
        </label>

        {maxLength && (
          <span className="text-[10px] text-[#A09B8D]">
            {value.length}/{maxLength}
          </span>
        )}
      </div>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        className="w-full resize-none rounded-xl border border-[#E6E3DA] bg-[#FAFAF7] px-3 py-3 text-[13px] leading-5 text-[#1B1B18] outline-none transition-colors placeholder:text-[#B0AB9D] focus:border-[#2F4B3C]"
      />
    </div>
  );
}