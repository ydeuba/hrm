import { describe, expect, it } from 'vitest';
import { displayName, normaliseName } from '@/domain/shared/name';
import { DEFAULT_DESIGNATIONS, DEFAULT_KPI_SETTINGS } from '@/domain/settings/defaults';

describe('normaliseName', () => {
  it('collapses internal whitespace and lower-cases', () => {
    expect(normaliseName('Niva  Awale')).toBe('niva awale');
    expect(normaliseName('  Surya joshi ')).toBe('surya joshi');
    expect(normaliseName('Run\tTeam')).toBe('run team');
  });

  it('applies Unicode NFC so composed and decomposed forms match', () => {
    expect(normaliseName('Amélie')).toBe(normaliseName('Amélie'));
  });

  it('supports Devanagari', () => {
    expect(normaliseName(' राम  बहादुर ')).toBe('राम बहादुर');
  });
});

describe('displayName', () => {
  it('keeps casing while tidying whitespace', () => {
    expect(displayName('  Niva  Awale ')).toBe('Niva Awale');
  });
});

describe('default settings', () => {
  it('bands descend strictly from Outstanding to Needs Improvement', () => {
    const mins = DEFAULT_KPI_SETTINGS.bands.map((b) => b.min);
    expect(mins).toEqual([8, 6, 5, 0]);
  });

  it('seeds designations in display order', () => {
    expect(DEFAULT_DESIGNATIONS).toEqual(['Team Lead', 'SSE', 'SE', 'ASE']);
  });
});
