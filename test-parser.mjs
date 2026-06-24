import { PDFParse } from 'pdf-parse';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

async function test() {
  const pdfPath = path.resolve('public/demo-docs/Travel_Reimbursement_Policy.pdf');
  const buffer = fs.readFileSync(pdfPath);
  
  const workerPath = path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
  PDFParse.setWorker(pathToFileURL(workerPath).toString());
  
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    console.log("Pages length:", result.pages ? result.pages.length : "undefined");
    console.log("Result keys:", Object.keys(result));
    if (result.pages) {
      result.pages.forEach((p, idx) => {
        console.log(`Page ${idx + 1} (num ${p.num}): length = ${p.text ? p.text.length : 0}`);
      });
    }
  } catch (err) {
    console.error("Error during parse:", err);
  } finally {
    await parser.destroy();
  }
}

test();
