const fs = require('fs');
const HTMLtoDOCX = require('html-to-docx');
const { marked } = require('marked');
const path = require('path');

async function generateDocx() {
  try {
    const mdContent = fs.readFileSync(path.join(__dirname, 'documento.md'), 'utf-8');
    
    // Parse markdown to HTML
    const htmlString = marked.parse(mdContent);
    
    const htmlWrap = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Calibri', sans-serif; font-size: 11pt; color: #333; }
            h1 { color: #1e3a8a; font-size: 24pt; border-bottom: 2px solid #1e3a8a; padding-bottom: 5px; }
            h2 { color: #2563eb; font-size: 16pt; margin-top: 20px; }
            h3 { color: #3b82f6; font-size: 13pt; }
            ul { margin-bottom: 15px; }
            li { margin-bottom: 5px; }
            p { text-align: justify; line-height: 1.5; }
            hr { border: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          ${htmlString}
        </body>
      </html>
    `;

    const fileBuffer = await HTMLtoDOCX(htmlWrap, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
      font: 'Calibri'
    });

    fs.writeFileSync(path.join(__dirname, '..', 'Documentacion_SISTEMONCO.docx'), fileBuffer);
    console.log('Documento DOCX generado exitosamente: Documentacion_SISTEMONCO.docx');
  } catch (err) {
    console.error('Error generando DOCX:', err);
  }
}

generateDocx();
