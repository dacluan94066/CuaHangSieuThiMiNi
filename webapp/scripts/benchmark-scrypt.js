import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { cpus, totalmem } from 'node:os';
import { createPasswordService, SCRYPT } from '../src/store/passwords.js';

// CPU/memory only. Does not import config, DB drivers or setup scripts.
const phase = process.argv[2];
if (!phase) {
  const results = ['single', 'two-concurrent'].map(mode => {
    const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), mode], { encoding: 'utf8', windowsHide: true });
    if (child.status !== 0) throw new Error('Benchmark worker failed');
    return JSON.parse(child.stdout);
  });
  console.log(JSON.stringify({ node: process.version, platform: process.platform, cpu: cpus()[0].model, totalMemoryMiB: Math.round(totalmem() / 1048576), parameters: SCRYPT, maxmemMiB: 256, samplingIntervalMs: 5, results }, null, 2));
} else {
  const passwords = createPasswordService();
  const baseline = process.memoryUsage().rss;
  let peak = baseline;
  const sampler = setInterval(() => { peak = Math.max(peak, process.memoryUsage().rss); }, 5);
  const samples = [];
  try {
    for (let i = 0; i < 3; i++) {
      const start = performance.now();
      await Promise.all(Array.from({ length: phase === 'single' ? 1 : 2 }, () => passwords.hash('Benchmark-only-2026!')));
      samples.push(Math.round((performance.now() - start) * 100) / 100);
      peak = Math.max(peak, process.memoryUsage().rss);
    }
  } finally { clearInterval(sampler); }
  const mib = value => Math.round(value / 1048576 * 100) / 100;
  console.log(JSON.stringify({ phase, samplesMs: samples, meanMs: Math.round(samples.reduce((a, b) => a + b) / samples.length * 100) / 100,
    baselineRssMiB: mib(baseline), sampledPeakRssMiB: mib(peak), sampledDeltaRssMiB: mib(peak - baseline), osMaxRssKiB: process.resourceUsage().maxRSS }));
}
