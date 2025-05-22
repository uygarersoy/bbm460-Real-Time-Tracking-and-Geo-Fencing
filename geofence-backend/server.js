const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const dotenv = require("dotenv");

const app = express();
app.use(cors());
app.use(express.json());
dotenv.config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) console.error("MySQL connection error:", err);
  else console.log("Connected to MySQL.");
});

// GET all geo-fences
app.get("/fences", (req, res) => {
  db.query("SELECT * FROM geo_fences", (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

// ADD new fence
app.post("/fences", (req, res) => {
  const { name, latitude, longitude, radius } = req.body;
  const sql = "INSERT INTO geo_fences (name, latitude, longitude, radius) VALUES (?, ?, ?, ?)";
  db.query(sql, [name, latitude, longitude, radius], (err, result) => {
    if (err) return res.status(500).send(err);
    res.json({ id: result.insertId, name, latitude, longitude, radius });
  });
});

// DELETE a fence
app.delete("/fences/:id", (req, res) => {
  const sql = "DELETE FROM geo_fences WHERE id = ?";
  db.query(sql, [req.params.id], (err) => {
    if (err) return res.status(500).send(err);
    res.sendStatus(204);
  });
});

app.listen(4000, () => {
  console.log("Server running on port 4000");
});