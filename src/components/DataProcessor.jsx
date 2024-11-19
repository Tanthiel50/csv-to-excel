import React, { useState } from "react";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import { saveAs } from "file-saver";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function DataProcessor() {
  const [csvData, setCsvData] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");

  const expectedHeaders = ["Date & Heure", "Email porteur", "Montant"];

  // Lecture et analyse du CSV
  const handleFileUpload = (event) => {
    const file = event.target.files[0];

    if (!file) {
      toast.error("Aucun fichier sélectionné.");
      return;
    }

    if (file.type !== "text/csv") {
      toast.error("Seuls les fichiers CSV sont acceptés.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux (limite : 2 Mo).");
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rawData = results.data;

        // Vérifier les colonnes attendues
        const fileHeaders = Object.keys(rawData[0]);
        const missingHeaders = expectedHeaders.filter(
          (header) => !fileHeaders.includes(header)
        );

        if (missingHeaders.length > 0) {
          toast.error(
            `Colonnes manquantes dans le CSV : ${missingHeaders.join(", ")}`
          );
          return;
        }

        // Extraire les dates uniques
        const dates = [
          ...new Set(
            rawData.map((row) => row["Date & Heure"].split(" ")[0])
          ),
        ];

        setAvailableDates(dates);
        setCsvData(rawData);
        toast.success("Fichier CSV chargé avec succès !");
      },
      error: (error) => {
        toast.error(`Erreur lors de l'analyse du fichier : ${error.message}`);
      },
    });
  };

  // Génération du fichier Excel (inchangée)
  const generateExcel = async () => {
    if (!csvData || !selectedDate) {
      toast.error("Aucune donnée ou date sélectionnée.");
      return;
    }

    const filteredData = csvData.filter((row) =>
      row["Date & Heure"].startsWith(selectedDate)
    );

    const transformedData = filteredData.map((row) => {
      const values = Object.values(row);
      let nature = "";
      const referenceCommande = values[3] || "";

      if (
        referenceCommande.includes("Parcoursup") ||
        referenceCommande.startsWith("pri_")
      ) {
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
      } else if (
        !referenceCommande.includes("-") &&
        !referenceCommande.includes("_")
      ) {
        nature = "ensa app";
      } else {
        nature = "Inconnu";
      }

      const montant = parseFloat(values[4]) || 0;

      return {
        date: values[2] || "",
        mail: values[12] || "",
        nature: nature,
        montant: montant,
      };
    });

    const groupedData = transformedData.reduce((acc, row) => {
      if (!acc[row.nature]) {
        acc[row.nature] = [];
      }
      acc[row.nature].push([row.date, row.mail, row.montant]);
      return acc;
    }, {});

    const workbook = new ExcelJS.Workbook();

    Object.keys(groupedData).forEach((nature) => {
      const rows = groupedData[nature];
      const total = rows.reduce((sum, row) => sum + (parseFloat(row[2]) || 0), 0);

      const worksheet = workbook.addWorksheet(nature);

      worksheet.mergeCells("A1:C1");
      worksheet.getCell("A1").value = `Transactions pour la nature "${nature}" - Date : ${selectedDate}`;
      worksheet.getCell("A1").font = { bold: true, size: 14 };
      worksheet.getCell("A1").alignment = { horizontal: "center" };

      worksheet.addRow(["Date de transaction", "Mail", "Montant"]);
      const headerRow = worksheet.getRow(2);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFF00" },
      };

      rows.forEach((row) => worksheet.addRow(row));

      worksheet.addRow(["", "Total", total.toFixed(2)]);
      const totalRow = worksheet.getRow(worksheet.rowCount);
      totalRow.font = { bold: true };

      worksheet.columns = [
        { key: "date", width: 30 },
        { key: "mail", width: 30 },
        { key: "montant", width: 30 },
      ];
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, `Transactions_${selectedDate}.xlsx`);
    toast.success("Fichier Excel généré avec succès !");
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
      <ToastContainer
        position="bottom-left"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}

export default DataProcessor;
