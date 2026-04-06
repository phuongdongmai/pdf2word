import { asBlob } from 'html-docx-js-typescript';
import { saveAs } from 'file-saver';

async function test() {
  const html = '<h1>Hello World</h1>';
  const blob = await asBlob(html) as Blob;
  saveAs(blob, 'test.docx');
}
test();
