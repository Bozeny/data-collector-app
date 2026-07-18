// Une seule variable globale propre pour votre base locale unifiée
let dbLocal;

// Déclenchement automatique au chargement de la page
document.addEventListener('DOMContentLoaded', async () => {
    // 1. On lance la base de données en priorité absolue
    initialiserBaseDonnees();
    
    // 2. On demande la persistance de manière sécurisée (sans bloquer Android)
    try {
        if (navigator.storage && navigator.storage.persist) {
            await navigator.storage.persist();
        }
    } catch (e) {
        console.log("Persistance non supportée ou refusée au démarrage.");
    }
    
    // 3. Écouteur sur le formulaire pour capter le clic sur le bouton
    const form = document.getElementById('collectorForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
});

// Initialisation unique de la base de données locale (IndexedDB)
function initialiserBaseDonnees() {
    const request = indexedDB.open('DataCollectorOfflineDB', 1);

    request.onupgradeneeded = function(event) {
        dbLocal = event.target.result;
        if (!dbLocal.objectStoreNames.contains('offline_data')) {
            // Notre table unique pour le PC, le Téléphone et l'export Access
            dbLocal.createObjectStore('offline_data', { keyPath: 'id', autoIncrement: true });
        }
    };

    request.onsuccess = function(event) {
        dbLocal = event.target.result;
        console.log("Base de données locale unifiée prête !");
        afficherCompteur();
        
        // Dès que l'application s'ouvre, si on a du réseau, on synchronise les anciens restes
        if (navigator.onLine) {
            synchroniserDonnees();
        }
    };

    request.onerror = function(event) {
        alert("Erreur critique de stockage : " + event.target.errorCode);
    };
}

// Gestion de la soumission du formulaire
function handleFormSubmit(event) {
    event.preventDefault(); // Bloque le rechargement de la page

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
        field1: f1.value.trim(), 
        field2: f2.value.trim(), 
        field3: f3.value.trim(), 
        dateSaisie: dateLocaleAccess,
        synced: false // Ajouté ici : permet de savoir si la ligne est envoyée au serveur Vercel
    };

    if (!dbLocal) {
        alert("Le stockage local n'est pas encore prêt. Réessayez dans une seconde.");
        return;
    }

    // Écriture sécurisée dans l'appareil (Ordinateur ou Smartphone)
    const transaction = dbLocal.transaction(['offline_data'], 'readwrite');
    const store = transaction.objectStore('offline_data');
    const addRequest = store.add(newData);

    addRequest.onsuccess = function() {
        // Status Visuel
        const statusDiv = document.getElementById('messageStatus');
        if (statusDiv) {
            statusDiv.innerHTML = "✅ Réclamation enregistrée localement !";
            statusDiv.style.color = "green";
        }

        // Nettoyage du formulaire
        f1.value = "";
        f2.value = "";
        f3.value = "";

        // Mise à jour du compteur à l'écran
        afficherCompteur();

        // NOUVEAUTÉ : Si l'appareil a du réseau tout de suite, on lance la synchronisation vers Vercel
        if (navigator.onLine) {
            synchroniserDonnees();
        }
    };

    addRequest.onerror = function() {
        alert("Échec de l'enregistrement automatique.");
    };
}

// Fonction de Synchronisation automatique vers votre serveur Vercel/Node.js
function synchroniserDonnees() {
    if (!dbLocal || !navigator.onLine) return;

    const transaction = dbLocal.transaction(['offline_data'], 'readonly');
    const store = transaction.objectStore('offline_data');
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = function() {
        const toutesLesDonnees = getAllRequest.result;
        
        // On ne filtre que ce qui n'a pas encore été envoyé au serveur
        const aSynchroniser = toutesLesDonnees.filter(item => !item.synced);

        if (aSynchroniser.length === 0) return; // Rien à envoyer !

        console.log(`PWA : Tentative d'envoi de ${aSynchroniser.length} lignes vers le serveur...`);

        // Envoi à votre API sur Vercel
        fetch('/api/collecte', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(aSynchroniser)
        })
        .then(response => {
            if (response.ok) {
                // Si le serveur dit OK, on marque ces lignes comme synchronisées localement
                const updateTransaction = dbLocal.transaction(['offline_data'], 'readwrite');
                const updateStore = updateTransaction.objectStore('offline_data');
                
                aSynchroniser.forEach(item => {
                    item.synced = true;
                    updateStore.put(item); // Met à jour l'élément sans détruire l'export Access
                });
                console.log("PWA : Synchronisation serveur réussie !");
            }
        })
        .catch(err => console.error("Réseau instable, envoi reporté :", err));
    };
}

// Écouter si le réseau revient pendant que l'utilisateur utilise l'application
window.addEventListener('online', synchroniserDonnees);

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

// Export inchangé pour Microsoft Access (Garde toutes les données)
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

// Enregistrement du Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker enregistré avec succès !', reg.scope))
            .catch(err => console.error('Échec de l\'enregistrement du Service Worker :', err));
    });
}