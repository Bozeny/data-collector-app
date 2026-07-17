let dbLocal;

// Déclenchement automatique au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    demanderAutorisationStockage();
    initialiserBaseDonnees();
    
    // Écouteur sur le formulaire pour capter le clic sur le bouton
    const form = document.getElementById('collectorForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
});

// Fenêtre d'autorisation unique pour le stockage permanent (PC et Smartphone)
async function demanderAutorisationStockage() {
    if (navigator.storage && navigator.storage.persist) {
        const estDejaPersistant = await navigator.storage.persisted();
        if (!estDejaPersistant) {
            // Cette ligne provoque l'apparition de la demande d'autorisation sur l'appareil
            const accorde = await navigator.storage.persist();
            if (accorde) {
                console.log("Stockage permanent accordé et sécurisé.");
            } else {
                console.log("Stockage temporaire activé (attention aux nettoyages système).");
            }
        }
    }
}

// Initialisation de la base de données locale
function initialiserBaseDonnees() {
    const request = indexedDB.open('DataCollectorOfflineDB', 1);

    request.onupgradeneeded = function(event) {
        dbLocal = event.target.result;
        dbLocal.createObjectStore('offline_data', { keyPath: 'id', autoIncrement: true });
    };

    request.onsuccess = function(event) {
        dbLocal = event.target.result;
        afficherCompteur();
    };

    request.onerror = function(event) {
        alert("Erreur critique de stockage : " + event.target.errorCode);
    };
}

// Gestion de la soumission du formulaire
function handleFormSubmit(event) {
    event.preventDefault(); // Bloque le rechargement de la page pour ne pas perdre la mémoire

    const f1 = document.getElementById('field1');
    const f2 = document.getElementById('field2');
    const f3 = document.getElementById('field3');

    if (!f1.value.trim() || !f2.value.trim()) {
        alert('Les champs 1 et 2 sont obligatoires.');
        return;
    }

    const newData = {
        field1: f1.value.trim(),
        field2: f2.value.trim(),
        field3: f3.value.trim(),
        dateSaisie: new Date().toISOString()
    };

    // Écriture sécurisée dans l'appareil
    const transaction = dbLocal.transaction(['offline_data'], 'readwrite');
    const store = transaction.objectStore('offline_data');
    const addRequest = store.add(newData);

    addRequest.onsuccess = function() {
        // 1. Message de succès
        const statusDiv = document.getElementById('messageStatus');
        statusDiv.innerHTML = "✅ Données stockées automatiquement !";
        statusDiv.style.color = "green";

        // 2. RENOUVELLEMENT DES CASES (On vide les champs pour la saisie suivante)
        f1.value = "";
        f2.value = "";
        f3.value = "";

        // 3. Mise à jour du compteur visuel
        afficherCompteur();
    };

    addRequest.onerror = function() {
        alert("Échec de l'enregistrement automatique.");
    };
}

function afficherCompteur() {
    if (!dbLocal) return;
    const transaction = dbLocal.transaction(['offline_data'], 'readonly');
    const store = transaction.objectStore('offline_data');
    const countRequest = store.count();

    countRequest.onsuccess = function() {
        document.getElementById('counterLocal').innerText = countRequest.result;
    };
}

// Export de la base locale vers un fichier Microsoft Access
function exporterPourAccess() {
    const transaction = dbLocal.transaction(['offline_data'], 'readonly');
    const store = transaction.objectStore('offline_data');
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = function() {
        const rows = getAllRequest.result;
        if (rows.length === 0) {
            alert("Aucune donnée enregistrée à extraire.");
            return;
        }

        let csvContent = '\uFEFF'; 
        csvContent += 'ID;Champ1;Champ2;Champ3;DateSaisie\n';
        
        rows.forEach(row => {
            csvContent += `${row.id};"${row.field1}";"${row.field2}";"${row.field3}";"${row.dateSaisie}"\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", "collecte_terrain_access.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
}
