const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const { PDFDocument } = require("pdf-lib");
const pdf = require("pdf-parse");
const path = require("path");

const app = express();
const PORT = 5000;

// Upload klasörü
const upload = multer({ dest: "uploads/" });
app.use(cors());

app.post("/search", upload.single("pdf"), async (req, res) => {
  try {
    const keywords = req.body.keywords
      .split(",")
      .map((k) => k.trim().toLowerCase());
    const filePath = req.file.path;

    const buffer = fs.readFileSync(filePath);
    const inputPdf = await PDFDocument.load(buffer);
    const totalPages = inputPdf.getPageCount();
    const matchingPages = [];

    for (let i = 0; i < totalPages; i++) {
      const tempDoc = await PDFDocument.create();
      const [copiedPage] = await tempDoc.copyPages(inputPdf, [i]);
      tempDoc.addPage(copiedPage);
      const pageBuffer = await tempDoc.save();

      const text = await pdf(pageBuffer);
      const lowerText = text.text.toLowerCase();

      const found = keywords.some((kw) => lowerText.includes(kw));
      if (found) {
        matchingPages.push(i);
      }
    }

    if (matchingPages.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(404).send("Anahtar kelime bulunamadı.");
    }

    const outputPdf = await PDFDocument.create();
    const pages = await outputPdf.copyPages(inputPdf, matchingPages);
    pages.forEach((p) => outputPdf.addPage(p));
    const outputBuffer = await outputPdf.save();

    res.setHeader("Content-Disposition", "attachment; filename=output.pdf");
    res.setHeader("Content-Type", "application/pdf");
    res.send(outputBuffer);

    fs.unlinkSync(filePath); // geçici dosyayı sil
  } catch (err) {
    console.error(err);
    res.status(500).send("Sunucu hatası.");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server çalışıyor: http://localhost:${PORT}`);
});
