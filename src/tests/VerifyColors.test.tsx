import { describe, it, expect } from 'vitest';
import { PRESET_COLORS } from '../constants';

describe('Color Presets Verification', () => {
  it('should include Minnesota Timberwolves colors', () => {
    const wolves = PRESET_COLORS.find(c => c.label === 'Timberwolves');
    expect(wolves).toBeDefined();
    expect(wolves).toEqual({
      bg: '#0c2340',
      fg: '#ffffff',
      eye: '#78be20',
      label: 'Timberwolves'
    });
  });

  it('should include Minnesota Wild colors', () => {
    const wild = PRESET_COLORS.find(c => c.label === 'Wild');
    expect(wild).toBeDefined();
    expect(wild).toEqual({
      bg: '#ffffff',
      fg: '#154734',
      eye: '#a6192e',
      label: 'Wild'
    });
  });

  it('should include Minnesota Vikings colors', () => {
    const vikings = PRESET_COLORS.find(c => c.label === 'Vikings');
    expect(vikings).toBeDefined();
    expect(vikings).toEqual({
      bg: '#4f2683',
      fg: '#ffffff',
      eye: '#ffc62f',
      label: 'Vikings'
    });
  });
});
