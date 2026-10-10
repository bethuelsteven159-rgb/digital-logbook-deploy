import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { useState } from 'react';
import ConstellationFallback from './ConstellationFallback';
import { buildConstellationGraph } from './constellationGraph';

afterEach(cleanup);
const projects = [{ id: 'p1', name: 'Research' }];
const detailsByProject = { p1: { project: projects[0], entries: [{ id: 'e1', projectId: 'p1', name: 'Read paper', durationMinutes: 45, values: [{ fieldId: 'f', name: 'Topic', value: 'Graphs' }] }] } };
function Destination() { const location = useLocation(); return <p>Destination: {location.pathname}{location.hash}</p>; }
function renderFallback(overrides = {}) {
  const load = vi.fn();
  function Harness() {
    const [selectedEntryId, onSelectEntry] = useState(null);
    return <ConstellationFallback graph={buildConstellationGraph({ projects, detailsByProject })} detailsByProject={detailsByProject} projectErrors={{}} onLoadProject={load} selectedEntryId={selectedEntryId} onSelectEntry={onSelectEntry} {...overrides} />;
  }
  render(<MemoryRouter initialEntries={['/constellation']}><Routes><Route path="/constellation" element={<Harness />} /><Route path="/projects/:id" element={<Destination />} /></Routes></MemoryRouter>);
  return load;
}

it('selects real entries by keyboard and links to the existing entry card', async () => {
  const user = userEvent.setup(); renderFallback();
  const entry = screen.getByRole('button', { name: 'Read paper' });
  entry.focus(); await user.keyboard('{Enter}');
  expect(entry).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Graphs')).toBeInTheDocument();
  expect(screen.getByText('45')).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'Open entry in project' }));
  expect(screen.getByText('Destination: /projects/p1#entry-e1')).toBeInTheDocument();
});

it('navigates to a real project and supports progressive load/retry', async () => {
  const user = userEvent.setup();
  const load = renderFallback({ detailsByProject: {}, projectErrors: { p1: 'Unavailable' } });
  expect(screen.getByRole('alert')).toHaveTextContent('Unavailable');
  await user.click(screen.getByRole('button', { name: 'Load entries for Research' }));
  expect(load).toHaveBeenCalledWith('p1');
  await user.click(screen.getByRole('link', { name: 'Research' }));
  expect(screen.getByText('Destination: /projects/p1')).toBeInTheDocument();
});

it('explains empty data and does not retain a hidden selected record', () => {
  renderFallback({ graph: buildConstellationGraph(), selectedEntryId: 'entry:e1' });
  expect(screen.getByText(/No projects to show/)).toBeInTheDocument();
  expect(screen.queryByText('Graphs')).not.toBeInTheDocument();
});

it('can focus a project cluster while its inline selection stays hidden', async () => {
  const user = userEvent.setup();
  const onFocusProject = vi.fn();
  renderFallback({ onFocusProject, showSelection: false });
  await user.click(screen.getByRole('button', { name: 'Focus Research' }));
  expect(onFocusProject).toHaveBeenCalledWith('project:p1');
  expect(screen.queryByRole('region', { name: 'Selected entry' })).not.toBeInTheDocument();
});
