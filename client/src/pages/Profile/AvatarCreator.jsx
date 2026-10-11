import { useState } from 'react';

import {
  AVATAR_OPTIONS,
  DEFAULT_AVATAR,
  avatarToPngDataUrl,
  buildAvatarSvg,
  normalizeAvatar,
  optionLabel,
  randomAvatar,
} from './avatarBuilder.js';

const TABS = [
  {
    id: 'hair',
    label: 'Hair',
    groups: [
      { key: 'hairStyle', label: 'Style', type: 'choice' },
      { key: 'hairColor', label: 'Colour', type: 'color' },
      { key: 'facialHair', label: 'Facial hair', type: 'choice' },
    ],
  },
  {
    id: 'face',
    label: 'Face',
    groups: [
      { key: 'skin', label: 'Skin tone', type: 'color' },
      { key: 'eyes', label: 'Eyes', type: 'choice' },
      { key: 'eyebrows', label: 'Eyebrows', type: 'choice' },
      { key: 'mouth', label: 'Mouth', type: 'choice' },
      { key: 'detail', label: 'Details', type: 'choice' },
    ],
  },
  {
    id: 'style',
    label: 'Style',
    groups: [
      { key: 'clothing', label: 'Clothing', type: 'choice' },
      { key: 'clothingColor', label: 'Clothing colour', type: 'color' },
      { key: 'accessory', label: 'Accessory', type: 'choice' },
      { key: 'background', label: 'Background', type: 'color' },
    ],
  },
];

export default function AvatarCreator({ disabled, onUse, onCancel }) {
  const [config, setConfig] = useState(DEFAULT_AVATAR);
  const [tab, setTab] = useState('hair');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const avatar = normalizeAvatar(config);
  const previewSrc = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildAvatarSvg(avatar))}`;
  const activeTab = TABS.find((candidate) => candidate.id === tab) || TABS[0];
  const locked = disabled || working;

  function update(key, value) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  async function handleUse() {
    setWorking(true);
    setError('');
    try {
      onUse(await avatarToPngDataUrl(avatar));
    } catch (err) {
      setError(err.message || 'Could not create the avatar image.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="avatar-creator" role="group" aria-label="Avatar creator">
      <div className="avatar-creator-preview">
        <img src={previewSrc} alt="Avatar preview" width="180" height="180" />
        <div className="avatar-creator-preview-actions">
          <button
            type="button"
            className="profile-btn profile-btn-secondary"
            onClick={() => setConfig(randomAvatar())}
            disabled={locked}
          >
            Randomise
          </button>
          <button
            type="button"
            className="profile-btn profile-btn-secondary"
            onClick={() => setConfig(DEFAULT_AVATAR)}
            disabled={locked}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="avatar-creator-controls">
        <div className="avatar-creator-tabs" role="tablist" aria-label="Avatar sections">
          {TABS.map((candidate) => (
            <button
              type="button"
              role="tab"
              key={candidate.id}
              id={`avatar-tab-${candidate.id}`}
              aria-selected={tab === candidate.id}
              aria-controls="avatar-tabpanel"
              className={`avatar-tab${tab === candidate.id ? ' is-active' : ''}`}
              onClick={() => setTab(candidate.id)}
            >
              {candidate.label}
            </button>
          ))}
        </div>

        <div
          className="avatar-creator-panel"
          role="tabpanel"
          id="avatar-tabpanel"
          aria-labelledby={`avatar-tab-${activeTab.id}`}
        >
          {activeTab.groups.map(({ key, label, type }) => (
            <fieldset className="avatar-creator-group" key={key}>
              <legend className="profile-detail-label">{label}</legend>
              <div className="avatar-creator-options">
                {AVATAR_OPTIONS[key].map((option) =>
                  type === 'color' ? (
                    <button
                      type="button"
                      key={option}
                      className={`avatar-swatch${avatar[key] === option ? ' is-selected' : ''}`}
                      style={{ background: option }}
                      aria-label={`${label} ${option}`}
                      aria-pressed={avatar[key] === option}
                      onClick={() => update(key, option)}
                      disabled={locked}
                    />
                  ) : (
                    <button
                      type="button"
                      key={option}
                      className={`avatar-chip${avatar[key] === option ? ' is-selected' : ''}`}
                      aria-pressed={avatar[key] === option}
                      onClick={() => update(key, option)}
                      disabled={locked}
                    >
                      {optionLabel(option)}
                    </button>
                  ),
                )}
              </div>
            </fieldset>
          ))}
        </div>
      </div>

      {error && (
        <div className="profile-alert profile-alert-error" role="alert">
          {error}
        </div>
      )}

      <div className="avatar-creator-actions">
        <button
          type="button"
          className="profile-btn profile-btn-secondary"
          onClick={onCancel}
          disabled={working}
        >
          Cancel
        </button>
        <button
          type="button"
          className="profile-btn profile-btn-primary"
          onClick={handleUse}
          disabled={locked}
        >
          {working ? 'Creating...' : 'Use this avatar'}
        </button>
      </div>
    </div>
  );
}
