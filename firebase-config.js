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
  userProfile: null,
  isLive: false,

  // 1. Sign Up a new user with Email, Password and Role
  async signUpUser(name, org, email, password, role = 'shipper') {
    if (!auth) {
      this.userProfile = { name, org, email, role };
      return { success: true, profile: this.userProfile };
    }

    try {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      this.currentUser = cred.user;
      this.isLive = true;

      const profile = {
        uid: cred.user.uid,
        name: name.trim(),
        org: org.trim(),
        email: email.trim(),
        role: role, // 'shipper' or 'manager'
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (db) {
        await db.collection('users').doc(cred.user.uid).set(profile);
        this.seedFirestoreIfEmpty();
      }

      this.userProfile = profile;
      this.updateStatusBadge(true);
      return { success: true, profile };
    } catch (err) {
      console.error("Firebase Sign Up error:", err);
      return { success: false, error: err.message };
    }
  },

  // 2. Sign In existing user with Email & Password
  async signInUser(email, password) {
    if (!auth) {
      const role = email.includes('manager') ? 'manager' : 'shipper';
      this.userProfile = { name: 'Demo Operator', email, role };
      return { success: true, profile: this.userProfile };
    }

    try {
      const cred = await auth.signInWithEmailAndPassword(email, password);
      this.currentUser = cred.user;
      this.isLive = true;

      let profile = {
        uid: cred.user.uid,
        email: cred.user.email,
        name: cred.user.displayName || 'Operator',
        role: 'shipper'
      };

      if (db) {
        const userDoc = await db.collection('users').doc(cred.user.uid).get();
        if (userDoc.exists) {
          profile = { ...profile, ...userDoc.data() };
        } else {
          // If first time signing in without doc, determine role by email hint or default
          const defaultRole = email.toLowerCase().includes('manager') ? 'manager' : 'shipper';
          profile.role = defaultRole;
          await db.collection('users').doc(cred.user.uid).set(profile, { merge: true });
        }
      }

      this.userProfile = profile;
      this.updateStatusBadge(true);
      return { success: true, profile };
    } catch (err) {
      console.error("Firebase Sign In error:", err);
      return { success: false, error: err.message };
    }
  },

  // 3. Quick Demo Login for instant testing
  async quickDemoAuth(role = 'shipper') {
    const isShipper = role === 'shipper';
    const profile = {
      name: isShipper ? 'James Dao' : 'Sarah Chen',
      org: isShipper ? 'Ocean Cargo Exporters' : 'Pacific Route Command',
      email: isShipper ? 'shipper@waypoint-demo.com' : 'manager@waypoint-demo.com',
      role: role
    };

    if (!auth) {
      this.userProfile = profile;
      return { success: true, profile };
    }

    try {
      let cred;
      if (auth.currentUser) {
        cred = { user: auth.currentUser };
      } else {
        cred = await auth.signInAnonymously();
      }

      this.currentUser = cred.user;
      this.isLive = true;
      profile.uid = cred.user.uid;

      if (db) {
        await db.collection('users').doc(cred.user.uid).set({
          ...profile,
          lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        this.seedFirestoreIfEmpty();
      }

      this.userProfile = profile;
      this.updateStatusBadge(true);
      return { success: true, profile };
    } catch (err) {
      console.warn("Demo auth fallback:", err.message);
      this.userProfile = profile;
      return { success: true, profile };
    }
  },

  // 4. Sign Out
  async signOutUser() {
    if (auth) {
      try {
        await auth.signOut();
      } catch (e) {
        console.warn("Sign out notice:", e);
      }
    }
    this.currentUser = null;
    this.userProfile = null;
    this.isLive = false;
    this.updateStatusBadge(false);
  },

  // 5. Seed initial alerts & routes to Firestore if collection is empty
  async seedFirestoreIfEmpty() {
    if (!db) return;
    try {
      const alertSnap = await db.collection('alerts').limit(1).get();
      if (alertSnap.empty && window.WAYPOINT_DATA?.alerts) {
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

  // 6. Real-time Alerts Listener
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

  // 7. Save Route to Firestore
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

  // 8. Fetch Saved Routes from Firestore
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

  // 9. Delete a Saved Route
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

  // 10. Log Rerouting Decisions
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

  // UI Status Indicator
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
