const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// SQLite Database Setup (Utilisation de la mémoire vive pour Vercel)
const db = new sqlite3.Database(':memory:', (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS collected_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      field1 TEXT NOT NULL,
      field2 TEXT NOT NULL,
      field3 TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced BOOLEAN DEFAULT 0
    )
  `);
}

// Routes
app.get('/', (req, res) => {
  const pathsToTry = [
    path.join(__dirname, 'public', 'index.html'),
    path.join(__dirname, 'index.html'),
    path.join(process.cwd(), 'public', 'index.html'),
    path.join(process.cwd(), 'index.html')
  ];

  for (const p of pathsToTry) {
    try {
      if (require('fs').existsSync(p)) {
        return res.sendFile(p);
      }
    } catch (e) {}
  }
  res.status(404).send("Impossible de localiser index.html sur le serveur.");
});

// API: Collect Data
app.post('/api/collect-data', (req, res) => {
  const { field1, field2, field3 } = req.body;

  if (!field1 || !field2) {
    return res.status(400).json({ success: false, message: 'Field1 and Field2 are required' });
  }

  db.run(
    'INSERT INTO collected_data (field1, field2, field3) VALUES (?, ?, ?)',
    [field1, field2, field3 || ''],
    function(err) {
      if (err) {
        console.error('Error inserting data:', err);
        return res.status(500).json({ success: false, message: 'Error saving data' });
      }
      res.json({ success: true, message: 'Data collected successfully', id: this.lastID });
    }
  );
});

// API: Get All Data
app.get('/api/data', (req, res) => {
  db.all('SELECT * FROM collected_data ORDER BY timestamp DESC', (err, rows) => {
    if (err) {
      console.error('Error fetching data:', err);
      return res.status(500).json({ success: false, message: 'Error fetching data' });
    }
    res.json({ success: true, data: rows });
  });
});

// API: Export Data (for Access)
app.get('/api/export-csv', (req, res) => {
  db.all('SELECT field1, field2, field3, timestamp FROM collected_data ORDER BY timestamp DESC', (err, rows) => {
    if (err) {
      console.error('Error exporting data:', err);
      return res.status(500).json({ success: false, message: 'Error exporting data' });
    }

    let csv = 'Field1,Field2,Field3,Timestamp\n';
    rows.forEach(row => {
      csv += `"${row.field1}","${row.field2}","${row.field3}","${row.timestamp}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=data-export.csv');
    res.send(csv);
  });
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

module.exports = app;