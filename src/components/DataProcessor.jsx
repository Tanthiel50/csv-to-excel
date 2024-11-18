import React, { useState } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";

function DataProcessor() {
  const [csvData, setCsvData] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");

  // Lecture et analyse du CSV
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === "text/csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rawData = results.data;

          // Extraire les dates uniques
          const dates = [
            ...new Set(
              rawData.map((row) => row["Date & Heure"].split(" ")[0])
            ),
          ];
          setAvailableDates(dates);
          setCsvData(rawData);
        },
      });
    } else {
      alert("Veuillez importer un fichier CSV valide.");
    }
  };

  // Génération du fichier Excel
  const generateExcel = () => {
    if (!csvData || !selectedDate) {
      alert("Aucune donnée ou date sélectionnée.");
      return;
    }
  
    // Filtrer les données par la date sélectionnée
    const filteredData = csvData.filter((row) =>
      row["Date & Heure"].startsWith(selectedDate)
    );
  
    // Transformer les données filtrées
    const transformedData = filteredData.map((row) => {
      const values = Object.values(row);
      let nature = "";
      const referenceCommande = values[3] || "";
  
      if (referenceCommande.includes("Parcoursup") || referenceCommande.startsWith("pri_")) {
        nature = "Parcoursup";
      } else if (
        referenceCommande.startsWith("reinsc_nant_") ||
        referenceCommande.startsWith("regul_nant_")
      ) {
        nature = "Taiga";
      } else if (referenceCommande.startsWith("regul_")) {
        nature = "Voyage, remplacement carte, divers...";
      } else if (referenceCommande.startsWith("reinsc_")) {
        nature = "Inscription ADM";
      } else if (!referenceCommande.includes("-") && !referenceCommande.includes("_")) {
        nature = "ensa app";
      } else {
        nature = "Inconnu";
      }

      // Valider et convertir le montant
    const montant = parseFloat(values[5]) || 0;

    return {
      date: values[2] || "",
      mail: values[12] || "",
      nature: nature,
      montant: values[4] || "",
    };
  });

 // Grouper les données par nature
 const groupedData = transformedData.reduce((acc, row) => {
  if (!acc[row.nature]) {
    acc[row.nature] = [];
  }
  acc[row.nature].push([row.date, row.mail, row.montant]);
  return acc;
}, {});

// Générer un fichier Excel avec une feuille par nature
const workbook = XLSX.utils.book_new();

Object.keys(groupedData).forEach((nature) => {
  const rows = groupedData[nature];

  // Calculer la somme totale des montants pour cette nature
  const total = rows.reduce((sum, row) => sum + (parseFloat(row[2]) || 0), 0);

  // Ajouter la ligne pour le total
  rows.push(["", "Total", total.toFixed(2)]);

  // Ajouter les données à la feuille Excel
  const worksheetData = [["Date de transaction", "Mail", "Montant"], ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  XLSX.utils.book_append_sheet(workbook, worksheet, nature);
});

// Télécharger l'Excel
XLSX.writeFile(workbook, `Transactions_${selectedDate}.xlsx`);
};

return (
  <div>
    <h2>Traitement des fichiers CSV</h2>
    <input type="file" accept=".csv" onChange={handleFileUpload} />
    {availableDates.length > 0 && (
      <div>
        <label>
          Sélectionnez une date :
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          >
            <option value="">-- Choisir une date --</option>
            {availableDates.map((date) => (
              <option key={date} value={date}>
                {date}
              </option>
            ))}
          </select>
        </label>
      </div>
    )}
    {csvData && selectedDate && (
      <div>
        <button onClick={generateExcel}>Exporter les données filtrées</button>
        <p>Données prêtes à être exportées.</p>
      </div>
    )}
  </div>
);
}

export default DataProcessor;