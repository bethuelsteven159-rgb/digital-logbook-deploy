import { useState } from 'react';

export default function ProfileAvatar({ src, className, alt = 'Profile picture' }) {
  // Key the image state by source so a replacement retries even after a load failure.
  return <AvatarImage key={src || 'empty'} src={src} className={className} alt={alt} />;
}

function AvatarImage({ src, className, alt }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={className}>
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
        />
      ) : (
        <svg
          role="img"
          aria-label="No profile picture"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      )}
    </div>
  );
}
