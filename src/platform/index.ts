import * as os from 'os';
import { WindowsPlatformAdapter } from './windows';
import { LinuxPlatformAdapter } from './linux';

export interface PlatformAdapter {
  normalizePath(p: string): string;
}

export const platform: PlatformAdapter = (() => {
  const p = os.platform();
  if (p === 'win32') return new WindowsPlatformAdapter();
  return new LinuxPlatformAdapter();
})();
