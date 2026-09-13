import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../../components/Sidebar";
import {
  getUserProfile,
  updateUserProfile,
} from "../../api/userApi.js";
import { useUser } from "../../context/UserContext.jsx";
import ProfileAvatar from '../../components/ProfileAvatar.jsx';
import { createProfilePatch, readProfilePicture } from './profilePicture.js';

export default function Profile() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const {
    user,
    loading: userLoading,
    refreshUser,
  } = useUser();

  const [profile, setProfile] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    bio: "",
  });

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarDirty, setAvatarDirty] = useState(false);
  const [readingPicture, setReadingPicture] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const busy = saving || readingPicture;

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (userLoading) {
        return;
      }

      if (!user) {
        setLoadingProfile(false);
        return;
      }

      try {
        setLoadingProfile(true);
        setError('');

        const data = await getUserProfile();
        if (cancelled) {
          return;
        }

        setProfile(data);
        setAvatarUrl(data?.avatarUrl ?? null);
        setAvatarDirty(false);

        setFormData({
          name: data?.name || user?.name || '',
          bio: data?.bio || '',
        });
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Could not load profile.');
        }
      } finally {
        if (!cancelled) {
          setLoadingProfile(false);
        }
      }
    }

    loadProfile();
    return () => { cancelled = true; };
  }, [user, userLoading]);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handlePictureChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || busy || !profile) {
      return;
    }

    setReadingPicture(true);
    setError('');
    setMessage('');
    try {
      const picture = await readProfilePicture(file);
      setAvatarUrl(picture);
      setAvatarDirty(true);
    } catch (err) {
      setError(err.message || 'Could not read this image.');
    } finally {
      setReadingPicture(false);
    }
  }

  function handleRemovePicture() {
    setAvatarUrl(null);
    setAvatarDirty(true);
    setError('');
    setMessage('');
  }

  async function handleSave() {
    if (busy || !profile) {
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const updatedProfile = await updateUserProfile(
        createProfilePatch(formData, avatarUrl, avatarDirty),
      );

      setProfile(updatedProfile);
      setAvatarUrl(updatedProfile?.avatarUrl ?? null);
      setAvatarDirty(false);

      setFormData({
        name: updatedProfile?.name ?? formData.name,
        bio: updatedProfile?.bio ?? formData.bio,
      });

      // Refresh saved name and picture in every sidebar, never the local preview.
      await refreshUser();

      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(err.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  }

  if (userLoading || loadingProfile) {
    return (
      <div className="profile-shell">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
        />

        <main className="profile-main">
          <div className="profile-loading">Loading profile...</div>
        </main>

        <ProfileStyles />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-shell">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
        />

        <main className="profile-main">
          <header className="profile-header">
            <div>
              <p className="profile-eyebrow">Profile</p>
              <h1 className="profile-title">Your profile</h1>
            </div>
          </header>

          <div className="profile-content">
            <section className="profile-card">
              <p>You need to be signed in to view your profile.</p>
            </section>
          </div>
        </main>

        <ProfileStyles />
      </div>
    );
  }

  const displayEmail = profile?.email || user?.email || "No email available";

  const joinedDate =
    profile?.created_at ||
    profile?.createdAt ||
    user?.created_at ||
    user?.createdAt;

  return (
    <div className="profile-shell">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />

      <main className="profile-main">
        <header className="profile-header">
          <div>
            <p className="profile-eyebrow">Profile</p>

            <h1 className="profile-title">Your profile</h1>

            <p className="profile-subtitle">
              Manage the information associated with your Digital Logbook
              profile.
            </p>
          </div>
        </header>

        <div className="profile-content">
          {error && (
            <div className="profile-alert profile-alert-error" role="alert">
              {error}
            </div>
          )}

          {message && (
            <div className="profile-alert profile-alert-success" role="status">
              {message}
            </div>
          )}

          {/* Identity card */}
          <section className="profile-card profile-identity-card">
            <ProfileAvatar
              className="profile-avatar-large"
              src={avatarUrl}
              alt={avatarDirty ? 'Profile picture preview' : 'Profile picture'}
            />

            <div className="profile-identity-copy">
              <span className="profile-name-placeholder">
                {formData.name || "Your name"}
              </span>

              <span className="profile-email-placeholder">
                {displayEmail}
              </span>

              <span className="profile-note">
                Your email is supplied by your authenticated account.
              </span>
            </div>
          </section>

          <section className="profile-card" aria-busy={readingPicture}>
            <div className="profile-card-heading">
              <h2>Profile picture</h2>
              <p id="profile-picture-help">
                PNG, JPEG or WebP, up to 512 KiB. Picture changes are only saved when you select Save Changes.
              </p>
            </div>
            <div className="profile-form-field">
              <label className="profile-detail-label" htmlFor="profile-picture">
                {avatarUrl ? 'Replace profile picture' : 'Upload profile picture'}
              </label>
              <input
                id="profile-picture"
                className="profile-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-describedby="profile-picture-help"
                onChange={handlePictureChange}
                disabled={busy || !profile}
              />
              <div>
                <button
                  type="button"
                  className="profile-btn profile-btn-secondary"
                  onClick={handleRemovePicture}
                  disabled={busy || !profile || !avatarUrl}
                >
                  Remove profile picture
                </button>
              </div>
              <span className="profile-note" role="status">
                {readingPicture ? 'Reading image...' : avatarDirty ? 'Unsaved picture change.' : ''}
              </span>
            </div>
          </section>

          {/* Editable profile details */}
          <section className="profile-card">
            <div className="profile-card-heading">
              <h2>Profile information</h2>

              <p>
                Update the information displayed on your Digital Logbook
                profile.
              </p>
            </div>

            <div className="profile-form-field">
              <label
                className="profile-detail-label"
                htmlFor="profile-name"
              >
                Username / display name
              </label>

              <input
                id="profile-name"
                className="profile-input"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your name"
                maxLength={100}
                disabled={busy || !profile}
              />
            </div>
          </section>

          {/* Bio */}
          <section className="profile-card">
            <div className="profile-card-heading">
              <h2>Bio</h2>

              <p>
                A short introduction that can be displayed on your profile.
              </p>
            </div>

            <textarea
              className="profile-textarea"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell us a little about yourself…"
              aria-label="Bio"
              maxLength={500}
              disabled={busy || !profile}
            />

            <div className="profile-character-count">
              {formData.bio.length}/500
            </div>
          </section>

          {/* Read-only account information */}
          <section className="profile-card">
            <div className="profile-card-heading">
              <h2>Details</h2>

              <p>
                These details are supplied by your authenticated account.
              </p>
            </div>

            <div className="profile-details-grid">
              <Detail
                label="Email"
                value={displayEmail}
              />

              <Detail
                label="Date joined"
                value={formatDate(joinedDate)}
              />
            </div>
          </section>

          {/* Actions */}
          <div className="profile-actions">
            <button
              className="profile-btn profile-btn-secondary"
              onClick={() => navigate("/dashboard")}
              disabled={busy}
            >
              Cancel
            </button>

            <button
              className="profile-btn profile-btn-primary"
              onClick={handleSave}
              disabled={busy || !profile}
            >
              {saving ? 'Saving...' : readingPicture ? 'Reading image...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </main>

      <ProfileStyles />
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="profile-detail">
      <span className="profile-detail-label">
        {label}
      </span>

      <span className="profile-detail-value">
        {value}
      </span>
    </div>
  );
}

function formatDate(date) {
  if (!date) {
    return "—";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return parsedDate.toLocaleDateString();
}

function ProfileStyles() {
  return (
    <style>{`
      .profile-shell {
        display: flex;
        min-height: 100vh;
        background: #f8fafc;
      }

      .profile-main {
        flex: 1;
        min-width: 0;
        overflow-x: hidden;
      }

      .profile-header {
        padding: 32px 40px 0;
      }

      .profile-eyebrow {
        margin: 0 0 4px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: .08em;
        color: #94a3b8;
      }

      .profile-title {
        margin: 0;
        color: #1a2340;
        font-family: 'DM Serif Display', Georgia, serif;
        font-size: 30px;
        font-weight: 400;
      }

      .profile-subtitle {
        margin: 8px 0 0;
        max-width: 650px;
        color: #64748b;
        font-size: 14px;
        line-height: 1.6;
      }

      .profile-content {
        max-width: 900px;
        padding: 28px 40px 48px;
        display: flex;
        flex-direction: column;
        gap: 18px;
      }

      .profile-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 24px;
      }

      .profile-identity-card {
        display: flex;
        align-items: center;
        gap: 18px;
      }

      .profile-avatar-large {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        color: #4f63d2;
        background: #eef2ff;
      }

      .profile-avatar-large svg {
        width: 30px;
        height: 30px;
      }

      .profile-identity-copy {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }

      .profile-name-placeholder {
        color: #1a2340;
        font-size: 18px;
        font-weight: 600;
      }

      .profile-email-placeholder {
        color: #64748b;
        font-size: 13px;
      }

      .profile-note {
        margin-top: 4px;
        color: #94a3b8;
        font-size: 12px;
        line-height: 1.5;
      }

      .profile-card-heading {
        margin-bottom: 18px;
      }

      .profile-card-heading h2 {
        margin: 0;
        color: #1a2340;
        font-family: 'DM Serif Display', Georgia, serif;
        font-size: 20px;
        font-weight: 400;
      }

      .profile-card-heading p {
        margin: 5px 0 0;
        color: #64748b;
        font-size: 13px;
        line-height: 1.5;
      }

      .profile-form-field {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }

      .profile-input,
      .profile-textarea {
        width: 100%;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px 14px;
        font: 400 14px/1.5 Inter, system-ui, sans-serif;
        color: #1e293b;
        outline: none;
        background: #fff;
        box-sizing: border-box;
      }

      .profile-input:focus,
      .profile-textarea:focus {
        border-color: #4f63d2;
        box-shadow: 0 0 0 3px rgba(79, 99, 210, .1);
      }

      .profile-input::placeholder,
      .profile-textarea::placeholder {
        color: #94a3b8;
      }

      .profile-textarea {
        min-height: 130px;
        resize: vertical;
      }

      .profile-character-count {
        margin-top: 6px;
        text-align: right;
        color: #94a3b8;
        font-size: 11px;
      }

      .profile-details-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      .profile-detail {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }

      .profile-detail-label {
        font-size: 12px;
        font-weight: 600;
        color: #64748b;
      }

      .profile-detail-value {
        min-height: 42px;
        display: flex;
        align-items: center;
        padding: 0 13px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        color: #64748b;
        background: #f8fafc;
        font-size: 14px;
        overflow-wrap: anywhere;
      }

      .profile-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }

      .profile-btn {
        border: 0;
        border-radius: 8px;
        padding: 10px 18px;
        font: 500 14px Inter, system-ui, sans-serif;
        cursor: pointer;
      }

      .profile-btn-secondary {
        background: #fff;
        color: #475569;
        border: 1px solid #e2e8f0;
      }

      .profile-btn-primary {
        background: #4f63d2;
        color: #fff;
      }

      .profile-btn-primary:hover:not(:disabled) {
        background: #3d50bf;
      }

      .profile-btn:disabled {
        opacity: .6;
        cursor: not-allowed;
      }

      .profile-alert {
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 13px;
      }

      .profile-alert-error {
        color: #991b1b;
        background: #fef2f2;
        border: 1px solid #fecaca;
      }

      .profile-alert-success {
        color: #166534;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
      }

      .profile-loading {
        padding: 40px;
        color: #64748b;
        font-size: 14px;
      }

      @media (max-width: 900px) {
        .profile-header,
        .profile-content {
          padding-left: 24px;
          padding-right: 24px;
        }
      }

      @media (max-width: 600px) {
        .profile-header {
          padding-top: 24px;
        }

        .profile-title {
          font-size: 24px;
        }

        .profile-details-grid {
          grid-template-columns: 1fr;
        }

        .profile-identity-card {
          align-items: flex-start;
        }

        .profile-actions {
          justify-content: stretch;
        }

        .profile-actions .profile-btn {
          flex: 1;
        }
      }
    `}</style>
  );
}