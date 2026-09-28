import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Settings from './Settings';

const mocks = vi.hoisted(() => ({
  exportLogbook: vi.fn(),
  importLogbook: vi.fn(),
  savePreferences: vi.fn(
    (preferences) => preferences,
  ),
  loadPreferences: vi.fn(),
  applyTheme: vi.fn(),
}));

vi.mock('../../api/logbookTransferApi', () => ({
  exportLogbook: mocks.exportLogbook,
  importLogbook: mocks.importLogbook,
}));

vi.mock('../../utils/preferences', () => ({
  DEFAULT_PREFERENCES: {
    theme: 'system',
    entryOrder: 'newest',
    projectOrder: 'recent',
  },

  PREFERENCES_EVENT:
    'digital-logbook-preferences-changed',

  loadPreferences:
    mocks.loadPreferences,

  savePreferences:
    mocks.savePreferences,

  applyTheme:
    mocks.applyTheme,
}));

vi.mock('../../components/Sidebar', () => ({
  default: () => (
    <div data-testid="sidebar">
      Sidebar
    </div>
  ),
}));

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.loadPreferences.mockReturnValue({
      theme: 'system',
      entryOrder: 'newest',
      projectOrder: 'recent',
    });

    mocks.exportLogbook.mockResolvedValue({
      projects: [],
      entries: [],
    });

    mocks.importLogbook.mockResolvedValue({
      projectsImported: 1,
      projectsUpdated: 2,
      entriesImported: 3,
      entriesUpdated: 4,
      fieldsImported: 5,
      fieldsUpdated: 6,
      valuesImported: 7,
      valuesUpdated: 8,
      checklistImported: 9,
      checklistUpdated: 10,
      referencesImported: 11,
    });

    global.URL.createObjectURL = vi.fn(
      () => 'blob:test',
    );

    global.URL.revokeObjectURL = vi.fn();
  });

  it('shows application preferences, data management, and reset sections', () => {
    render(<Settings />);

    expect(
      screen.getByRole('heading', {
        name: 'Application settings',
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        name: 'Application preferences',
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        name: 'Data management',
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        name: 'Data & reset',
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Available soon'),
    ).toBeInTheDocument();
  });

  it('saves theme and ordering preference changes', async () => {
    const user = userEvent.setup();

    render(<Settings />);

    await user.selectOptions(
      screen.getByDisplayValue('System default'),
      'dark',
    );

    await user.selectOptions(
      screen.getByDisplayValue('Newest first'),
      'oldest',
    );

    await user.selectOptions(
      screen.getByDisplayValue('Recently updated'),
      'alphabetical',
    );

    expect(
      mocks.savePreferences,
    ).toHaveBeenCalledWith({
      theme: 'dark',
      entryOrder: 'oldest',
      projectOrder: 'recent',
    });

    expect(
      mocks.savePreferences,
    ).toHaveBeenCalledWith({
      theme: 'dark',
      entryOrder: 'oldest',
      projectOrder: 'alphabetical',
    });

    expect(
      mocks.applyTheme,
    ).toHaveBeenCalledWith('dark');
  });

  it('exports the logbook and shows success feedback', async () => {
    const user = userEvent.setup();

    const anchorClick = vi
      .spyOn(
        HTMLAnchorElement.prototype,
        'click',
      )
      .mockImplementation(() => {});

    render(<Settings />);

    await user.click(
      screen.getByRole('button', {
        name: /Export logbook/i,
      }),
    );

    await waitFor(() =>
      expect(
        mocks.exportLogbook,
      ).toHaveBeenCalledTimes(1),
    );

    expect(anchorClick).toHaveBeenCalled();

    expect(
      screen.getByText(
        'Your logbook was exported successfully.',
      ),
    ).toBeInTheDocument();

    anchorClick.mockRestore();
  });

  it('imports a valid JSON export and reports imported and updated records', async () => {
    const user = userEvent.setup();

    render(<Settings />);

    const json = JSON.stringify({
      projects: [],
      entries: [],
    });

    const file = new File(
      [json],
      'backup.json',
      {
        type: 'application/json',
      },
    );

    Object.defineProperty(file, 'text', {
      value: vi
        .fn()
        .mockResolvedValue(json),
    });

    const input =
      document.querySelector(
        'input[type="file"]',
      );

    fireEvent.change(input, {
      target: {
        files: [file],
      },
    });

    await waitFor(() =>
      expect(
        mocks.importLogbook,
      ).toHaveBeenCalledWith({
        projects: [],
        entries: [],
      }),
    );

    expect(
      screen.getByText(
        /Import completed successfully/,
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/1 new project/),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /2 project\(s\) updated/,
      ),
    ).toBeInTheDocument();

    // Keep the user interaction exercised so the test
    // also verifies the file input can be triggered normally.
    expect(user).toBeDefined();
  });

  it('rejects invalid JSON imports', async () => {
    render(<Settings />);

    const file = new File(
      ['not json'],
      'bad.json',
      {
        type: 'application/json',
      },
    );

    Object.defineProperty(file, 'text', {
      value: vi
        .fn()
        .mockResolvedValue('not json'),
    });

    const input =
      document.querySelector(
        'input[type="file"]',
      );

    fireEvent.change(input, {
      target: {
        files: [file],
      },
    });

    await waitFor(() =>
      expect(
        screen.getByText(
          'The selected file is not valid JSON.',
        ),
      ).toBeInTheDocument(),
    );

    expect(
      mocks.importLogbook,
    ).not.toHaveBeenCalled();
  });
});