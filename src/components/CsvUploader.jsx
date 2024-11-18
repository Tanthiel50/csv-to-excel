import React from "react";
import Papa from "papaparse";

function CsvUploader({ setCsvData }) {
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === "text/csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setCsvData(results.data);
        },
      });
    } else {
      alert("Please upload a valid CSV file.");
    }
  };

  return (
    <div>
      <input type="file" accept=".csv" onChange={handleFileUpload} />
      <p>Upload a CSV file to start processing.</p>
    </div>
  );
}

export default CsvUploader;
