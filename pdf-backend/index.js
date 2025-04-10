// index.js
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { PDFDocument } = require("pdf-lib");
const pdf = require("pdf-parse");
const pLimit = require("p-limit").default; // .default ekledik

const app = express();
const PORT = 5000;

// Multer'ı disk yerine bellek tabanlı depolama ile yapılandırıyoruz
const upload = multer({ storage: multer.memoryStorage() });
app.use(cors());

app.post("/search", upload.single("pdf"), async (req, res) => {
  try {
    // Anahtar kelimeleri al ve küçük harfe çevir
    const keywords = req.body.keywords
      .split(",")
      .map((k) => k.trim().toLowerCase());
    
    // Multer sayesinde dosyayı direkt belleğe alıyoruz
    const buffer = req.file.buffer;

    // PDF'i yükle
    const inputPdf = await PDFDocument.load(buffer);
    const totalPages = inputPdf.getPageCount();
    let matchingPages = [];

    // p-limit ile eş zamanlı çalışacak iş sayısını sınırlandırıyoruz (örn. 4 eşzamanlı işlem)
    const limit = pLimit(4);

    // Her sayfa için işlev oluşturup, limit dahilinde paralel çalıştırıyoruz
    const pageProcessingPromises = [];
    for (let i = 0; i < totalPages; i++) {
      pageProcessingPromises.push(
        limit(async () => {
          // Geçici PDF oluştur
          const tempDoc = await PDFDocument.create();
          const [copiedPage] = await tempDoc.copyPages(inputPdf, [i]);
          tempDoc.addPage(copiedPage);
          const pageBuffer = await tempDoc.save();

          // pdf-parse ile metin çıkartma
          const { text } = await pdf(pageBuffer);
          const lowerText = text.toLowerCase();

          // Eğer sayfa içerisinde en az bir anahtar kelime varsa, sayfa indeksini kaydet
          const found = keywords.some((kw) => lowerText.includes(kw));
          if (found) {
            matchingPages.push(i);
          }
        })
      );
    }

    // Tüm sayfa işlemleri tamamlanana kadar bekle
    await Promise.all(pageProcessingPromises);

    // Eşleşen sayfa yoksa hata dön
    if (matchingPages.length === 0) {
      return res.status(404).send("Anahtar kelime bulunamadı.");
    }

    // Yeni PDF oluştur ve eşleşen sayfaları ekle
    const outputPdf = await PDFDocument.create();
    const pages = await outputPdf.copyPages(inputPdf, matchingPages);
    pages.forEach((p) => outputPdf.addPage(p));
    const outputBuffer = await outputPdf.save();

    // PDF indirme başlıklarını ayarla ve dosyayı gönder
    res.setHeader("Content-Disposition", "attachment; filename=output.pdf");
    res.setHeader("Content-Type", "application/pdf");
    res.send(outputBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).send("Sunucu hatası.");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server çalışıyor: http://localhost:${PORT}`);
});
