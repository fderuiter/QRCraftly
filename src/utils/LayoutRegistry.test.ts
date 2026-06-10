import { describe, it, expect } from 'vitest';
import { LayoutRegistry } from './LayoutRegistry';
import { SocialFormat } from '../types';
import { getAspectRatioCss } from './templateRenderer';

describe('LayoutRegistry', () => {
  it('should return the correct aspect-ratio string for registered format types', () => {
    // DCO mapped to PORTRAIT_4_5
    expect(LayoutRegistry.getAspectRatio('DCO')).toBe(getAspectRatioCss(SocialFormat.PORTRAIT_4_5));
    // Precision+ mapped to SQUARE_1_1
    expect(LayoutRegistry.getAspectRatio('Precision+')).toBe(getAspectRatioCss(SocialFormat.SQUARE_1_1));
    // Ad mapped to LANDSCAPE_16_9
    expect(LayoutRegistry.getAspectRatio('Ad')).toBe(getAspectRatioCss(SocialFormat.LANDSCAPE_16_9));
  });

  it('should return the default aspect-ratio for unregistered module types', () => {
    const defaultAspectRatio = getAspectRatioCss(SocialFormat.SQUARE_1_1);
    expect(LayoutRegistry.getAspectRatio('UnknownModuleType')).toBe(defaultAspectRatio);
    expect(LayoutRegistry.getAspectRatio('ExperimentalFeature')).toBe(defaultAspectRatio);
  });

  it('should allow registering a new format', () => {
    LayoutRegistry.registerFormat('NewSocialType', SocialFormat.STORY_9_16);
    expect(LayoutRegistry.getAspectRatio('NewSocialType')).toBe(getAspectRatioCss(SocialFormat.STORY_9_16));
  });

  it('should allow registering a custom aspect ratio', () => {
    LayoutRegistry.registerCustom('CustomBanner', '21/9');
    expect(LayoutRegistry.getAspectRatio('CustomBanner')).toBe('21/9');
  });

  it('should overwrite existing registration if registered again', () => {
    LayoutRegistry.registerCustom('DCO', '4/5');
    expect(LayoutRegistry.getAspectRatio('DCO')).toBe('4/5');
    
    // Restore the correct format for other tests or application use
    LayoutRegistry.registerFormat('DCO', SocialFormat.PORTRAIT_4_5);
  });
});
