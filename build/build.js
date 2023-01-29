const fss = require('fs');
const fs = fss.promises;
const { mdToPdf } = require('md-to-pdf');
const JSZip = require('jszip');



(async() => {
    var readme = (await fs.readFile("README.md")).toString();
    const files = [...readme.matchAll(/\[.+\]\((.+)[.]md\)/g)].map(f => f[1]);
    const fileHeaders = {};

    const zip = new JSZip();
    console.log("Reading files");
    const pages = await Promise.all(files.map(async(f) => {
        const content = (await fs.readFile(f + ".md")).toString();
        const m = content.match(/^\s*#\s+(.+)/);
        if (m == null) {
            console.warn(`No header found in ${f}`);
            return;
        }
        fileHeaders[f] = m[1];

        const pdf = await mdToPdf({ content: content }, {
            stylesheet: ["build/style.css"],
        }).catch(console.error);
        zip.file(`${f}.pdf`, pdf.content)

        return content
    }, { concurrency: 5 }));

    console.log("Creating zip")
    const p = new Promise((resolve) => {
        zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
            .pipe(fss.createWriteStream('dist/pages.zip'))
            .on('finish', function() {
                resolve()
            });
    })
    await p
    console.log("Creating zip finished")

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