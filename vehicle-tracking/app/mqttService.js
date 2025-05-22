import { Client, Message } from "paho-mqtt";
import {
  MQTT_BROKER,
  MQTT_PORT,
  MQTT_USERNAME,
  MQTT_PASSWORD,
  LOCATION_TOPIC
} from "@env";


// Initialize MQTT client
const client = new Client(`wss://${MQTT_BROKER}:${MQTT_PORT}/mqtt`, `client-${Math.random().toString(16).substr(2, 8)}`);

client.onConnectionLost = (response) => {
  console.error("Connection lost:", response.errorMessage);
};

client.onMessageArrived = (message) => {
  console.log(`Received message: ${message.payloadString}`);
};

// Connect and subscribe to topic
export const connectMQTT = () => {
  client.connect({
    onSuccess: () => {
      console.log("Connected to HiveMQ Cloud!");
      client.subscribe(LOCATION_TOPIC);
    },
    onFailure: (error) => console.error("MQTT Connection Failed:", error),
    userName: MQTT_USERNAME,
    password: MQTT_PASSWORD,
    useSSL: true, // Required for secure connection
  });
};

// Publish location data
export const publishLocation = (latitude, longitude) => {
  if (client.isConnected()) {
    const message = new Message(JSON.stringify({ latitude, longitude }));
    message.destinationName = LOCATION_TOPIC;
    client.send(message);
    console.log("Published:", message.payloadString);
  } else {
    console.warn("MQTT client not connected.");
  }
};

export default client;