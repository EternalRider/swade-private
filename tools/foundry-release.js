import { readFile } from 'node:fs/promises';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = await yargs(hideBin(process.argv))
  .options({
    authToken: { string: true },
    packageVersion: { string: true },
    manifest: { string: true },
    releaseNotes: { string: true },
    dryRun: { boolean: true, default: true },
  })
  .version(false)
  .help()
  .parse();

const manifestPath = 'dist/system.json';
const url = 'https://foundryvtt.com/_api/packages/release_version/';

const manifestRaw = await readFile(manifestPath, 'utf-8');
const manifest = JSON.parse(manifestRaw);

const request = {
  headers: {
    'Content-Type': 'application/json',
    Authorization: argv.authToken,
  },
  method: 'POST',
  body: JSON.stringify({
    id: 'swade',
    'dry-run': argv.dryRun,
    release: {
      version: argv.packageVersion,
      manifest: argv.manifest,
      notes: argv.releaseNotes,
      compatibility: manifest.compatibility,
    },
  }),
};

const response = await fetch(url, request);
if (response.ok) {
  console.info(JSON.stringify(await response.json(), null, 2));
} else {
  console.warn(await response.text());
}
