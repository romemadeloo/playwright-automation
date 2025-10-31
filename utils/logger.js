import fs from 'fs';
import path from 'path';

const logFile = path.join('logs', `run-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
fs.mkdirSync('logs', { recursive: true });

export function log(message) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${message}\n`;
  console.log(entry.trim());
  fs.appendFileSync(logFile, entry);
}
