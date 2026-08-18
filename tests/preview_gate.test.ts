import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Same-Repo Gate & Local Mock Preview Workflow Integration', () => {
  const workflowPath = path.resolve(process.cwd(), '.github/workflows/preview.yml');

  it('preview workflow file exists', () => {
    expect(fs.existsSync(workflowPath)).toBe(true);
  });

  it('runs deploy-preview job for both internal and fork PRs without closed filter restriction', () => {
    const content = fs.readFileSync(workflowPath, 'utf8');
    expect(content).toContain("if: github.event.action != 'closed'");
    expect(content).not.toContain("if: github.event.action != 'closed' && github.event.pull_request.head.repo.full_name == github.repository");
  });

  it('restricts Cloudflare deployment credentials strictly to same-repository branches', () => {
    const content = fs.readFileSync(workflowPath, 'utf8');
    const sameRepoCondition = 'github.event.pull_request.head.repo.full_name == github.repository';
    
    // Check CLOUDFLARE_API_TOKEN is conditionally assigned
    expect(content).toContain(`CLOUDFLARE_API_TOKEN: \${{ ${sameRepoCondition} && secrets.CLOUDFLARE_API_TOKEN || '' }}`);
    // Check CLOUDFLARE_ACCOUNT_ID is conditionally assigned
    expect(content).toContain(`CLOUDFLARE_ACCOUNT_ID: \${{ ${sameRepoCondition} && secrets.CLOUDFLARE_ACCOUNT_ID || '' }}`);
  });

  it('enforces exact toolchain version requirements (pnpm and Node.js)', () => {
    const content = fs.readFileSync(workflowPath, 'utf8');
    expect(content).toContain('EXPECTED_PNPM="11.1.3"');
    expect(content).toContain('EXPECTED_NODE="v22.14.0"');
  });

  it('configures git checkout with fetch-depth: 0 for lineage validation', () => {
    const content = fs.readFileSync(workflowPath, 'utf8');
    expect(content).toContain('fetch-depth: 0');
  });

  it('explicitly indicates whether live cloud deployment or local mock preview mode was executed in logs and comments', () => {
    const content = fs.readFileSync(workflowPath, 'utf8');
    expect(content).toContain('Live Cloud Deployment');
    expect(content).toContain('Local Mock Preview');
    expect(content).toContain('Execution Mode');
  });
});
