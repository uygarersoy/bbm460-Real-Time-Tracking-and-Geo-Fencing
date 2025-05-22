import React, { useEffect, useState } from "react";
import { Client, Message } from "paho-mqtt";
import axios from "axios";
import "./AdminDashboard.css";

const MQTT_BROKER = process.env.REACT_APP_MQTT_BROKER;
const MQTT_PORT = process.env.REACT_APP_MQTT_PORT;
const MQTT_TOPIC = process.env.REACT_APP_MQTT_TOPIC;
const MQTT_USERNAME = process.env.REACT_APP_MQTT_USERNAME;
const MQTT_PASSWORD = process.env.REACT_APP_MQTT_PASSWORD;
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const client = new Client(
  `wss://${MQTT_BROKER}:${MQTT_PORT}/mqtt`,
  `admin-${Math.random().toString(16).slice(2, 8)}`
);

client.connect({
  onSuccess: () => console.log("Connected to HiveMQ!"),
  onFailure: (err) => console.error("MQTT Admin Connection Failed", err),
  userName: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  useSSL: true,
});

export default function AdminDashboard() {
  const [fences, setFences] = useState([]);
  const [form, setForm] = useState({ name: "", latitude: "", longitude: "", radius: "" });

  const fetchFences = async () => {
    const res = await axios.get(`${API_BASE_URL}/fences`);
    setFences(res.data);
  };

  useEffect(() => {
    fetchFences();
  }, []);

  const publishFences = () => {
    if (client.isConnected()) {
      const msg = new Message(JSON.stringify(fences));
      msg.destinationName = MQTT_TOPIC;
      client.send(msg);
      alert("Geo-fence list published!");
    } else {
      alert("MQTT not connected!");
    }
  };

  const addFence = async () => {
    const payload = {
      name: form.name,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      radius: parseFloat(form.radius),
    };

    try {
      const res = await axios.post(`${API_BASE_URL}/fences`, payload);
      setFences([...fences, res.data]);
      setForm({ name: "", latitude: "", longitude: "", radius: "" });
    } catch (err) {
      alert("Error adding geo-fence.");
    }
  };

  const deleteFence = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/fences/${id}`);
      const updatedFences = fences.filter((f) => f.id !== id);
      setFences(updatedFences);
  
      // ✅ Re-publish updated list over MQTT
      if (client.isConnected()) {
        const msg = new Message(JSON.stringify(updatedFences));
        msg.destinationName = MQTT_TOPIC;
        client.send(msg);
      } else {
        alert("MQTT not connected!");
      }
    } catch (err) {
      console.error("Failed to delete geo-fence:", err);
      alert("Failed to delete geo-fence.");
    }
  };
  

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <h2 className="dashboard-title">🛰️ Geo-Fence Admin Panel</h2>

        <div className="form-grid">
          {["Name", "Latitude", "Longitude", "Radius"].map((field, idx) => (
            <div key={idx} className="form-group">
              <label>{field}</label>
              <input
                type="text"
                value={form[field.toLowerCase()]}
                placeholder={`Enter ${field}`}
                onChange={(e) => setForm({ ...form, [field.toLowerCase()]: e.target.value })}
              />
            </div>
          ))}
        </div>

        <button className="submit-button" onClick={addFence}>➕ Add Geo-Fence</button>
        <button className="submit-button" onClick={publishFences} style={{ marginLeft: "10px", background: "#28a745" }}>
          📡 Publish Fences
        </button>

        <div className="fence-list">
          <h3>📍 Defined Fences</h3>
          <ul>
            {fences.length > 0 ? (
              fences.map((f) => (
                <li key={f.id}>
                  <strong>{f.name}</strong>: ({f.latitude}, {f.longitude}) – {f.radius}m
                  <button className="delete-btn" onClick={() => deleteFence(f.id)}>🗑️</button>
                </li>
              ))
            ) : (
              <li className="empty">No fences defined yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
