import React, { useState } from "react";
import CsvUploader from "./components/CsvUploader";
import DataProcessor from "./components/DataProcessor";

function App() {
  const [csvData, setCsvData] = useState(null);

  return (
    <div>
      <DataProcessor />
    </div>
  );
}

export default App;
