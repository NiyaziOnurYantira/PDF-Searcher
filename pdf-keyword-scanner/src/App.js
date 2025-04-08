import React, { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [keywords, setKeywords] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!file || !keywords.trim()) {
      alert("Please enter PDF and keywords.");
      return;
    }

    const formData = new FormData();
    formData.append("pdf", file);
    formData.append("keywords", keywords);

    try {
      setLoading(true);
      const response = await axios.post("http://localhost:5000/search", formData, {
        responseType: "blob", // PDF dönebilir
      });

      // PDF dosyasını indir
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "output.pdf";
      link.click();

      setResult("✅Pages containing the word were successfully removed.");
    } catch (err) {
      console.error(err);
      setResult("❌ Error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <h2>📄 PDF Keyword Scanner</h2>
      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      <br />
      <textarea
        placeholder="Enter keywords separated by commas"
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
        rows={4}
        style={{ width: "300px", marginTop: "10px" }}
      />
      <br />
      <button onClick={handleSubmit} disabled={loading} style={{ marginTop: "10px" }}>
        {loading ? "İşleniyor..." : "Search and find"}
      </button>
      <p>{result}</p>
    </div>
  );
}

export default App;
