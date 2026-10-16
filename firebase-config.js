// WAYPOINT — Maritime Route Intelligence | firebase-config.js
// Firebase Backend Client Integration for Authentication & Cloud Firestore

const firebaseConfig = {
  apiKey: "AIzaSyDZgnduQi-MzbTmGLis-eN71K1zmouRedg",
  authDomain: "waypoint-maritime.firebaseapp.com",
  projectId: "waypoint-maritime",
  storageBucket: "waypoint-maritime.firebasestorage.app",
  messagingSenderId: "479998933683",
  appId: "1:479998933683:web:094636ed74516e307d0ec6",
  measurementId: "G-E4RN8276MX"
};

// Initialize Firebase SDK
try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
} catch (err) {
  console.warn("Firebase initialization notice:", err);
}

const auth = typeof firebase !== 'undefined' && firebase.auth ? firebase.auth() : null;
const db = typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null;

window.fb = {
  auth,
  db,
  currentUser: null,
  isLive: false,

  // 1. Authenticate user & sync role in Firestore
  async authenticateUser(role = 'shipper') {
    if (!auth) return { uid: 'demo-operator', role };

    try {
      let userCredential;
      if (auth.currentUser) {
        userCredential = { user: auth.currentUser };
      } else {
        userCredential = await auth.signInAnonymously();
      }

      this.currentUser = userCredential.user;
      this.isLive = true;

      // Sync user profile & active role in Firestore
      if (db) {
        await db.collection('users').doc(this.currentUser.uid).set({
          uid: this.currentUser.uid,
          role: role,
          name: role === 'shipper' ? 'James Dao' : 'Logistics Controller',
          email: `${role}@waypoint-maritime.app`,
          lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Seed sample data in Firestore if empty
        this.seedFirestoreIfEmpty();
      }

      console.log("Firebase Auth connected:", this.currentUser.uid, "Role:", role);
      this.updateStatusBadge(true);
      return { uid: this.currentUser.uid, role };
    } catch (error) {
      console.warn("Firebase Auth fallback to local demo:", error.message);
      this.updateStatusBadge(false);
      return { uid: 'offline-demo', role };
    }
  },

  // 2. Seed initial alerts & routes to Firestore if collection is fresh
  async seedFirestoreIfEmpty() {
    if (!db) return;
    try {
      const alertSnap = await db.collection('alerts').limit(1).get();
      if (alertSnap.empty && window.WAYPOINT_DATA?.alerts) {
        console.log("Seeding initial maritime alerts to Firestore...");
        const batch = db.batch();
        window.WAYPOINT_DATA.alerts.forEach(alert => {
          const ref = db.collection('alerts').doc(alert.id);
          batch.set(ref, {
            ...alert,
            active: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        });
        await batch.commit();
      }

      const routeSnap = await db.collection('saved_routes').limit(1).get();
      if (routeSnap.empty && window.WAYPOINT_DATA?.savedRoutes) {
        console.log("Seeding initial saved routes to Firestore...");
        const batch = db.batch();
        window.WAYPOINT_DATA.savedRoutes.forEach(route => {
          const ref = db.collection('saved_routes').doc(route.id);
          batch.set(ref, {
            ...route,
            userId: this.currentUser?.uid || 'demo-user',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        });
        await batch.commit();
      }
    } catch (e) {
      console.warn("Firestore seed note:", e.message);
    }
  },

  // 3. Real-time Alerts Listener
  subscribeAlerts(onUpdate) {
    if (!db) {
      onUpdate(window.WAYPOINT_DATA?.alerts || []);
      return () => {};
    }

    try {
      return db.collection('alerts').onSnapshot(
        snapshot => {
          if (!snapshot.empty) {
            const alerts = [];
            snapshot.forEach(doc => alerts.push({ id: doc.id, ...doc.data() }));
            onUpdate(alerts);
          } else {
            onUpdate(window.WAYPOINT_DATA?.alerts || []);
          }
        },
        err => {
          console.warn("Alerts subscription note:", err.message);
          onUpdate(window.WAYPOINT_DATA?.alerts || []);
        }
      );
    } catch (err) {
      onUpdate(window.WAYPOINT_DATA?.alerts || []);
      return () => {};
    }
  },

  // 4. Save a Route to Cloud Firestore
  async saveRoute(routeData) {
    if (!db) {
      window.WAYPOINT_DATA.savedRoutes.unshift(routeData);
      return routeData;
    }

    try {
      const docRef = await db.collection('saved_routes').add({
        ...routeData,
        userId: this.currentUser?.uid || 'anonymous',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      routeData.id = docRef.id;
      return routeData;
    } catch (err) {
      console.warn("Firestore saveRoute fallback:", err.message);
      window.WAYPOINT_DATA.savedRoutes.unshift(routeData);
      return routeData;
    }
  },

  // 5. Fetch Saved Routes from Cloud Firestore
  async fetchSavedRoutes() {
    if (!db) return window.WAYPOINT_DATA.savedRoutes;

    try {
      const snapshot = await db.collection('saved_routes').orderBy('createdAt', 'desc').get();
      if (!snapshot.empty) {
        const routes = [];
        snapshot.forEach(doc => routes.push({ id: doc.id, ...doc.data() }));
        return routes;
      }
      return window.WAYPOINT_DATA.savedRoutes;
    } catch (err) {
      console.warn("Firestore fetchSavedRoutes fallback:", err.message);
      return window.WAYPOINT_DATA.savedRoutes;
    }
  },

  // 6. Delete a Saved Route
  async deleteRoute(routeId) {
    if (db) {
      try {
        await db.collection('saved_routes').doc(routeId).delete();
      } catch (err) {
        console.warn("Firestore deleteRoute fallback:", err.message);
      }
    }
    const idx = window.WAYPOINT_DATA.savedRoutes.findIndex(r => r.id === routeId);
    if (idx !== -1) window.WAYPOINT_DATA.savedRoutes.splice(idx, 1);
  },

  // 7. Log Rerouting Decisions to Cloud
  async logRerouteDecision(decision) {
    if (!db) return;
    try {
      await db.collection('reroute_decisions').add({
        ...decision,
        userId: this.currentUser?.uid || 'anonymous',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.warn("Firestore logReroute fallback:", err.message);
    }
  },

  // UI Helper: Update Topbar Badge
  updateStatusBadge(isOnline) {
    const pill = document.getElementById('data-status-pill');
    if (pill) {
      if (isOnline) {
        pill.innerHTML = `<span class="status-dot live"></span><span>Firebase Live</span>`;
      } else {
        pill.innerHTML = `<span class="status-dot demo"></span><span>Demo Mode</span>`;
      }
    }
  }
};
