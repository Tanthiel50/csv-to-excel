import React, { useState } from "react";
import CsvUploader from "./components/CsvUploader";
import DataProcessor from "./components/DataProcessor";

function App() {
  const [csvData, setCsvData] = useState(null);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Application de traitement CSV</h1>
      <DataProcessor />
    </div>
  );
}

export default App;
