import React, { useState } from "react";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import { saveAs } from "file-saver";

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
  const generateExcel = async () => {
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
      const montant = parseFloat(values[4]) || 0;
  
      return {
        date: values[2] || "",
        mail: values[12] || "",
        nature: nature,
        montant: montant,
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
  
    // Créer un nouveau classeur
    const workbook = new ExcelJS.Workbook();
  
    Object.keys(groupedData).forEach((nature) => {
      const rows = groupedData[nature];
  
      // Calculer la somme totale des montants pour cette nature
      const total = rows.reduce((sum, row) => sum + (parseFloat(row[2]) || 0), 0);
  
      // Créer une feuille de calcul
      const worksheet = workbook.addWorksheet(nature);
  
      // Ajouter un titre
      worksheet.mergeCells("A1:C1");
      worksheet.getCell("A1").value = `Transactions pour la nature "${nature}" - Date : ${selectedDate}`;
      worksheet.getCell("A1").font = { bold: true, size: 14 };
      worksheet.getCell("A1").alignment = { horizontal: "center" };
  
      // Ajouter les en-têtes
      worksheet.addRow(["Date de transaction", "Mail", "Montant"]);
      const headerRow = worksheet.getRow(2);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFF00" }, // Jaune
      };
  
      // Ajouter les données
      rows.forEach((row) => worksheet.addRow(row));
  
      // Ajouter la ligne pour le total
      worksheet.addRow(["", "Total", total.toFixed(2)]);
      const totalRow = worksheet.getRow(worksheet.rowCount);
      totalRow.font = { bold: true };
  
      // Ajuster la largeur des colonnes
      worksheet.columns = [
        { key: "date", width: 30 }, // Colonne A (Date de transaction)
        { key: "mail", width: 30 }, // Colonne B (Mail)
        { key: "montant", width: 30 }, // Colonne C (Montant)
      ];
    });
  
    // Générer et télécharger le fichier Excel
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, `Transactions_${selectedDate}.xlsx`);
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