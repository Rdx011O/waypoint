// backend/src/services/aisStreamService.js
// Connects to AISStream WebSocket (wss://stream.aisstream.io/v0/stream) for live AIS vessel telemetry

const WebSocket = require("ws");

let liveVessels = new Map();
let wsClient = null;
let isConnected = false;
let clients = new Set(); // SSE clients

// High-fidelity baseline vessels along Indian Ocean, Bay of Bengal, Arabian Sea & Malacca Strait
const initialSimulatedVessels = [
  { mmsi: 419001240, imo: 9382170, name: "MV PACIFIC PIONEER", type: "Container Ship", lat: 14.82, lng: 74.35, speed: 16.4, heading: 145, dest: "SINGAPORE", flag: "IN", updatedAt: Date.now() },
  { mmsi: 563048910, imo: 9410052, name: "MV ORIENT MARINER", type: "Bulk Carrier", lat: 9.85, lng: 84.12, speed: 13.8, heading: 98, dest: "SINGAPORE", flag: "SG", updatedAt: Date.now() },
  { mmsi: 636019820, imo: 9283411, name: "CORAL SEA TRADER", type: "Reefer Vessel", lat: 6.22, lng: 78.50, speed: 15.1, heading: 85, dest: "COLOMBO", flag: "LR", updatedAt: Date.now() },
  { mmsi: 477123900, imo: 9508922, name: "ATLANTIC EXPRESS", type: "Container Ship", lat: 4.80, lng: 94.20, speed: 18.2, heading: 102, dest: "SINGAPORE", flag: "HK", updatedAt: Date.now() },
  { mmsi: 219001880, imo: 9328400, name: "NORDIC HORIZON", type: "Tanker (VLCC)", lat: 17.20, lng: 71.05, speed: 12.0, heading: 190, dest: "ROTTERDAM", flag: "DK", updatedAt: Date.now() },
  { mmsi: 419000892, imo: 9192833, name: "CHENNAI STAR", type: "Container Feeder", lat: 13.15, lng: 80.45, speed: 14.0, heading: 115, dest: "PORT KLANG", flag: "IN", updatedAt: Date.now() },
  { mmsi: 352001402, imo: 9642011, name: "VISAKHA BULKER", type: "Capesize Bulker", lat: 17.55, lng: 83.40, speed: 11.5, heading: 78, dest: "QINGDAO", flag: "PA", updatedAt: Date.now() },
  { mmsi: 419000511, imo: 9221144, name: "PARADIP GLORY", type: "Crude Tanker", lat: 20.10, lng: 86.85, speed: 13.2, heading: 160, dest: "SINGAPORE", flag: "IN", updatedAt: Date.now() }
];

initialSimulatedVessels.forEach(v => liveVessels.set(v.mmsi, v));

function initAISStream() {
  const apiKey = process.env.AISSTREAM_API_KEY;

  if (apiKey && apiKey !== "YOUR_KEY") {
    console.log("[AISStream] Initializing connection with provided API key...");
    try {
      wsClient = new WebSocket("wss://stream.aisstream.io/v0/stream");

      wsClient.on("open", () => {
        console.log("[AISStream] Connected to wss://stream.aisstream.io/v0/stream");
        isConnected = true;
        const subscription = {
          APIKey: apiKey,
          BoundingBoxes: [[[0, 60], [25, 110]]], // Indian Ocean, Bay of Bengal, Arabian Sea, Malacca
          FilterMessageTypes: ["PositionReport"]
        };
        wsClient.send(JSON.stringify(subscription));
      });

      wsClient.on("message", (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.MessageType === "PositionReport" && msg.Message && msg.Message.PositionReport) {
            const report = msg.Message.PositionReport;
            const meta = msg.MetaData || {};
            const vessel = {
              mmsi: meta.MMSI || report.UserID,
              name: (meta.ShipName || `VESSEL-${report.UserID}`).trim(),
              lat: report.Latitude,
              lng: report.Longitude,
              speed: report.Sog || 0,
              heading: report.TrueHeading === 511 ? report.Cog : report.TrueHeading,
              dest: meta.Destination ? meta.Destination.trim() : "EN ROUTE",
              type: "Live Commercial Vessel",
              source: "AISStream Live Satellite",
              updatedAt: Date.now()
            };

            liveVessels.set(vessel.mmsi, vessel);
            broadcastVessel(vessel);
          }
        } catch (err) {
          // Ignore transient JSON parse errors
        }
      });

      wsClient.on("error", (err) => {
        console.warn("[AISStream] WebSocket error:", err.message);
      });

      wsClient.on("close", () => {
        console.log("[AISStream] Connection closed. Reconnecting in 15 seconds...");
        isConnected = false;
        setTimeout(initAISStream, 15000);
      });
    } catch (e) {
      console.warn("[AISStream] Failed to connect:", e.message);
    }
  } else {
    console.log("[AISStream] No AISSTREAM_API_KEY set. Running high-fidelity simulation for Indian Ocean sea lanes.");
    // Simulate gentle vessel drift along courses
    setInterval(() => {
      liveVessels.forEach((v, mmsi) => {
        const rad = (v.heading * Math.PI) / 180;
        const delta = (v.speed * 0.00004); // tiny movement per tick
        v.lat = Number((v.lat + Math.cos(rad) * delta).toFixed(4));
        v.lng = Number((v.lng + Math.sin(rad) * delta).toFixed(4));
        v.updatedAt = Date.now();
        broadcastVessel(v);
      });
    }, 4000);
  }
}

function broadcastVessel(vessel) {
  if (clients.size === 0) return;
  const payload = `data: ${JSON.stringify(vessel)}\n\n`;
  clients.forEach(client => {
    try {
      client.write(payload);
    } catch (e) {
      clients.delete(client);
    }
  });
}

function addSseClient(res) {
  clients.add(res);
  // Send current vessel batch on connect
  const allVessels = Array.from(liveVessels.values());
  res.write(`data: ${JSON.stringify({ type: "INITIAL_BATCH", vessels: allVessels })}\n\n`);
}

function removeSseClient(res) {
  clients.delete(res);
}

function getVesselsList() {
  return Array.from(liveVessels.values());
}

module.exports = {
  initAISStream,
  getVesselsList,
  addSseClient,
  removeSseClient
};
