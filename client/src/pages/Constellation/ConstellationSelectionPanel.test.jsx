import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ConstellationSelectionPanel from './ConstellationSelectionPanel';
import { projectColor } from './constellationSceneModel';

afterEach(cleanup);

const projectP1 = { id: 'project:p1', type: 'project', entityId: 'p1', projectId: 'p1', label: 'Research', archived: false, record: { description: 'Deep reads and field notes.', totalEntries: 12, loggedMinutes: 540 } };
const projectP2 = { id: 'project:p2', type: 'project', entityId: 'p2', projectId: 'p2', label: 'Thesis', archived: true, record: {} };
const entryE1 = { id: 'entry:e1', type: 'entry', entityId: 'e1', projectId: 'p1', label: 'Read paper', archived: false, record: { durationMinutes: 45, occurredAt: '2026-03-02T09:30:00Z', values: [{ fieldId: 'f1', name: 'Topic', value: 'Graphs' }, { fieldId: 'f2', name: 'Removed field', value: 7, archived: true }], tags: ['paper', 'theory'] } };
const entryE2 = { id: 'entry:e2', type: 'entry', entityId: 'e2', projectId: 'p1', label: 'Draft', archived: false, record: {} };
const edges = [
  { id: 'r1', type: 'project-reference', source: 'project:p1', target: 'project:p2', directed: true },
  { id: 'r2', type: 'entry-link', source: 'entry:e1', target: 'entry:e2', directed: false },
  { id: 'm1', type: 'membership', source: 'project:p1', target: 'entry:e1', directed: false },
];
const graph = { nodes: [projectP1, projectP2, entryE1, entryE2], edges };

function renderPanel(overrides = {}) {
  const onSelect = vi.fn();
  const onFocus = vi.fn();
  const view = render(<MemoryRouter>
    <ConstellationSelectionPanel graph={graph} selectedId={null} onSelect={onSelect} onFocus={onFocus} loadingProjectId={null} projectErrors={{}} {...overrides} />
  </MemoryRouter>);
  return { view, onSelect, onFocus };
}

it('invites exploration when nothing is selected', () => {
  const { onSelect } = renderPanel();
  expect(screen.getByRole('heading', { name: /A new perspective/ })).toBeInTheDocument();
  expect(screen.getByText('Your original records stay exactly where they belong.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Focus project' })).not.toBeInTheDocument();
  expect(onSelect).not.toHaveBeenCalled();
});

it('describes a project with totals, focus control and a link into the app', async () => {
  const user = userEvent.setup();
  const { onFocus } = renderPanel({ selectedId: 'project:p1' });
  const kind = screen.getByText('PROJECT');
  expect(kind.style.getPropertyValue('--node-color')).toBe(projectColor('p1'));
  expect(screen.getByRole('heading', { name: 'Research' })).toBeInTheDocument();
  expect(screen.getByText('Deep reads and field notes.')).toBeInTheDocument();
  expect(screen.getByText('Recorded entries').nextSibling).toHaveTextContent('12');
  expect(screen.getByText('Minutes logged').nextSibling).toHaveTextContent('540');
  expect(screen.getByRole('link', { name: /Open project/ })).toHaveAttribute('href', '/projects/p1');
  await user.click(screen.getByRole('button', { name: 'Focus project' }));
  expect(onFocus).toHaveBeenCalledWith('project:p1');
});

it('marks archived projects and shows placeholders for missing totals', () => {
  renderPanel({ selectedId: 'project:p2' });
  expect(screen.getByText('PROJECT · ARCHIVED')).toBeInTheDocument();
  expect(screen.getByText('Recorded entries').nextSibling).toHaveTextContent('—');
  expect(screen.getByText('Minutes logged').nextSibling).toHaveTextContent('—');
});

it('surfaces project loading progress and errors inside the inspector', () => {
  const { view } = renderPanel({ selectedId: 'project:p1', loadingProjectId: 'p1', projectErrors: { p1: 'Unavailable' } });
  expect(screen.getByRole('status')).toHaveTextContent('Loading project entries…');
  expect(screen.getByRole('alert')).toHaveTextContent('Unavailable Use Focus project to retry.');
  view.rerender(<MemoryRouter>
    <ConstellationSelectionPanel graph={graph} selectedId="project:p1" onSelect={vi.fn()} onFocus={vi.fn()} loadingProjectId={null} projectErrors={{}} />
  </MemoryRouter>);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('shows the real entry details, field values, tags and entry link', () => {
  renderPanel({ selectedId: 'entry:e1' });
  expect(screen.getByText('LOGBOOK ENTRY')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Read paper' })).toBeInTheDocument();
  expect(screen.getByText('Research')).toBeInTheDocument();
  expect(screen.getByText('Minutes logged').nextSibling).toHaveTextContent('45');
  const expectedDate = new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date('2026-03-02T09:30:00Z'));
  expect(screen.getByText('Recorded').nextSibling).toHaveTextContent(expectedDate);
  expect(screen.getByText('Topic').nextSibling).toHaveTextContent('Graphs');
  expect(screen.getByText('Removed field (archived)').nextSibling).toHaveTextContent('7');
  expect(screen.getByText('paper · theory')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Open entry in project/ })).toHaveAttribute('href', '/projects/p1#entry-e1');
});

it('falls back to safe labels for sparse entry records', () => {
  renderPanel({ selectedId: 'entry:e2' });
  expect(screen.getByText('Minutes logged').nextSibling).toHaveTextContent('0');
  expect(screen.getByText('Recorded').nextSibling).toHaveTextContent('Not recorded');
  expect(screen.queryByText('Topic')).not.toBeInTheDocument();
});

it('lists explicit connections with direction and inspects their other endpoint', async () => {
  const user = userEvent.setup();
  const { onSelect } = renderPanel({ selectedId: 'project:p1' });
  expect(screen.getByRole('heading', { name: /Connections/ })).toHaveTextContent('1');
  expect(screen.getByText('Project reference · outgoing →')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Inspect Thesis' }));
  expect(onSelect).toHaveBeenCalledWith('project:p2');
});

it('reads incoming and undirected relations from the other side', () => {
  const { view } = renderPanel({ selectedId: 'project:p2' });
  expect(screen.getByText('Project reference · incoming ←')).toBeInTheDocument();
  view.rerender(<MemoryRouter>
    <ConstellationSelectionPanel graph={graph} selectedId="entry:e1" onSelect={vi.fn()} onFocus={vi.fn()} loadingProjectId={null} projectErrors={{}} />
  </MemoryRouter>);
  expect(screen.getByText('Linked entries · undirected ↔')).toBeInTheDocument();
  expect(screen.getByText('1', { selector: 'h3 span' })).toBeInTheDocument();
});

it('states when loaded records share no explicit connection', () => {
  renderPanel({ selectedId: 'entry:e2', graph: { nodes: graph.nodes, edges: [edges[2]] } });
  expect(screen.getByText('No explicit connections among loaded records.')).toBeInTheDocument();
});

it('explains the synthetic logbook hub without implying stored relationships', async () => {
  const user = userEvent.setup();
  const hub = { id: 'hub:logbook', type: 'hub', entityId: null, projectId: null, label: 'My Logbook', archived: false, record: null };
  const hubGraph = {
    nodes: [hub, ...graph.nodes],
    edges: [...edges,
      { id: 'g1', type: 'grouping', source: 'hub:logbook', target: 'project:p1', directed: false },
      { id: 'g2', type: 'grouping', source: 'hub:logbook', target: 'project:p2', directed: false }],
  };
  const { onSelect } = renderPanel({ selectedId: 'hub:logbook', graph: hubGraph });
  expect(screen.getByText('LOGBOOK HUB').style.getPropertyValue('--node-color')).toBe('#cdd9ff');
  expect(screen.getByRole('heading', { name: 'My Logbook' })).toBeInTheDocument();
  expect(screen.getByText(/is not a stored record/)).toBeInTheDocument();
  expect(screen.getByText('Projects grouped').nextSibling).toHaveTextContent('2');
  expect(screen.getByText('Loaded entries').nextSibling).toHaveTextContent('2');
  expect(screen.getByRole('heading', { name: /Connections/ })).toHaveTextContent('2');
  expect(screen.getAllByText('Logbook grouping (visual only) · undirected ↔')).toHaveLength(2);
  await user.click(screen.getByRole('button', { name: 'Inspect Research' }));
  expect(onSelect).toHaveBeenCalledWith('project:p1');
});
