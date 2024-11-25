import React, { useState } from "react";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import { saveAs } from "file-saver";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./DataProcessor.css"; 

function DataProcessor() {
  const [csvData, setCsvData] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Colonnes attendues dans le CSV
  const expectedHeaders = ["Date & Heure", "Email porteur", "Montant"];

  // Fonction pour normaliser les chaînes (remplacer les accents et caractères spéciaux)
  const normalizeString = (str) => {
    if (!str) return str; // Si la valeur est vide, retourner tel quel
    return str
      .normalize("NFD") // Décomposer les caractères accentués
      .replace(/[\u0300-\u036f]/g, "") // Supprimer les diacritiques
      .replace(/[\u2019\u2018]/g, "'") // Remplacer les guillemets simples typographiques
      .replace(/[^\x20-\x7E]/g, ""); // Supprimer les caractères non ASCII
  };

  // Lecture et validation du fichier CSV
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
        const rawData = results.data.map((row) => {
          // Normaliser toutes les colonnes de la ligne
          const normalizedRow = {};
          Object.keys(row).forEach((key) => {
            normalizedRow[normalizeString(key)] = normalizeString(row[key]);
          });
          return normalizedRow;
        });
  
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
  
        const dates = [
          ...new Set(
            rawData.map((row) => row["Date & Heure"].split(" ")[0])
          ),
        ];
  
        setCsvData(rawData);
        generateAvailableDates(); // Générer les dates disponibles en fonction de la plage de dates
        toast.success("Fichier CSV chargé avec succès !");
      },
      error: (error) => {
        toast.error(`Erreur lors de l'analyse du fichier : ${error.message}`);
      },
    });
  };

  // Génère les dates disponibles en fonction de la plage de dates
  const generateAvailableDates = () => {
    if (!startDate || !endDate) return;
  
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];
  
    for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
      const formattedDate = date.toISOString().split("T")[0];
      dates.push(formattedDate);
    }
  
    setAvailableDates(dates);
  };

  // Génération du fichier Excel
  const generateExcel = async () => {
    if (!csvData || !selectedDate) {
      toast.error("Aucune donnée ou date sélectionnée.");
      return;
    }
  
    // Filtrage des données : exclure les lignes avec "Numéro remise banque" = '-'
    // et inclure uniquement celles avec "Statut de la transaction" = "Accepté"
    const filteredData = csvData.filter((row) => {
      const numeroRemiseBanque = row["Numéro remise banque"] || "";
      const dateHeure = row["Date & Heure"] || "";
      const statutTransaction = row["Statut de la transaction"] || "";
  
      return (
        numeroRemiseBanque !== "-" && // Exclure si "Numéro remise banque" est '-'
        dateHeure.startsWith(selectedDate) && // Inclure uniquement les dates sélectionnées
        statutTransaction.toLowerCase() === "accepte" // Inclure uniquement les lignes avec "Accepté"
      );
    });
  
    const transformedData = filteredData.map((row) => {
      const values = Object.values(row);
      let nature = "";
      const referenceCommande = values[3] || ""; // Colonne D (Référence commande)
      const statutTransaction = row["Statut de la transaction"] || ""; // Colonne H
      const email = row["Email porteur"] || ""; // Colonne M (Email porteur)
      let prenom = "";
      let nom = "";
  
      // Définir la nature en fonction de la référence commande
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
      } else if (!referenceCommande.includes("-") && !referenceCommande.includes("_")) {
        nature = "ensa app";
      } else {
        nature = "Inconnu";
      }
  
      // Extraire prénom et nom si l'adresse e-mail contient "nantes.archi"
      if (email.includes("nantes.archi")) {
        const [prenomNom] = email.split("@"); // Extraire la partie avant '@'
        const [prenomPart, nomPart] = prenomNom.split("."); // Diviser par '.'
  
        prenom = prenomPart || ""; // Assigner le prénom
        nom = nomPart || ""; // Assigner le nom
      }
  
      const montant = parseFloat(values[4]) || 0; // Colonne E (Montant)
  
      return {
        date: values[2] || "", // Colonne C (Date & Heure)
        mail: email,
        nature: nature,
        montant: montant,
        statutTransaction: statutTransaction, // Inclure le statut de la transaction
        prenom: prenom,
        nom: nom,
      };
    });
  
    // Trier les données par nom de famille (ordre alphabétique)
    transformedData.sort((a, b) => {
      const nameA = a.nom.toLowerCase();
      const nameB = b.nom.toLowerCase();
  
      if (nameA < nameB) return -1; // Si `nameA` vient avant `nameB`
      if (nameA > nameB) return 1; // Si `nameA` vient après `nameB`
      return 0; // Si les noms sont identiques
    });
  
    const groupedData = transformedData.reduce((acc, row) => {
      if (!acc[row.nature]) {
        acc[row.nature] = [];
      }
      acc[row.nature].push([
        row.date,
        row.mail,
        row.prenom, // Inclure le prénom
        row.nom, // Inclure le nom
        row.montant,
        row.statutTransaction, // Inclure le statut
      ]);
      return acc;
    }, {});
  
    const workbook = new ExcelJS.Workbook();
  
    if (transformedData.length === 0) {
      // Générer un fichier Excel vide avec les en-têtes
      const worksheet = workbook.addWorksheet("Données");
      worksheet.addRow([
        "Date de transaction",
        "Mail",
        "Prénom",
        "Nom",
        "Montant",
        "Statut de la transaction",
      ]);
    } else {
      Object.keys(groupedData).forEach((nature) => {
        const rows = groupedData[nature];
        const total = rows.reduce((sum, row) => sum + (parseFloat(row[4]) || 0), 0);
  
        const worksheet = workbook.addWorksheet(nature);
        worksheet.mergeCells("A1:F1");
        worksheet.getCell("A1").value = `Transactions pour la nature "${nature}" - Date : ${selectedDate}`;
        worksheet.getCell("A1").font = { bold: true, size: 14 };
        worksheet.getCell("A1").alignment = { horizontal: "center" };
  
        worksheet.addRow([
          "Date de transaction",
          "Mail",
          "Prénom",
          "Nom",
          "Montant",
          "Statut de la transaction", // Ajouter le statut comme en-tête
        ]);
        const headerRow = worksheet.getRow(2);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFF00" },
        };
  
        rows.forEach((row) => worksheet.addRow(row));
        worksheet.addRow(["", "", "", "Total", total.toFixed(2)]);
        const totalRow = worksheet.getRow(worksheet.rowCount);
        totalRow.font = { bold: true };
  
        worksheet.columns = [
          { key: "date", width: 30 },
          { key: "mail", width: 30 },
          { key: "prenom", width: 20 }, // Ajuster la largeur pour le prénom
          { key: "nom", width: 20 }, // Ajuster la largeur pour le nom
          { key: "montant", width: 15 },
          { key: "statutTransaction", width: 25 }, // Ajuster la largeur pour le statut
        ];
      });
    }
  
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, `Transactions_${selectedDate}.xlsx`);
  
    if (transformedData.length === 0) {
      toast.info("Aucune donnée trouvée pour la date sélectionnée. Un fichier Excel vide a été généré.");
    } else {
      toast.success("Fichier Excel généré avec succès !");
    }
  };
  

  return (
    <div className="data-processor">
      <header style={{ background: "#51E36E", color: "black" }}>
        <h1>Traitement des fichiers CSV</h1>
      </header>
      <main className="content">
        <div className="card">
          <h2>Importer et traiter vos fichiers</h2>
          <div className="instructions">
          <p>
            <strong>Veuillez sélectionner une date de début et de fin.</strong> Ces dates devront correspondre à la plage de dates présente sur l'Excel que vous allez importer. <br />
            Importez l'Excel qui provient de <strong>Paybox</strong>, en format CSV. <br />
            Vous pourrez ensuite sélectionner une date parmi celles disponibles pour générer un fichier Excel filtré.
          </p>
        </div>
          <div className="date-range-selector">
            <label htmlFor="start-date">Date de début :</label>
            <input
              type="date"
              id="start-date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                generateAvailableDates();
              }}
            />

            <label htmlFor="end-date">Date de fin :</label>
            <input
              type="date"
              id="end-date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                generateAvailableDates();
              }}
            />
          </div>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="file-input"
          />
          {availableDates.length > 0 && (
            <div className="date-selector">
              <label htmlFor="date-select">Sélectionnez une date :</label>
              <select
                id="date-select"
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
            </div>
          )}
          {csvData && selectedDate && (
            <button
              className="generate-btn"
              onClick={generateExcel}
              style={{ background: "#51E36E", color: "black" }}
            >
              Exporter les données filtrées
            </button>
          )}
        </div>
      </main>
      <footer>
        <p>&copy; ENSA Nantes</p>
      </footer>
      <ToastContainer />
    </div>
  );
}

export default DataProcessor;