import { execFileSync, execSync, type ExecFileSyncOptions, type ExecSyncOptions } from 'child_process';
import fs from 'fs';

const WINDOWS_CMD_EXECUTABLES = new Set(['npx', 'npm', 'pnpm', 'yarn', 'tsc', 'wrangler', 'depcruise']);

/**
 * Resolves the executable name for the current platform.
 * On Windows, npm/pnpm/npx binaries require .cmd extension.
 */
export function resolveCommand(command: string): string {
  if (process.platform === 'win32') {
    if (WINDOWS_CMD_EXECUTABLES.has(command)) {
      return `${command}.cmd`;
    }
  }
  return command;
}

/**
 * Executes a binary file synchronously with platform resolution and UTF-8 output normalization.
 */
export function execBinary(
  file: string,
  args: string[] = [],
  options: ExecFileSyncOptions = {}
): string {
  const resolved = resolveCommand(file);
  const isWin = process.platform === 'win32';
  const opts: ExecFileSyncOptions = {
    encoding: 'utf8',
    shell: isWin,
    ...options,
  };

  const output = execFileSync(resolved, args, opts);
  return typeof output === 'string' ? output.replace(/\r\n/g, '\n') : (output as unknown as string);
}

/**
 * Executes a shell command synchronously with UTF-8 decoding and LF output normalization.
 */
export function execShell(command: string, options: ExecSyncOptions = {}): string {
  const opts: ExecSyncOptions = {
    encoding: 'utf8',
    ...options,
  };

  const output = execSync(command, opts);
  return typeof output === 'string' ? output.replace(/\r\n/g, '\n') : (output as unknown as string);
}

/**
 * Resolves the bash executable for the current platform.
 */
export function resolveBash(): string {
  if (process.platform === 'win32') {
    const sysDrive = process.env.SystemDrive || '';
    const progFiles = process.env.ProgramFiles || (sysDrive ? `${sysDrive}\\Program Files` : '');
    const progFilesX86 = process.env['ProgramFiles(x86)'] || (sysDrive ? `${sysDrive}\\Program Files (x86)` : '');
    const localAppData = process.env.LOCALAPPDATA || '';

    const candidatePaths = [
      'bash',
      'bash.exe',
      progFiles ? `${progFiles}\\Git\\bin\\bash.exe` : '',
      progFiles ? `${progFiles}\\Git\\usr\\bin\\bash.exe` : '',
      progFilesX86 ? `${progFilesX86}\\Git\\bin\\bash.exe` : '',
      localAppData ? `${localAppData}\\Programs\\Git\\bin\\bash.exe` : '',
    ].filter(Boolean);

    for (const candidate of candidatePaths) {
      if (candidate === 'bash' || candidate === 'bash.exe') {
        try {
          execSync(`${candidate} --version`, { stdio: 'ignore' });
          return candidate;
        } catch (_e) {}
      } else {
        try {
          if (fs.existsSync(candidate)) {
            return candidate;
          }
        } catch (_e) {}
      }
    }
  }
  return 'bash';
}

