import chalk from 'chalk';
import { ClassicLevel } from 'classic-level';
import { default as fm } from 'front-matter';
import { existsSync, promises as fs } from 'fs';
import { load as yamLoad } from 'js-yaml';
import { marked } from 'marked';
import path from 'path';

const src = 'src/packs';
const dest = 'dist/packs';

const items = ['edges', 'hindrances', 'powers', 'skills'];

const journals = ['system-docs'];

main();

async function main() {

  marked.use({ gfm: true, mangle: false, headerIds: false })

  //check if the output directory exists, and create it if necessary
  const inputDir = path.resolve(src);
  const outputDir = path.resolve(dest);
  if (!existsSync) await fs.mkdir(outputDir, { recursive: true });

  // pack all items
  for (const pack of items) {
    await packItemCompendium(pack, inputDir, outputDir);
  }

  //pack journal entries
  for (const journal of journals) {
    await packJournalCompendium(journal, inputDir, outputDir);
  }
}

/**
 *
 * @param {string} pack The name of the item compendium
 * @param {string} inputDir The directory to read files from
 * @param {string} outputDir The directory to write to
 */
async function packItemCompendium(pack, inputDir, outputDir) {
  console.log(chalk.green('Building pack ' + chalk.bold(pack) + '...'));
  const dbPath = path.join(outputDir, pack);
  //attempt to clear the DB files if they already exist.
  if (existsSync(dbPath)) await fs.rm(dbPath, { recursive: true });
  //create DB and grab a transaction
  const db = getDB(dbPath);
  const batch = db.batch();
  const packPath = path.resolve(inputDir, pack);
  const files = await fs.readdir(packPath);
  //read each file in a subdirectory and put it into the transaction
  for (const item of files) {
    const filePath = path.resolve(packPath, item);
    const file = await fs.readFile(filePath, 'utf-8'); //load the YAML
    const doc = yamLoad(file, { filename: item });
    packDocument(batch, doc, 'item');
  }
  //commit and close the DB
  await closeTransactionAndDB(db, batch, pack);
}

/**
 *
 * @param {string} journal The name of the journal compendium
 * @param {string} inputDir The directory to read files from
 * @param {string} outputDir The directory to write to
 */
async function packJournalCompendium(journal, inputDir, outputDir) {
  console.log(chalk.green('Building pack ' + chalk.bold(journal) + '...'));
  const dbPath = path.join(outputDir, journal);
  //attempt to clear the DB files if they already exist.
  if (existsSync(dbPath)) await fs.rm(dbPath, { recursive: true });
  //create DB and grab a transaction
  const db = getDB(dbPath);
  const batch = db.batch();
  const packPath = path.resolve(inputDir, journal);
  const files = await fs.readdir(packPath);
  for (const file of files) {
    const ext = path.extname(file);
    const filePath = path.resolve(packPath, file);
    if (ext === '.yml') {
      const yaml = await fs.readFile(filePath, 'utf-8'); //load the YAML
      const journal = yamLoad(yaml, { filename: file });
      packDocument(batch, journal, 'journal');
    } else if (ext === '.md') {
      const fileContent = await fs.readFile(filePath, 'utf-8'); //markdown
      const content = fm(fileContent);
      const page = createPage(
        await marked(content.body, { async: true }),
        content.attributes,
      );
      packDocument(batch, page, 'journal');
    }
  }
  //commit and close the DB
  await closeTransactionAndDB(db, batch, journal);
}

/**
 *
 * @param {ChainedBatch} batch The database Transaction
 * @param {object} doc The raw document data
 * @param {string} type the type of document i.e. actor or journal
 */
function packDocument(batch, doc, type) {
  if (!doc._id) doc._id = makeID(); //add ID if necessary
  doc._id ||= makeID(); //add ID if necessary
  const key = doc._key || '!' + type + '!' + doc._id; //grab the key or construct it if necessary
  delete doc._key; //delete the key from the doc
  batch.put(key, doc); //add the document to the DB transaction
}

/**
 * Create a
 * @param {string} content The string content of the page
 * @param {object} metadata Metadata loaded from the frontmatter
 */
function createPage(content, metadata) {
  return {
    _key: metadata.key,
    _id: metadata.id,
    name: metadata.title,
    sort: metadata.sort,
    type: 'text',
    ownership: { default: -1 },
    text: {
      content: content,
      format: 1,
    },
    title: { level: 1, show: true },
  };
}

function getDB(path) {
  return new ClassicLevel(path, { keyEncoding: 'utf8', valueEncoding: 'json' });
}

/**
 *
 * @param {ClassicLevel} db The database currently being worked on
 * @param {ChainedBatch} batch The currently active Transaction
 * @param {string} pack The pack being worked on
 */
async function closeTransactionAndDB(db, batch, pack) {
  //commit and close the DB
  await batch.write();
  await db.close();
  console.log(chalk.green('Packed ' + chalk.bold(pack) + '!'));
}

function makeID(length = 16) {
  let result = '';
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
