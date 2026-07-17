// 1. Initialisation de la base de données locale du téléphone (IndexedDB)
let dbLocal;
const request = indexedDB.open('DataCollectorOfflineDB', 1);

request.onupgradeneeded = function(event) {
    dbLocal = event.target.result;
    // Crée une table locale appelée "offline_data" avec un identifiant automatique
    dbLocal.createObjectStore('offline_data', { keyPath: 'id', autoIncrement: true });
};

request.onsuccess = function(event) {
    dbLocal = event.target.result;
    afficherCompteur(); // Met à jour le nombre de formulaires stockés
};

request.onerror = function(event) {
    console.error("Erreur d'initialisation de la base locale:", event.target.errorCode);
};

// 2. Fonction principale appelée lors de la validation du formulaire
async function submitData() {
    const field1 = document.getElementById('field1').value.trim();
    const field2 = document.getElementById('field2').value.trim();
    const field3 = document.getElementById('field3').value.trim();

    if (!field1 || !field2) {
        alert('Les champs 1 et 2 sont obligatoires');
        return;
    }

    // Création de l'objet de données avec la date/heure de saisie
    const newData = {
        field1: field1,
        field2: field2,
        field3: field3,
        dateSaisie: new Date().toISOString()
    };

    // SAUVEGARDE SÉCURISÉE ET IMMÉDIATE DANS LE TÉLÉPHONE (Hors-ligne)
    const transaction = dbLocal.transaction(['offline_data'], 'readwrite');
    const store = transaction.objectStore('offline_data');
    const addRequest = store.add(newData);

    addRequest.onsuccess = function() {
        // Message de succès visuel local
        const statusDiv = document.getElementById('messageStatus');
        statusDiv.innerHTML = "✅ Données enregistrées de manière sécurisée sur l'appareil !";
        statusDiv.style.color = "green";

        // Réinitialiser les cases vides pour la saisie suivante
        document.getElementById('collectorForm').reset();
        afficherCompteur();
    };

    addRequest.onerror = function() {
        alert("Erreur critique : Impossible de sécuriser les données sur l'appareil.");
    };
}

// 3. Fonction pour compter les formulaires en attente
function afficherCompteur() {
    if (!dbLocal) return;
    const transaction = dbLocal.transaction(['offline_data'], 'readonly');
    const store = transaction.objectStore('offline_data');
    const countRequest = store.count();

    countRequest.onsuccess = function() {
        document.getElementById('counterLocal').innerText = countRequest.result;
    };
}

// 4. FONCTION POUR EXPORTER DIRECTEMENT POUR ACCESS (Depuis le téléphone)
function exporterPourAccess() {
    const transaction = dbLocal.transaction(['offline_data'], 'readonly');
    const store = transaction.objectStore('offline_data');
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = function() {
        const rows = getAllRequest.result;
        if (rows.length === 0) {
            alert("Aucune donnée à exporter.");
            return;
        }

        // Création du fichier CSV lisible par Microsoft Access
        let csvContent = '\uFEFF'; // Permet de gérer les accents correctement dans Excel/Access
        csvContent += 'ID;Champ1;Champ2;Champ3;DateSaisie\n';
        
        rows.forEach(row => {
            csvContent += `${row.id};"${row.field1}";"${row.field2}";"${row.field3}";"${row.dateSaisie}"\n`;
        });

        // Déclenchement du téléchargement du fichier sur le téléphone ou PC
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", "collecte_terrain_access.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
}
