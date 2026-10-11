import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./avatarBuilder.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    avatarToPngDataUrl: vi.fn().mockResolvedValue('data:image/png;base64,AAAA'),
  };
});

import AvatarCreator from './AvatarCreator.jsx';
import { avatarToPngDataUrl } from './avatarBuilder.js';

describe('AvatarCreator', () => {
  it('updates the preview and returns the chosen avatar as a PNG data URL', async () => {
    const user = userEvent.setup();
    const onUse = vi.fn();
    render(<AvatarCreator onUse={onUse} onCancel={() => {}} />);

    const before = screen.getByAltText('Avatar preview').getAttribute('src');
    await user.click(screen.getByRole('button', { name: 'Bun' }));
    expect(screen.getByAltText('Avatar preview').getAttribute('src')).not.toBe(before);
    expect(screen.getByRole('button', { name: 'Bun' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('tab', { name: 'Style' }));
    await user.click(screen.getByRole('button', { name: 'Hoodie' }));

    await user.click(screen.getByRole('button', { name: 'Use this avatar' }));

    expect(avatarToPngDataUrl).toHaveBeenCalledWith(
      expect.objectContaining({ hairStyle: 'bun', clothing: 'hoodie' }),
    );
    expect(onUse).toHaveBeenCalledWith('data:image/png;base64,AAAA');
  });

  it('switches between sections and resets to the default avatar', async () => {
    const user = userEvent.setup();
    render(<AvatarCreator onUse={() => {}} onCancel={() => {}} />);

    expect(screen.getByRole('tab', { name: 'Hair' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('button', { name: 'Hoodie' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Face' }));
    expect(screen.getByRole('button', { name: 'Freckles' })).toBeInTheDocument();

    const before = screen.getByAltText('Avatar preview').getAttribute('src');
    await user.click(screen.getByRole('button', { name: 'Freckles' }));
    expect(screen.getByAltText('Avatar preview').getAttribute('src')).not.toBe(before);

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByAltText('Avatar preview').getAttribute('src')).toBe(before);
  });

  it('shows an error when the image cannot be created', async () => {
    const user = userEvent.setup();
    avatarToPngDataUrl.mockRejectedValueOnce(new Error('Could not create the avatar image.'));
    const onUse = vi.fn();
    render(<AvatarCreator onUse={onUse} onCancel={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Use this avatar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not create the avatar image.');
    expect(onUse).not.toHaveBeenCalled();
  });
});
