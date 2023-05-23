import chalk from 'chalk';
import { ClassicLevel } from 'classic-level';
import { existsSync, promises as fs } from 'fs';
import { load as yamlLoad } from 'js-yaml';
import path from 'path';

const src = 'src/packs';
const dest = 'dist/packs';

//check if the output directory exists, and create it if necessary
const outputDir = path.resolve(dest);
if (!existsSync) await fs.mkdir(outputDir, { recursive: true });

//load the subdirectories
const inputDir = path.resolve(src);
const packs = await fs.readdir(inputDir);

//go through each subdirectory
for (const pack of packs) {
  console.log(chalk.green('Building pack ' + chalk.bold(pack) + '...'));
  const dbPath = path.join(outputDir, pack);
  //attempt to clear the DB files if they already exist.
  if (existsSync(dbPath)) await fs.rm(dbPath, { recursive: true })
  //create DB and grab a transaction
  const db = new ClassicLevel(dbPath, { keyEncoding: 'utf8', valueEncoding: 'json' });
  const batch = db.batch();
  const packPath = path.resolve(inputDir, pack);
  const entries = await fs.readdir(packPath);
  //read each file in a subdirectory and put it into the transaction
  for (const entry of entries) {
    const filePath = path.resolve(packPath, entry)
    const file = await fs.readFile(filePath, 'utf-8'); //load the YAML
    const doc = yamlLoad(file, { filename: entry });
    if (!doc._id) doc._id = makeid(); //add ID if necessary
    let key = `!items!${doc._id}`;
    if (doc._key) { //generate a key if necessary
      key = doc._key;
      delete doc._key;
    }
    batch.put(key, doc); //add it to the DB transaction
  }
  //commit and close the DB
  await batch.write();
  await db.close();
  console.log(chalk.green('Packed ' + chalk.bold(pack) + '!'));
}

function makeid(length = 16) {
  let result = '';
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}