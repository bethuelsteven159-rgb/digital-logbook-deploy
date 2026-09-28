import {
  createRecurringEntry,
  deleteRecurringEntry,
  fetchRecurringEntries,
  generateDueRecurringEntries,
  updateRecurringEntry,
} from './recurringEntriesApi';

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function requestAt(fetchMock, index = 0) {
  const [url, options] = fetchMock.mock.calls[index];
  return { url, options };
}

describe('recurringEntriesApi', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('authToken', 'test-token');
    vi.restoreAllMocks();
  });

  it('lists recurring entries for a project', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: [{ id: 'def-1' }] }));

    const result = await fetchRecurringEntries('project-1');
    const { url, options } = requestAt(fetchMock);

    expect(url).toMatch(/\/api\/projects\/project-1\/recurring-entries$/);
    expect(options.method).toBeUndefined();
    expect(result).toEqual([{ id: 'def-1' }]);
  });

  it('creates a recurring entry with a JSON payload', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: { id: 'def-1' } }, 201));

    const payload = {
      name: 'Morning journal',
      frequency: 'daily',
      startsOn: '2026-09-01',
    };

    const result = await createRecurringEntry('project-1', payload);
    const { url, options } = requestAt(fetchMock);

    expect(url).toMatch(/\/api\/projects\/project-1\/recurring-entries$/);
    expect(options).toMatchObject({
      method: 'POST',
      body: JSON.stringify(payload),
    });
    expect(result).toEqual({ id: 'def-1' });
  });

  it('updates a recurring entry through the definition endpoint', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: { id: 'def-1', enabled: false } }));

    const result = await updateRecurringEntry('def-1', { enabled: false });
    const { url, options } = requestAt(fetchMock);

    expect(url).toMatch(/\/api\/projects\/recurring-entries\/def-1$/);
    expect(options).toMatchObject({
      method: 'PATCH',
      body: JSON.stringify({ enabled: false }),
    });
    expect(result).toEqual({ id: 'def-1', enabled: false });
  });

  it('deletes a recurring entry', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: { id: 'def-1' } }));

    const result = await deleteRecurringEntry('def-1');
    const { url, options } = requestAt(fetchMock);

    expect(url).toMatch(/\/api\/projects\/recurring-entries\/def-1$/);
    expect(options).toMatchObject({ method: 'DELETE' });
    expect(result).toEqual({ id: 'def-1' });
  });

  it('generates due recurring entries for a project', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        jsonResponse({ data: { generatedCount: 2, generatedEntries: [] } }),
      );

    const result = await generateDueRecurringEntries('project-1');
    const { url, options } = requestAt(fetchMock);

    expect(url).toMatch(
      /\/api\/projects\/project-1\/recurring-entries\/generate-due$/,
    );
    expect(options).toMatchObject({ method: 'POST' });
    expect(result).toEqual({ generatedCount: 2, generatedEntries: [] });
  });

  it('adds the authorization header to requests', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: [] }));

    await fetchRecurringEntries('project-1');

    expect(requestAt(fetchMock).options.headers).toMatchObject({
      Authorization: 'Bearer test-token',
      'Content-Type': 'application/json',
    });
  });

  it('throws when authentication is missing', async () => {
    localStorage.removeItem('authToken');
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(fetchRecurringEntries('project-1')).rejects.toThrow(
      'Authentication required. Please sign in again.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires a project id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(fetchRecurringEntries('')).rejects.toThrow(
      'Project ID is required.',
    );
    await expect(createRecurringEntry('', {})).rejects.toThrow(
      'Project ID is required.',
    );
    await expect(generateDueRecurringEntries('')).rejects.toThrow(
      'Project ID is required.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires a definition id for update and delete', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(updateRecurringEntry('', { enabled: true })).rejects.toThrow(
      'Recurring entry ID is required.',
    );
    await expect(deleteRecurringEntry('')).rejects.toThrow(
      'Recurring entry ID is required.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses the API error message when a request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ error: { message: 'Archived projects cannot be edited' } }, 409),
    );

    await expect(createRecurringEntry('project-1', {})).rejects.toMatchObject({
      message: 'Archived projects cannot be edited',
      status: 409,
    });
  });

  it('falls back to the status code when the error body has no message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}, 500));

    await expect(fetchRecurringEntries('project-1')).rejects.toThrow(
      'Request failed with status 500',
    );
  });

  it('returns null when the response has no JSON body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    await expect(deleteRecurringEntry('def-1')).resolves.toBeNull();
  });
});
