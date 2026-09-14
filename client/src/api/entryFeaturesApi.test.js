import {
  deleteChecklistItem,
  updateChecklistItem,
  updateEntry,
  updateEntryProjectReferences,
  updateEntryReferences,
  updateProjectReferences,
} from './entryFeaturesApi';

describe('entryFeaturesApi', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('authToken', 'test-token');
    vi.restoreAllMocks();
  });

  it('updates a checklist item with a completion boolean', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 'item-1', completed: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await updateChecklistItem('project-1', 'entry-1', 'item-1', true);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5000/api/projects/project-1/entries/entry-1/checklist/item-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ completed: true }),
      }),
    );
  });

  it('updates checklist text with an object payload', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 'item-1', text: 'Updated task' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await updateChecklistItem('p', 'e', 'i', { text: 'Updated task' });

    expect(fetchMock.mock.calls[0][1].body).toBe(
      JSON.stringify({ text: 'Updated task' }),
    );
  });

  it('deletes a checklist item', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { success: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await deleteChecklistItem('p', 'e', 'i');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5000/api/projects/p/entries/e/checklist/i',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('updates project-to-project references', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await updateProjectReferences('p', ['p2', 'p3']);

    expect(fetchMock.mock.calls[0][1].body).toBe(
      JSON.stringify({ projectIds: ['p2', 'p3'] }),
    );
  });

  it('updates entry-to-project references using the entry project-reference endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await updateEntryProjectReferences('p', 'e', ['other-project']);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5000/api/projects/p/entries/e/project-references',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ projectIds: ['other-project'] }),
      }),
    );
  });

  it('updates entry-to-entry references', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await updateEntryReferences('p', 'e', ['e2']);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5000/api/projects/p/entries/e/references',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ entryIds: ['e2'] }),
      }),
    );
  });

  it('updates an entry through the entry endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 'e', name: 'Updated' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await updateEntry('p', 'e', { name: 'Updated', durationMinutes: 45 });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5000/api/projects/p/entries/e',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated', durationMinutes: 45 }),
      }),
    );
  });

  it('adds the authorization header to requests', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await updateEntryReferences('p', 'e', []);

    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({
      Authorization: 'Bearer test-token',
      'Content-Type': 'application/json',
    });
  });

  it('throws when authentication is missing', async () => {
    localStorage.removeItem('authToken');
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(updateEntry('p', 'e', {})).rejects.toThrow(
      'Authentication required. Please sign in again.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses the API error message when a request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(updateEntry('p', 'e', {})).rejects.toThrow('Not allowed');
  });
});
