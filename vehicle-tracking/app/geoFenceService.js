import { Client } from "paho-mqtt";
import * as Notifications from "expo-notifications";
import { Alert } from "react-native";
import {
  MQTT_BROKER,
  MQTT_PORT,
  MQTT_USERNAME,
  MQTT_PASSWORD,
  LOCATION_TOPIC,
  FENCE_UPDATE_TOPIC
} from "@env";

const sendNotification = async (title, body) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
      },
      trigger: null, // Show immediately
    });
  };

// Function to calculate distance between two coordinates using Haversine formula
const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Radius of the Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};

// Track whether the user was inside the geo-fence
let geoFences = [];
let fenceStatus = {};
let geoFenceCallback = null;

// Initialize MQTT client
const client = new Client(
  `wss://${MQTT_BROKER}:${MQTT_PORT}/mqtt`,
  `client-${Math.random().toString(16).substr(2, 8)}`
);

client.onConnectionLost = (response) => {
  console.error("Connection lost:", response.errorMessage);
};

client.onMessageArrived = (message) => {
  try {
    if (message.destinationName === FENCE_UPDATE_TOPIC) {
      const parsedFences = JSON.parse(message.payloadString);
      geoFences = parsedFences;
      console.log("Geo-fence list updated from admin:", geoFences);
      
      // Call the callback to update the state in App.js
      if (geoFenceCallback && typeof geoFenceCallback === 'function') {
        geoFenceCallback(geoFences);
      }
      return;
    }

    if (message.destinationName === LOCATION_TOPIC) {
      const { latitude, longitude } = JSON.parse(message.payloadString);
      console.log(`Received location: ${latitude}, ${longitude}`);

      geoFences.forEach((fence) => {
        const distance = getDistanceFromLatLonInMeters(
          latitude,
          longitude,
          fence.latitude,
          fence.longitude
        );

        const isInside = distance <= fence.radius;
        const wasInside = fenceStatus[fence.name] || false;

        if (isInside && !wasInside) {
          Alert.alert("Geo-Fence Alert", `Entered ${fence.name}`);
          sendNotification("Geo-Fence Entry", `You have entered ${fence.name}`);
        } else if (!isInside && wasInside) {
          Alert.alert("Geo-Fence Alert", `Exited ${fence.name}`);
          sendNotification("Geo-Fence Exit", `You have exited ${fence.name}`);
        }

        fenceStatus[fence.name] = isInside;
      });
    }
  } catch (err) {
    console.error("Error handling MQTT message:", err);
  }
};

export const startGeoFenceListener = (callback) => {
  if (typeof callback === 'function') {
    geoFenceCallback = callback;
  }
  client.connect({
    onSuccess: () => {
      console.log("Geo-Fence Client connected!");
      client.subscribe(LOCATION_TOPIC);
      client.subscribe(FENCE_UPDATE_TOPIC);
      if (geoFences.length > 0 && geoFenceCallback) {
        geoFenceCallback(geoFences);
      }
    },
    onFailure: (err) => {
      console.error("Geo-Fence MQTT Connection Failed:", err);
    },
    userName: MQTT_USERNAME,
    password: MQTT_PASSWORD,
    useSSL: true,
  });
};

export default client;