// Une seule variable globale propre pour votre base locale
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
            const accorde = await navigator.storage.persist();
            if (accorde) {
                console.log("Stockage permanent accordé et sécurisé.");
            } else {
                console.log("Stockage temporaire activé (attention aux nettoyages système).");
            }
        }
    }
}

// Initialisation unique de la base de données locale (IndexedDB)
function initialiserBaseDonnees() {
    // On garde votre base d'origine
    const request = indexedDB.open('DataCollectorOfflineDB', 1);

    request.onupgradeneeded = function(event) {
        dbLocal = event.target.result;
        if (!dbLocal.objectStoreNames.contains('offline_data')) {
            dbLocal.createObjectStore('offline_data', { keyPath: 'id', autoIncrement: true });
        }
    };

    request.onsuccess = function(event) {
        dbLocal = event.target.result;
        console.log("Base de données locale 'DataCollectorOfflineDB' prête !");
        afficherCompteur();
    };

    request.onerror = function(event) {
        alert("Erreur critique de stockage : " + event.target.errorCode);
    };
}

// Gestion de la soumission du formulaire
function handleFormSubmit(event) {
    event.preventDefault(); // Bloque le rechargement de la page

    // Correspondance avec vos ID HTML
    const f1 = document.getElementById('field1'); // Catégorie de Plainte
    const f2 = document.getElementById('field2'); // Description détaillée
    const f3 = document.getElementById('field3'); // ID_PAP (Optionnel)

    // Vérification : La catégorie et la description sont obligatoires
    if (!f1.value.trim() || !f2.value.trim()) {
        alert('La catégorie et la description de la plainte sont obligatoires.');
        return;
    }

    // Formatage de la date locale au format attendu par Access (AAAA-MM-JJ HH:MM:SS)
    const dateLocaleAccess = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const newData = {
        field1: f1.value.trim(), // Stocké localement mais sera exporté en Categorie_Plainte
        field2: f2.value.trim(), // Stocké localement mais sera exporté en Description_Plainte
        field3: f3.value.trim(), // Stocké localement mais sera exporté en ID_PAP
        dateSaisie: dateLocaleAccess
    };

    if (!dbLocal) {
        alert("Le stockage local n'est pas encore prêt. Réessayez dans une seconde.");
        return;
    }

    // Écriture sécurisée dans l'appareil (Tablette/Téléphone) via votre table d'origine
    const transaction = dbLocal.transaction(['offline_data'], 'readwrite');
    const store = transaction.objectStore('offline_data');
    const addRequest = store.add(newData);

    addRequest.onsuccess = function() {
        // 1. Message de succès
        const statusDiv = document.getElementById('messageStatus');
        if (statusDiv) {
            statusDiv.innerHTML = "✅ Réclamation enregistrée localement !";
            statusDiv.style.color = "green";
        }

        // 2. RENOUVELLEMENT DES CASES
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
        const counterElem = document.getElementById('counterLocal');
        if (counterElem) {
            counterElem.innerText = countRequest.result;
        }
    };
}

// Export de la base locale vers un fichier STRICTEMENT compatible avec votre table Access T_Plaintes_MGP
function exporterPourAccess() {
    if (!dbLocal) return;
    const transaction = dbLocal.transaction(['offline_data'], 'readonly');
    const store = transaction.objectStore('offline_data');
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = function() {
        const rows = getAllRequest.result;
        if (rows.length === 0) {
            alert("Aucune donnée enregistrée à extraire.");
            return;
        }

        // En-tête utilisant EXACTEMENT les noms des colonnes SQL de la table T_Plaintes_MGP d'Access
        let csvContent = '\uFEFF'; 
        csvContent += 'Date_Reception;Categorie_Plainte;Description_Plainte;ID_PAP\n';
        
        rows.forEach(row => {
            let descriptionNettoyee = row.field2.replace(/"/g, '""');
            let idPapVal = row.field3 ? row.field3 : "";
            csvContent += `"${row.dateSaisie}";"${row.field1}";"${descriptionNettoyee}";${idPapVal}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", "Plaintes_MGP_Pour_Access.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
}

// Enregistrement du Service Worker pour le mode 100% hors-ligne
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker enregistré avec succès !', reg.scope))
            .catch(err => console.error('Échec de l\'enregistrement du Service Worker :', err));
    });
}