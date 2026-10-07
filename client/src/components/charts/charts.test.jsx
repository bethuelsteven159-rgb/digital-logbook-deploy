// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  BarChart,
  DonutChart,
  LineChart,
  ScatterChart,
  formatMinutesShort,
  niceMax,
  truncateLabel,
} from './index';

const dailyData = [
  { label: 'Oct 1', value: 90 },
  { label: 'Oct 2', value: 0 },
  { label: 'Oct 3', value: 45 },
  { label: 'Oct 4', value: 120 },
];

afterEach(cleanup);

describe('chartTheme helpers', () => {
  it('rounds axis maxima up to nice numbers', () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(45)).toBe(50);
    expect(niceMax(120)).toBe(200);
    expect(niceMax(1500)).toBe(2000);
  });

  it('formats minutes compactly for axis ticks', () => {
    expect(formatMinutesShort(0)).toBe('0');
    expect(formatMinutesShort(45)).toBe('45m');
    expect(formatMinutesShort(60)).toBe('1h');
    expect(formatMinutesShort(90)).toBe('1h30');
    expect(formatMinutesShort(135)).toBe('2h 15m');
  });

  it('truncates long labels with an ellipsis', () => {
    expect(truncateLabel('Cyber Security', 10)).toBe('Cyber Sec…');
    expect(truncateLabel('Short', 10)).toBe('Short');
  });
});

describe('LineChart', () => {
  it('renders an accessible chart with the plotted points', () => {
    render(<LineChart data={dailyData} formatValue={formatMinutesShort} ariaLabel="Hours per day" />);

    expect(screen.getByRole('img', { name: 'Hours per day' })).toBeInTheDocument();

    // one dot per data point plus the axis labels we passed in
    expect(screen.getByText('Oct 1')).toBeInTheDocument();
    expect(screen.getByText('Oct 4')).toBeInTheDocument();
  });

  it('renders an empty chart without crashing', () => {
    render(<LineChart data={[]} ariaLabel="Empty line" />);

    expect(screen.getByRole('img', { name: 'Empty line' })).toBeInTheDocument();
  });
});

describe('BarChart', () => {
  it('renders a bar slot for every data point', () => {
    const { container } = render(
      <BarChart data={dailyData} formatValue={formatMinutesShort} ariaLabel="Weekday totals" />,
    );

    expect(screen.getByRole('img', { name: 'Weekday totals' })).toBeInTheDocument();

    // transparent hit areas, one per slot
    const hitAreas = container.querySelectorAll('rect[fill="transparent"]');
    expect(hitAreas).toHaveLength(dailyData.length);
  });

  it('draws visible bars only for non-zero values', () => {
    const { container } = render(<BarChart data={dailyData} />);

    // filled bars exclude the hit areas and the zero-value day
    const bars = container.querySelectorAll('rect[fill="#4f63d2cc"]');
    expect(bars).toHaveLength(3);
  });
});

describe('DonutChart', () => {
  it('renders legend entries with values and percentages', () => {
    render(
      <DonutChart
        data={[
          { label: 'Cyber Security', value: 500 },
          { label: 'Thesis', value: 100 },
        ]}
        formatValue={formatMinutesShort}
        ariaLabel="Hours by project"
      />,
    );

    expect(screen.getByRole('img', { name: 'Hours by project' })).toBeInTheDocument();
    expect(screen.getByText('Cyber Security')).toBeInTheDocument();
    expect(screen.getByText('Thesis')).toBeInTheDocument();
    expect(screen.getByText('8h20')).toBeInTheDocument();
    // 500 of 600 total minutes rounds to 83%
    expect(screen.getByText('83%')).toBeInTheDocument();
    expect(screen.getByText('1h40')).toBeInTheDocument();
  });

  it('drops zero-value slices so they never render as slivers', () => {
    render(
      <DonutChart
        data={[
          { label: 'Active', value: 60 },
          { label: 'Empty', value: 0 },
        ]}
      />,
    );

    expect(screen.queryByText('Empty')).not.toBeInTheDocument();
  });
});

describe('ScatterChart', () => {
  it('plots one dot per point and labels both axes', () => {
    const { container } = render(
      <ScatterChart
        points={[
          { x: 2, y: 30 },
          { x: 5, y: 60 },
        ]}
        xLabel="Planned"
        yLabel="Actual"
        ariaLabel="Compare fields"
      />,
    );

    expect(screen.getByRole('img', { name: 'Compare fields' })).toBeInTheDocument();
    expect(screen.getByText('Planned')).toBeInTheDocument();
    expect(screen.getByText('Actual')).toBeInTheDocument();

    const dots = container.querySelectorAll('circle[cx]');
    expect(dots.length).toBeGreaterThanOrEqual(2);
  });

  it('ignores malformed points', () => {
    const { container } = render(
      <ScatterChart
        points={[
          { x: 'nope', y: 10 },
          { x: 3, y: 'also nope' },
          { x: 1, y: 2 },
        ]}
      />,
    );

    const dots = container.querySelectorAll('circle[cx]');
    expect(dots).toHaveLength(1);
  });
});
