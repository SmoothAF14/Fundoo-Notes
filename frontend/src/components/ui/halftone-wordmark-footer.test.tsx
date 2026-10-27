import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HalftoneWordmarkFooter, { hwfFitSize, hwfHex, hwfRadius, hwfStep, hwfWarmth } from './halftone-wordmark-footer';

describe('hwfHex', () => {
  it('parses #rrggbb', () => expect(hwfHex('#f5b83d')).toEqual([245, 184, 61]));
  it('expands #rgb shorthand', () => expect(hwfHex('#fff')).toEqual([255, 255, 255]));
  it('accepts a missing # and surrounding spaces', () => expect(hwfHex('  0c0c0b ')).toEqual([12, 12, 11]));
  it('rejects anything else', () => {
    expect(hwfHex('red')).toBeNull();
    expect(hwfHex('#12345')).toBeNull();
    expect(hwfHex('')).toBeNull();
  });
});

describe('hwfRadius', () => {
  it('is zero for an empty cell and largest for a full one', () => {
    expect(hwfRadius(0, 6)).toBe(0);
    expect(hwfRadius(1, 6)).toBeCloseTo(6 * 0.56);
  });
  it('is area-true: a quarter-covered cell gets half the full radius', () => {
    expect(hwfRadius(0.25, 6)).toBeCloseTo(hwfRadius(1, 6) / 2);
  });
  it('clamps coverage into [0, 1]', () => {
    expect(hwfRadius(-1, 6)).toBe(0);
    expect(hwfRadius(5, 6)).toBe(hwfRadius(1, 6));
  });
});

describe('hwfStep', () => {
  it('leaves a dot at home with no pointer nearby', () => {
    expect(hwfStep(10, 10, 0, 0, 10, 10, -1e5, -1e5, 80)).toEqual([10, 10, 0, 0]);
  });
  it('pushes a dot away from a nearby pointer', () => {
    const [x] = hwfStep(10, 10, 0, 0, 10, 10, 0, 10, 80);
    expect(x).toBeGreaterThan(10);
  });
  it('springs a displaced dot back home and comes to rest', () => {
    let s = [30, 30, 0, 0];
    for (let i = 0; i < 400; i++) s = hwfStep(s[0], s[1], s[2], s[3], 10, 10, -1e5, -1e5, 80);
    expect(s[0]).toBeCloseTo(10, 2);
    expect(s[1]).toBeCloseTo(10, 2);
    expect(Math.abs(s[2]) + Math.abs(s[3])).toBeLessThan(1e-3);
  });
  it('ignores the pointer when the radius is 0', () => {
    expect(hwfStep(10, 10, 0, 0, 10, 10, 11, 10, 0)).toEqual([10, 10, 0, 0]);
  });
});

describe('hwfWarmth', () => {
  it('is 0 at home, scales with distance, and caps at 1', () => {
    expect(hwfWarmth(0, 0, 0, 0, 28)).toBe(0);
    expect(hwfWarmth(14, 0, 0, 0, 28)).toBeCloseTo(0.5);
    expect(hwfWarmth(100, 0, 0, 0, 28)).toBe(1);
  });
  it('is 0 when the span is not positive', () => expect(hwfWarmth(5, 5, 0, 0, 0)).toBe(0));
});

describe('hwfFitSize', () => {
  it('scales a 100px measurement to fill the width', () => expect(hwfFitSize(250, 1000)).toBe(400));
  it('returns 0 for an unmeasurable word', () => expect(hwfFitSize(0, 1000)).toBe(0));
});

describe('<HalftoneWordmarkFooter>', () => {
  it('renders the wordmark for screen readers, the brand line and real link columns', () => {
    render(
      <HalftoneWordmarkFooter
        wordmark="fundoo"
        label="Fundoo Notes"
        meta="©2026 · Built by Vedant"
        columns={[{ title: 'Product', links: [{ label: 'Notes', href: '/notes' }] }]}
      />
    );
    expect(screen.getByText('fundoo')).toBeInTheDocument();
    expect(screen.getByText('Fundoo Notes')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Product' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Notes' })).toHaveAttribute('href', '/notes');
    expect(screen.getByRole('button', { name: /back to top/i })).toBeInTheDocument();
  });

  it('has no placeholder studio content by default', () => {
    const { container } = render(<HalftoneWordmarkFooter />);
    expect(container.textContent).not.toMatch(/halden/i);
  });
});
