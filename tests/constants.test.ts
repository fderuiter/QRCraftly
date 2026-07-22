import { readFileSync } from 'fs';
import { join } from 'path';
import { SYSTEM_LIMITS } from '../src/constants';

describe('Automated Unit Test Verification for Centralized Constants', () => {
  it('should document the correct file upload limits and formats in README.md', () => {
    const readmePath = join(__dirname, '../README.md');
    const readmeContent = readFileSync(readmePath, 'utf8');

    // Convert decimal to percentage for documentation check (e.g., 0.3 -> 30%)
    const expectedLogoSizeStr = `${SYSTEM_LIMITS.MAX_LOGO_SIZE * 100}%`;
    expect(readmeContent).toContain(`Maximum logo size is ${expectedLogoSizeStr}`);
    
    // Check supported formats
    const expectedFormatsStr = SYSTEM_LIMITS.SUPPORTED_IMAGE_FORMATS.join(', ');
    expect(readmeContent).toContain(`Supported custom logo formats are ${expectedFormatsStr}`);
    
    // Check max file size
    expect(readmeContent).toContain(`Maximum file size is ${SYSTEM_LIMITS.MAX_FILE_UPLOAD_MB}MB`);
  });

  it('should document the correct bundle size limit in SCALING.md', () => {
    const scalingPath = join(__dirname, '../docs/public/SCALING.md');
    const scalingContent = readFileSync(scalingPath, 'utf8');

    expect(scalingContent).toContain(`Worst Case Bundle Size:** ${SYSTEM_LIMITS.MAX_BUNDLE_SIZE_MB} MB`);
    expect(scalingContent).toContain(`enforces a strict **${SYSTEM_LIMITS.MAX_BUNDLE_SIZE_MB}MB** total payload limit`);
  });

  it('should document the correct bundle size limit in README.md', () => {
    const readmePath = join(__dirname, '../README.md');
    const readmeContent = readFileSync(readmePath, 'utf8');

    expect(readmeContent).toContain(`enforces a ${SYSTEM_LIMITS.MAX_BUNDLE_SIZE_MB}MB limit on the client bundle`);
  });
});
