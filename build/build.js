const fs = require('fs').promises;
const { mdToPdf } = require('md-to-pdf');

(async() => {
    var readme = (await fs.readFile("README.md")).toString();
    const files = [...readme.matchAll(/\[.+\]\((.+)[.]md\)/g)].map(f => f[1]);
    const fileHeaders = {};

    console.log("Reading files");
    const pages = await Promise.all(files.map(async(f) => {
        const content = (await fs.readFile(f + ".md")).toString();
        const m = content.match(/^\s*#\s+(.+)/);
        if (m == null) {
            console.warn(`No header found in ${f}`);
            return;
        }
        fileHeaders[f] = m[1];
        return content
    }, { concurrency: 5 }));

    files.forEach(f => {
        readme = readme.replace(`${f}.md`, `#${fileHeaders[f].replaceAll(' ', '-')}`);
    })

    console.log("Merging files");
    const brk = '\n\n<div class="page-break"></div>\n\n';
    var mdDoc = readme + brk + pages.join(brk);
    await fs.writeFile("dist/book.md", mdDoc);

    console.log("Converting to PDF");
    const pdf = await mdToPdf({ content: mdDoc }, {
        stylesheet: ["build/style.css"],
    }).catch(console.error);

    console.log("Saving PDF")
    if (pdf) {
        await fs.writeFile("dist/book.pdf", pdf.content);
    }
    process.exit()
})();