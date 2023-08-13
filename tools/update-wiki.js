import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { promises as fs } from 'fs';
import path from 'path';
import { default as fm } from 'front-matter';

const projectID = 16269883
const swadeWiki = `https://gitlab.com/api/v4/projects/${projectID}/wikis`
const docsPath = 'src/packs/system-docs/'

updateWiki()

async function updateWiki() {
    const argv = await yargs(hideBin(process.argv))
        .option('authToken')
        .help()
        .parse();
    
    const auth = argv.authToken

    const slugs = await getWikiPages(auth)

    for (const slug of slugs) {
      await updateWikiPage(auth, slug)
      // ensure there's at most 10 requests per second
      await new Promise((res) => setTimeout(res, 100));
    }

}

async function getWikiPages(authToken) {

    let myHeaders = new Headers();
    myHeaders.append('Authorization', `Bearer ${authToken}`);

    const config = {
        method: 'get',
        headers: myHeaders,
        redirect: 'follow',
        encoding: 'UTF-8'
    };
    
    const response = await fetch(swadeWiki, config)
    const result = await response.json()

    return result.map(a => a.slug)
}

async function updateWikiPage(authToken, slug) {

    if (slug === 'Home' ||
        slug === '_sidebar') return;

    const filePath = path.resolve(docsPath, convertSlug(slug))

    const fileContent = await fs.readFile(filePath, 'utf-8'); //markdown

    const content = fm(fileContent)

    let data = {
        'content': content.body,
        'slug': slug,
        'id': projectID,
        encoding: 'UTF-8',
        format: 'markdown'
    }
    
    let myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/json');
    myHeaders.append('Authorization', `Bearer ${authToken}`);

    const config = {
        method: 'PUT',
        headers: myHeaders,
        redirect: 'follow',
        body: JSON.stringify(data)
    };
    
    const response = await fetch(`${swadeWiki}/${slug}`, config)
    console.log(`Updating wiki page for ${slug}`)
    if (response.status === 200) console.log(response.statusText)
    else console.warn(response.statusText)
}

function convertSlug(slug) {
    return slug.replaceAll('-', '_') + '.md'
}