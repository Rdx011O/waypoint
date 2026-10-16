// WAYPOINT — Maritime Route Intelligence | firebase.js
// Modular Firebase v10 client for Auth, Firestore, and Realtime Listeners

import { initializeApp, getApps } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously, 
  signOut,
  onAuthStateChanged 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDZgnduQi-MzbTmGLis-eN71K1zmouRedg",
  authDomain: "waypoint-maritime.firebaseapp.com",
  projectId: "waypoint-maritime",
  storageBucket: "waypoint-maritime.firebasestorage.app",
  messagingSenderId: "479998933683",
  appId: "1:479998933683:web:094636ed74516e307d0ec6",
  measurementId: "G-E4RN8276MX"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);

// Sign up new user and initialize Firestore user document
export async function registerUser(name, org, email, password, role = 'shipper') {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const profile = {
      uid: cred.user.uid,
      name: name.trim(),
      org: org.trim(),
      email: email.trim(),
      role: role,
      timezone: 'UTC+05:30 (IST - Mumbai)',
      notificationsEnabled: true,
      createdAt: serverTimestamp()
    };
    await setDoc(doc(db, "users", cred.user.uid), profile);
    return { success: true, profile };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Sign in existing user and fetch their stored role & profile
export async function loginUser(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, "users", cred.user.uid));
    let profile = {
      uid: cred.user.uid,
      email: cred.user.email,
      name: cred.user.displayName || 'Operator',
      role: email.toLowerCase().includes('manager') ? 'manager' : 'shipper',
      org: 'Ocean Logistics Global',
      timezone: 'UTC+05:30 (IST - Mumbai)'
    };
    if (userDoc.exists()) {
      profile = { ...profile, ...userDoc.data() };
    } else {
      await setDoc(doc(db, "users", cred.user.uid), profile, { merge: true });
    }
    return { success: true, profile };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Quick demo login
export async function demoAuth(role = 'shipper') {
  const isShipper = role === 'shipper';
  const profile = {
    name: isShipper ? 'James Dao' : 'Captain Sarah Chen',
    org: isShipper ? 'Ocean Cargo Exporters Ltd.' : 'Pacific Route Command Fleet',
    email: isShipper ? 'shipper@waypoint-demo.com' : 'manager@waypoint-demo.com',
    role: role,
    timezone: isShipper ? 'UTC+05:30 (IST - Mumbai)' : 'UTC+08:00 (SGT - Singapore)',
    notificationsEnabled: true
  };

  try {
    let cred;
    if (auth.currentUser) {
      cred = { user: auth.currentUser };
    } else {
      cred = await signInAnonymously(auth);
    }
    profile.uid = cred.user.uid;
    await setDoc(doc(db, "users", cred.user.uid), {
      ...profile,
      lastLogin: serverTimestamp()
    }, { merge: true });
    return { success: true, profile };
  } catch (err) {
    console.warn("Demo auth fallback:", err.message);
    profile.uid = 'demo-' + role;
    return { success: true, profile };
  }
}

// Update user settings
export async function updateUserProfile(uid, data) {
  try {
    await setDoc(doc(db, "users", uid), {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Log out
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn("Logout error:", err);
  }
}

// Real-time Firestore alerts subscriber
export function subscribeToAlerts(callback) {
  try {
    const q = query(collection(db, "alerts"));
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const alerts = [];
        snapshot.forEach((d) => alerts.push({ id: d.id, ...d.data() }));
        callback(alerts);
      }
    }, (err) => {
      console.warn("Alerts listener fallback:", err.message);
    });
  } catch (e) {
    console.warn("Firestore subscription error:", e);
    return () => {};
  }
}

// Save route
export async function saveRouteToCloud(routeData, userId) {
  try {
    const docRef = await addDoc(collection(db, "saved_routes"), {
      ...routeData,
      userId: userId || 'anonymous',
      createdAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (err) {
    console.warn("Cloud save error:", err);
    return { success: false };
  }
}

// Delete route
export async function deleteRouteFromCloud(routeId) {
  try {
    await deleteDoc(doc(db, "saved_routes", routeId));
    return { success: true };
  } catch (err) {
    console.warn("Cloud delete error:", err);
    return { success: false };
  }
}

// ==========================================
// CSV Maritime Data Fetchers from Firestore
// ==========================================
import { 
  CSV_INDIAN_PORTS, 
  CSV_FOREIGN_PORTS, 
  CSV_TRADE_LINKS, 
  CSV_VESSEL_TYPES,
  CSV_SHIPPING_LINES,
  SHIPPING_LINES_BY_PORT 
} from "../data/maritimeCsvData";

// Fetch Indian East Coast Ports from Firestore
export async function fetchIndianPorts() {
  try {
    const snap = await getDocs(collection(db, "ports_india"));
    if (!snap.empty) {
      const ports = [];
      snap.forEach(d => ports.push({ id: d.id, ...d.data() }));
      return ports;
    }
  } catch (e) {
    console.warn("Firestore ports_india fetch fallback to CSV data:", e.message);
  }
  return CSV_INDIAN_PORTS;
}

// Fetch Foreign Partner Ports from Firestore
export async function fetchForeignPorts() {
  try {
    const snap = await getDocs(collection(db, "ports_foreign"));
    if (!snap.empty) {
      const ports = [];
      snap.forEach(d => ports.push({ id: d.id, ...d.data() }));
      return ports;
    }
  } catch (e) {
    console.warn("Firestore ports_foreign fetch fallback to CSV data:", e.message);
  }
  return CSV_FOREIGN_PORTS;
}

// Fetch Trade Links from Firestore
export async function fetchTradeLinks() {
  try {
    const snap = await getDocs(collection(db, "trade_links"));
    if (!snap.empty) {
      const links = [];
      snap.forEach(d => links.push({ id: d.id, ...d.data() }));
      return links;
    }
  } catch (e) {
    console.warn("Firestore trade_links fetch fallback to CSV data:", e.message);
  }
  return CSV_TRADE_LINKS;
}

// Fetch Vessel Types from Firestore
export async function fetchVesselTypes() {
  try {
    const snap = await getDocs(collection(db, "vessel_types"));
    if (!snap.empty) {
      const types = [];
      snap.forEach(d => types.push({ id: d.id, ...d.data() }));
      return types;
    }
  } catch (e) {
    console.warn("Firestore vessel_types fetch fallback to CSV data:", e.message);
  }
  return CSV_VESSEL_TYPES;
}

// Get Shipping Lines by Port
export function getShippingLinesForPort(portId) {
  if (!portId) return [];
  return SHIPPING_LINES_BY_PORT[portId] || [];
}
