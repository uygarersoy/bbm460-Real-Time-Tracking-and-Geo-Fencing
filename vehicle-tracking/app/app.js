import React, { useEffect, useState } from "react";
import { View, Text, Alert, StyleSheet } from "react-native";
import MapView, { Marker, Circle } from "react-native-maps";
import * as Location from "expo-location";
import { connectMQTT, publishLocation } from "./mqttService";
import { startGeoFenceListener } from "./geoFenceService";

export default function App() {
  const [location, setLocation] = useState(null);
  const [geoFences, setGeoFences] = useState([]); // State to store geo-fences

  useEffect(() => {
    // Connect to MQTT
    connectMQTT();
    
    // Start geo-fence listener and provide callback for geo-fence updates
    startGeoFenceListener((fences) => {
      console.log("Received geo-fences in App.js:", fences);
      setGeoFences(fences);
    });

    // Get real-time location updates
    const getLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Allow location access to track vehicle.");
        return;
      }

      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 5 },
        (loc) => {
          const { latitude, longitude } = loc.coords;
          setLocation({ latitude, longitude });
          publishLocation(latitude, longitude);
        }
      );
      
      // Return cleanup function to unsubscribe when component unmounts
      return () => {
        subscription.remove();
      };
    };

    getLocation();
  }, []); 

  useEffect(() => {
    console.log("GeoFences state updated:", geoFences);
  }, [geoFences]);

  return (
    <View style={styles.container}>
      {location ? (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          {/* Show current location */}
          <Marker coordinate={location} title="Your Location" />

          {/* Render multiple geo-fences */}
          {geoFences && geoFences.length > 0 && geoFences.map((fence, index) => (
            <Circle
              key={index}
              center={{ latitude: fence.latitude, longitude: fence.longitude }}
              radius={fence.radius}
              strokeColor="rgba(255,0,0,0.5)"
              fillColor="rgba(255,0,0,0.2)"
            />
          ))}
        </MapView>
      ) : (
        <Text>Loading Map...</Text>
      )}
      <View style={styles.fenceCounter}>
        <Text style={styles.fenceText}>
          {geoFences ? `Active Geo-fences: ${geoFences.length}` : "No geo-fences"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  map: { 
    width: "100%", 
    height: "100%" 
  },
  fenceCounter: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 10,
    borderRadius: 5
  },
  fenceText: {
    fontWeight: 'bold'
  }
});