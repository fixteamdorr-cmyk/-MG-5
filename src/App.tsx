/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { Home, Car, UserCircle, ArrowRight, Search, MapPin, Navigation, ArrowLeft, X, LocateFixed, Star, Phone, MessageCircle, CreditCard, ShieldCheck, IdCard, Camera, Play, ClipboardList, Mail, Hash, Calendar, CheckCircle2, AlertCircle, Upload, Luggage, User, Facebook, Instagram, Youtube, Twitter, Plane, Hotel, Bus, Train, Palmtree, Award, Apple, FileText, LogOut, Settings, HelpCircle, Zap, Clock, TrendingUp, Activity, Bot, ChevronRight, Compass, Wifi, PhoneCall, ChevronLeft, Map as MapIcon, Info, ExternalLink, ArrowRightLeft, Maximize2, Handshake, Building2, ArrowUpRight, Users, Sparkles, MessageSquare, Loader2 } from "lucide-react";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker, Polyline, Autocomplete, InfoWindow } from "@react-google-maps/api";
import { auth, db, storage } from "./firebase";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp, 
  getDocFromServer, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  updateDoc, 
  onSnapshot 
} from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { toast, Toaster } from "sonner";
import { GoogleGenAI, Type } from "@google/genai";
import { NotificationService, sendNotification } from "./components/NotificationService";
import { Send } from "lucide-react";

import { Maps_API_KEY } from "./config";

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- Map Styling ---
const mapStyles = [
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#e9f5fe" }] // Light Blue
  },
  {
    "featureType": "landscape",
    "elementType": "geometry",
    "stylers": [{ "color": "#f5f5f5" }] // Gray
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [{ "color": "#e8f5e9" }] // Green
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#ffffff" }] // White roads on gray
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{ "color": "#eeeeee" }]
  },
  {
    "featureType": "all",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#616161" }]
  }
];

const containerStyle = {
  width: '100%',
  height: '100%'
};

const center = {
  lat: 34.7400, // Sfax, Tunisia
  lng: 10.7600
};

const libraries: ("places" | "geometry")[] = ["places", "geometry"];

// --- Bottom Navigation Component ---
function BottomNav({ activeTab, onTabChange }: { activeTab: string, onTabChange: (tab: any) => void }) {
  const { t } = useTranslation();
  const tabs = [
    { id: 'home', label: t('home'), icon: Home },
    { id: 'bookings', label: t('bookings'), icon: ClipboardList },
    { id: 'profile', label: t('profile'), icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 px-6 py-3 z-50 flex justify-between items-center shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-yellow-500 scale-110' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`text-[10px] font-black ${isActive ? 'opacity-100' : 'opacity-70'}`}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// --- Driver Stats Component ---
function DriverStats({ driverId }: { driverId: string }) {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ earnings: 0, completionRate: 0, totalTrips: 0 });

  useEffect(() => {
    if (!driverId) return;

    const q = query(
      collection(db, "trip_requests"),
      where("driverId", "==", driverId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => d.data());
      const completed = docs.filter(d => d.status === 'completed');
      const total = docs.length;
      
      const earnings = completed.reduce((sum, d) => {
        const price = typeof d.estimation?.price === 'string' 
          ? parseFloat(d.estimation.price) 
          : (d.estimation?.price || 0);
        return sum + price;
      }, 0);

      const rate = total > 0 ? (completed.length / total) * 100 : 0;

      setStats({
        earnings,
        completionRate: Math.round(rate),
        totalTrips: completed.length
      });
    });

    return () => unsubscribe();
  }, [driverId]);

  return (
    <div className="grid grid-cols-2 gap-4 w-full max-w-md px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900/50 border border-white/5 p-6 rounded-[32px] space-y-2"
      >
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500">
            <TrendingUp size={20} />
          </div>
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t('earnings')}</span>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-white">{stats.earnings.toLocaleString()} <span className="text-xs text-zinc-500">د.ت</span></p>
          <p className="text-[10px] font-bold text-zinc-500 mt-1">{t('earnings')}</p>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-zinc-900/50 border border-white/5 p-6 rounded-[32px] space-y-2"
      >
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
            <Activity size={20} />
          </div>
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t('completion_rate')}</span>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-white">{stats.completionRate}%</p>
          <p className="text-[10px] font-bold text-zinc-500 mt-1">{t('completion_rate')}</p>
        </div>
      </motion.div>
    </div>
  );
}

// --- Main App Component ---
export default function App() {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState<"landing" | "ride-request" | "searching-driver" | "driver-found" | "driver-portal" | "driver-registration" | "driver-work" | "trip-history" | "admin-dashboard" | "passenger-profile" | "passenger-bookings" | "passenger-notifications" | "sfax-pilot-registration" | "sfax-hub">("landing");
  const [activeTab, setActiveTab] = useState<"home" | "bookings" | "profile">("home");
  const [showContent, setShowContent] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentTripRequestId, setCurrentTripRequestId] = useState<string | null>(null);
  const [activeTripRequest, setActiveTripRequest] = useState<any | null>(null);

  const appId = "2go-sfax-2026";

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: Maps_API_KEY, 
    libraries,
    language: i18n.language
  });

  // Connection test
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'system', 'connection-test'));
        console.log("Firestore connection successful");
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Firestore is offline. Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleDriverLogin = async () => {
    if (!user) {
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
        setView("driver-portal");
      } catch (error) {
        console.error("Login failed:", error);
      }
    } else {
      setView("driver-portal");
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white/5 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  const showBottomNav = ["ride-request", "passenger-bookings", "passenger-profile", "driver-portal"].includes(view) && !activeTripRequest;

  const handleTabChange = (tab: "home" | "bookings" | "profile") => {
    setActiveTab(tab);
    if (tab === "home") setView("ride-request");
    else if (tab === "bookings") setView("passenger-bookings");
    else if (tab === "profile") setView("passenger-profile");
  };

  const handleStart = async () => {
    if (!user) {
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
        setView("ride-request");
        setActiveTab("home");
      } catch (error) {
        console.error("Login failed:", error);
      }
    } else {
      setView("ride-request");
      setActiveTab("home");
    }
  };

  const handleQuickRequest = async () => {
    const processQuickRequest = async (currentUser: FirebaseUser) => {
      try {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const pickup = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: "موقعي الحالي"
          };
          
          const docRef = await addDoc(collection(db, "trip_requests"), {
            passengerId: currentUser.uid,
            passengerName: currentUser.displayName || "راكب",
            pickup: pickup,
            destination: { address: "طلب سريع - صفاقس" },
            estimation: { price: "0", distance: "0 km", duration: "0 min" },
            status: "pending",
            isQuickRequest: true,
            timestamp: serverTimestamp()
          });
          setCurrentTripRequestId(docRef.id);
          setView("searching-driver");
        }, (error) => {
          console.error("Geolocation error:", error);
          toast.error("يرجى تفعيل تحديد الموقع للطلب السريع");
        });
      } catch (error) {
        console.error("Error creating quick request:", error);
      }
    };

    if (!user) {
      const provider = new GoogleAuthProvider();
      try {
        const result = await signInWithPopup(auth, provider);
        await processQuickRequest(result.user);
      } catch (error) {
        console.error("Login failed:", error);
      }
    } else {
      await processQuickRequest(user);
    }
  };

  return (
    <div className="relative min-h-screen bg-zinc-50">
      <AnimatePresence mode="wait">
        <NotificationService />
        {view === "landing" ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5 }}
          >
            <LandingPage 
              onStart={handleQuickRequest} 
              onDriverLogin={handleDriverLogin}
              onJoinPilot={() => setView("sfax-pilot-registration")}
              onOpenHub={() => setView("sfax-hub")}
              showContent={showContent} 
            />
          </motion.div>
        ) : view === "sfax-hub" ? (
          <motion.div
            key="sfax-hub"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SfaxHubPage onBack={() => setView("landing")} isLoaded={isLoaded} />
          </motion.div>
        ) : view === "ride-request" ? (
          <motion.div
            key="ride-request"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
          >
            <RideRequestPage 
              onBack={() => setView("landing")} 
              onSearch={async (estimation, pickup, destination) => {
                if (!user) return;
                try {
                  const docRef = await addDoc(collection(db, "trip_requests"), {
                    passengerId: user.uid,
                    passengerName: user.displayName || "راكب",
                    pickup: pickup,
                    destination: { ...destination, address: destination.address || "وجهة غير محددة" },
                    estimation: estimation,
                    status: "pending",
                    timestamp: serverTimestamp()
                  });
                  setCurrentTripRequestId(docRef.id);
                  setView("searching-driver");
                } catch (error) {
                  console.error("Error creating trip request:", error);
                }
              }}
              isLoaded={isLoaded}
            />
          </motion.div>
        ) : view === "searching-driver" ? (
          <motion.div
            key="searching-driver"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SearchingDriverPage 
              requestId={currentTripRequestId}
              onCancel={async () => {
                if (currentTripRequestId) {
                  await updateDoc(doc(db, "trip_requests", currentTripRequestId), { status: "cancelled" });
                }
                setView("landing");
              }} 
              onFound={(tripData) => {
                setActiveTripRequest(tripData);
                setView("driver-found");
              }}
              isLoaded={isLoaded}
            />
          </motion.div>
        ) : view === "driver-found" ? (
          <motion.div
            key="driver-found"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <DriverFoundPage 
              tripRequest={activeTripRequest}
              onBack={() => {
                setActiveTripRequest(null);
                setView("ride-request");
              }} 
              isLoaded={isLoaded}
            />
          </motion.div>
        ) : view === "sfax-pilot-registration" ? (
          <motion.div
            key="sfax-pilot-registration"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SfaxPilotRegistrationPage onBack={() => setView("landing")} />
          </motion.div>
        ) : view === "driver-portal" ? (
          <motion.div
            key="driver-portal"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <DriverPortalPage 
              onBack={() => setView("passenger-profile")} 
              onRegister={() => setView("driver-registration")}
              onStartWork={() => setView("driver-work")}
              onViewHistory={() => setView("trip-history")}
              onOpenAdmin={() => setView("admin-dashboard")}
            />
          </motion.div>
        ) : view === "trip-history" ? (
          <motion.div
            key="trip-history"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <TripHistoryPage onBack={() => setView("driver-portal")} />
          </motion.div>
        ) : view === "passenger-notifications" ? (
          <motion.div
            key="passenger-notifications"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5 }}
          >
            <NotificationSettingsPage onBack={() => setView("passenger-profile")} />
          </motion.div>
        ) : view === "passenger-bookings" ? (
          <motion.div
            key="passenger-bookings"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <PassengerBookingsPage onBack={() => setView("ride-request")} />
          </motion.div>
        ) : view === "passenger-profile" ? (
          <motion.div
            key="passenger-profile"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <PassengerProfilePage 
              user={user} 
              onDriverPortal={() => setView("driver-portal")}
              onLogout={async () => {
                await auth.signOut();
                setView("landing");
              }}
              onNotificationSettings={() => setView("passenger-notifications")}
            />
          </motion.div>
        ) : view === "admin-dashboard" ? (
        <motion.div
          key="admin-dashboard"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <AdminDashboard onBack={() => setView("driver-portal")} />
        </motion.div>
      ) : view === "driver-registration" ? (
        <motion.div
          key="driver-registration"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <DriverRegistrationPage onBack={() => setView("driver-portal")} />
        </motion.div>
      ) : (
        <motion.div
          key="driver-work"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <DriverWorkPage onBack={() => setView("driver-portal")} isLoaded={isLoaded} />
        </motion.div>
      )}
      </AnimatePresence>
      {showBottomNav && <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />}
      <CookieBanner />
    </div>
  );
}

// --- Cookie Banner Component ---
function CookieBanner() {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const consent = localStorage.getItem('google-consent');
    if (!consent) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <motion.div 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-6 left-6 right-6 z-[100] bg-zinc-900 text-white p-6 rounded-[32px] shadow-2xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 max-w-4xl mx-auto"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gold rounded-2xl flex items-center justify-center text-black shrink-0">
          <ShieldCheck size={24} />
        </div>
        <div>
          <p className="font-black text-sm">خصوصية البيانات (Google Consent Mode 2026)</p>
          <p className="text-xs text-zinc-400 font-bold">نحن نستخدم ملفات تعريف الارتباط لتحسين تجربتك وضمان أمان البيانات وفقاً للمعايير العالمية.</p>
        </div>
      </div>
      <div className="flex gap-3 w-full md:w-auto">
        <button 
          onClick={() => {
            localStorage.setItem('google-consent', 'accepted');
            setShow(false);
          }}
          className="flex-1 md:flex-none px-8 h-12 bg-gold text-black rounded-xl font-black text-sm shadow-lg shadow-gold/20"
        >
          موافق
        </button>
        <button 
          onClick={() => setShow(false)}
          className="flex-1 md:flex-none px-8 h-12 bg-zinc-800 text-zinc-400 rounded-xl font-black text-sm"
        >
          إعدادات
        </button>
      </div>
    </motion.div>
  );
}

// --- Landing Page Component ---
function LandingPage({ onStart, onDriverLogin, onJoinPilot, onOpenHub, showContent }: { onStart: () => void, onDriverLogin: () => void, onJoinPilot: () => void, onOpenHub: () => void, showContent: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-white flex flex-col items-center font-sans overflow-x-hidden pb-12">
      {/* WhatsApp Update Banner */}
      <div 
        onClick={() => window.open('http://wa.me/+971527731553', '_blank')}
        className="w-full max-w-md mt-6 px-6 cursor-pointer hover:scale-[1.02] transition-transform"
      >
        <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#25D366] rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/20">
              <svg 
                viewBox="0 0 24 24" 
                width="20" 
                height="20" 
                fill="currentColor"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.393 0 12.03c0 2.122.541 4.198 1.57 6.052L0 24l6.107-1.605A11.725 11.725 0 0012.048 24c6.638 0 12.034-5.395 12.036-12.033a11.82 11.82 0 00-3.525-8.495z"/>
              </svg>
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 font-bold uppercase">تواصل معنا</p>
              <p className="text-xs font-black text-zinc-900">انضم لقناة واتساب 2GO</p>
            </div>
          </div>
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 size={16} className="text-green-600" />
          </div>
        </div>
      </div>

      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={showContent ? { y: 0, opacity: 1 } : {}}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center mt-8 space-y-2 px-6"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 bg-taxi-yellow rounded-3xl shadow-xl mb-4 relative overflow-hidden group">
          <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
          <div className="flex items-center gap-1 relative z-10">
            <User size={28} className="text-black" />
            <Luggage size={20} className="text-black -ml-2 mt-2" />
            <Car size={28} className="text-black ml-1" />
          </div>
        </div>
        <h1 className="text-4xl font-display font-black text-zinc-900 tracking-tight flex items-center justify-center gap-2">
          <motion.span
            animate={{ rotate: [0, 15, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Zap size={32} className="text-yellow-500 fill-yellow-500" />
          </motion.span>
          {t('welcome')} <span className="text-yellow-500">{t('app_name')}</span>
        </h1>
        <p className="text-zinc-500 font-medium text-lg">{t('slogan')}</p>
        <div className="text-[10px] text-zinc-300 font-mono mt-2">v1.1.0-stable</div>
      </motion.div>

      <div className="relative w-full flex justify-center items-center py-8">
        <motion.div
          initial={{ x: -200, opacity: 0 }}
          animate={showContent ? { x: 0, opacity: 1 } : {}}
          transition={{ duration: 1.2, delay: 0.3, ease: "backOut" }}
          className="relative z-10"
        >
          <motion.div
            animate={{ 
              y: [0, -4, 0],
              rotate: [0, 0.5, -0.5, 0]
            }}
            transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg width="100" height="180" viewBox="0 0 100 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_25px_25px_rgba(0,0,0,0.15)]">
              <rect x="10" y="20" width="80" height="140" rx="20" fill="#FACC15" stroke="#000" strokeWidth="2"/>
              <rect x="18" y="45" width="64" height="25" rx="4" fill="#18181B"/>
              <rect x="18" y="120" width="64" height="15" rx="4" fill="#18181B"/>
              <rect x="20" y="70" width="60" height="50" rx="8" fill="#FACC15" stroke="#000" strokeWidth="1"/>
              <rect x="35" y="85" width="30" height="12" rx="2" fill="#FACC15" stroke="#000" strokeWidth="1"/>
              <text x="50" y="94" fontSize="7" fill="#000" textAnchor="middle" fontWeight="bold" fontFamily="sans-serif">TAXI</text>
              <rect x="15" y="25" width="12" height="6" rx="2" fill="#FEF9C3" opacity="0.8"/>
              <rect x="73" y="25" width="12" height="6" rx="2" fill="#FEF9C3" opacity="0.8"/>
              <rect x="15" y="150" width="12" height="4" rx="1" fill="#EF4444" opacity="0.8"/>
              <rect x="73" y="150" width="12" height="4" rx="1" fill="#EF4444" opacity="0.8"/>
            </svg>
          </motion.div>
        </motion.div>
        <div className="absolute inset-0 flex flex-col justify-center gap-8 opacity-5 -z-0">
          <div className="h-1 w-full bg-zinc-900"></div>
          <div className="h-1 w-full bg-zinc-900 border-t-2 border-dashed border-zinc-400"></div>
          <div className="h-1 w-full bg-zinc-900"></div>
        </div>
      </div>

      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={showContent ? { y: 0, opacity: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
        className="w-full max-w-sm space-y-4 mb-8 px-6"
      >
        <motion.button
          onClick={onStart}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full h-24 bg-zinc-900 text-white rounded-[32px] flex items-center justify-between px-8 shadow-2xl shadow-zinc-400/30 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-taxi-yellow translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
          <div className="relative z-10 flex items-center gap-5">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-black/10">
              <Car className="w-8 h-8 group-hover:text-black" />
            </div>
            <div className="text-right">
              <span className="text-2xl font-black block group-hover:text-black">{t('request_taxi')}</span>
              <span className="text-xs font-bold opacity-50 group-hover:text-black/50">{t('quick_request')}</span>
            </div>
          </div>
          <ArrowRight className="relative z-10 w-8 h-8 opacity-50 group-hover:opacity-100 group-hover:text-black transition-all group-hover:translate-x-2" />
        </motion.button>

        <div className="w-full h-16 bg-white text-black border-2 border-yellow-400 rounded-2xl flex items-center justify-center px-6 shadow-md opacity-80">
          <div className="flex items-center gap-4 text-zinc-900">
            <div className="w-10 h-10 bg-yellow-400/10 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-lg font-bold">{t('join_pilot')}</span>
          </div>
        </div>

        <motion.button
          onClick={onDriverLogin}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full h-24 bg-taxi-yellow text-black rounded-[32px] flex items-center justify-between px-8 shadow-2xl shadow-yellow-400/30 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-black translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
          <div className="relative z-10 flex items-center gap-5">
            <div className="w-14 h-14 bg-black/10 rounded-2xl flex items-center justify-center group-hover:bg-white/10">
              <UserCircle className="w-8 h-8 group-hover:text-taxi-yellow" />
            </div>
            <div className="text-right">
              <span className="text-2xl font-black block group-hover:text-taxi-yellow">{t('driver_portal')}</span>
              <span className="text-xs font-bold opacity-50 group-hover:text-white/50">لوحة التحكم والعمل</span>
            </div>
          </div>
          <ArrowRight className="relative z-10 w-8 h-8 opacity-50 group-hover:opacity-100 group-hover:text-taxi-yellow transition-all group-hover:translate-x-2" />
        </motion.button>

        <motion.button
          onClick={onOpenHub}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full h-24 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-[32px] flex items-center justify-between px-8 shadow-2xl shadow-blue-500/30 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10 flex items-center gap-5">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <Zap className="w-8 h-8 text-white fill-white" />
            </div>
            <div className="text-right">
              <span className="text-2xl font-black block text-white">صفاقس الذكية</span>
              <span className="text-xs font-bold opacity-70">Sfax Hub - خدمات متكاملة</span>
            </div>
          </div>
          <ArrowRight className="relative z-10 w-8 h-8 opacity-50 group-hover:opacity-100 text-white transition-all group-hover:translate-x-2" />
        </motion.button>

        {/* App Store Links */}
        <div className="flex flex-col gap-4 pt-4">
          <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest text-center">Download 2GO App</p>
          <div className="flex gap-3">
            <div className="flex-1 h-12 bg-black text-white rounded-xl flex items-center justify-center gap-2 px-4 cursor-pointer hover:bg-zinc-800 transition-colors">
              <Play size={18} fill="currentColor" />
              <div className="text-left">
                <p className="text-[8px] leading-none opacity-60">GET IT ON</p>
                <p className="text-xs font-black leading-none mt-0.5">Google Play</p>
              </div>
            </div>
            <div className="flex-1 h-12 bg-black text-white rounded-xl flex items-center justify-center gap-2 px-4 cursor-pointer hover:bg-zinc-800 transition-colors">
              <Apple size={18} fill="currentColor" />
              <div className="text-left">
                <p className="text-[8px] leading-none opacity-60">Download on the</p>
                <p className="text-xs font-black leading-none mt-0.5">App Store</p>
              </div>
            </div>
          </div>
        </div>


        {/* Services Grid */}
        <div className="pt-8 w-full">
          <p className="text-xs font-black text-zinc-900 mb-4">Use 2GO to Book</p>
          <div className="grid grid-cols-6 gap-2">
            {[
              { icon: Plane, label: "FLIGHTS" },
              { icon: Hotel, label: "HOTELS" },
              { icon: Bus, label: "BUSES" },
              { icon: Train, label: "TRAINS" },
              { icon: Palmtree, label: "HOLIDAYS" },
              { icon: Car, label: "CABS", active: true }
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.active ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                  <item.icon size={18} />
                </div>
                <span className={`text-[8px] font-black ${item.active ? 'text-zinc-900' : 'text-zinc-400'}`}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-zinc-400 text-[10px] font-medium pt-8">
          بالتسجيل أنت توافق على <span className="text-zinc-600 underline cursor-pointer">شروط الخدمة</span>
        </p>
      </motion.div>
    </div>
  );
}

// --- Ride Request Page Component ---
function RideRequestPage({ onBack, onSearch, isLoaded }: { onBack: () => void, onSearch: (estimation: any, pickup: any, destination: any) => void, isLoaded: boolean }) {
  const { t } = useTranslation();
  const [userLocation, setUserLocation] = useState(center);
  const [destination, setDestination] = useState("");
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [estimation, setEstimation] = useState<{ distance: string, duration: string, price: number } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [suggestedPlaces, setSuggestedPlaces] = useState<any[]>([]);
  const [activeDrivers, setActiveDrivers] = useState<any[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<any>(null);

  // Sfax Famous Landmarks and Universities
  const sfaxLandmarks = [
    { name: "جامعة صفاقس", vicinity: "Sfax University, Route de l'Aéroport" },
    { name: "باب البحر (المدينة العتيقة)", vicinity: "Sfax Medina, Downtown" },
    { name: "مطار صفاقس طينة الدولي", vicinity: "Sfax–Thyna International Airport" },
    { name: "مول أوف صفاقس", vicinity: "Mall of Sfax, Route de Tunis" },
    { name: "باب ديوان", vicinity: "Bab Diwan, Sfax Medina" },
    { name: "حي الأنس", vicinity: "Cite El Ons, Sakiet Ezzit" },
    { name: "طريق الأفران", vicinity: "Route de l'Afrane, Sfax" },
    { name: "ساقية الزيت", vicinity: "Sakiet Ezzit, Sfax" },
  ];

  // Fetch active drivers from sfax_drivers
  useEffect(() => {
    const q = query(
      collection(db, "sfax_drivers"),
      where("status", "==", "approved"),
      where("isOnline", "==", true)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const drivers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActiveDrivers(drivers);
    }, (error) => console.error("Error fetching drivers for map:", error));
    
    return () => unsubscribe();
  }, []);

  // Fetch suggested places (landmarks)
  useEffect(() => {
    if (isLoaded && window.google && userLocation) {
      const service = new google.maps.places.PlacesService(document.createElement('div'));
      const request: google.maps.places.PlaceSearchRequest = {
        location: userLocation,
        radius: 10000,
        type: 'university' // Start with universities for AI feel
      };

      service.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          // Mix standard places with our specific Sfax landmarks
          const merged = [...sfaxLandmarks, ...results.map(r => ({ name: r.name, vicinity: r.vicinity }))].slice(0, 8);
          setSuggestedPlaces(merged);
        } else {
          setSuggestedPlaces(sfaxLandmarks);
        }
      });
    }
  }, [isLoaded, userLocation]);

  // Request Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(pos);
          map?.panTo(pos);
        },
        () => {
          console.error("Error: The Geolocation service failed.");
        }
      );
    }
  }, [map]);

  const calculateTrip = () => {
    if (!destination) return;
    
    setIsCalculating(true);
    
    // If Google Maps is not loaded or fails, use a smart fallback for the demo
    const fallbackTimer = setTimeout(() => {
      if (isCalculating) {
        setIsCalculating(false);
        setEstimation({
          distance: "8.4 كم",
          duration: "15 دقيقة",
          price: 32
        });
      }
    }, 1500);

    if (isLoaded) {
      const service = new google.maps.DistanceMatrixService();
      service.getDistanceMatrix(
        {
          origins: [userLocation],
          destinations: [destination],
          travelMode: google.maps.TravelMode.DRIVING,
          unitSystem: google.maps.UnitSystem.METRIC,
        },
        (response, status) => {
          clearTimeout(fallbackTimer);
          setIsCalculating(false);
          if (status === 'OK' && response && response.rows[0].elements[0].status === 'OK') {
            const result = response.rows[0].elements[0];
            const distanceKm = result.distance.value / 1000;
            const durationMin = result.duration.value / 60;
            
            const baseFare = 10;
            const perKm = 2;
            const perMin = 0.5;
            const totalPrice = Math.max(15, baseFare + (distanceKm * perKm) + (durationMin * perMin));
            
            setEstimation({
              distance: result.distance.text,
              duration: result.duration.text,
              price: Math.round(totalPrice)
            });
          } else {
            // Fallback if API returns no results for the string
            setEstimation({
              distance: "12.5 كم",
              duration: "22 دقيقة",
              price: 45
            });
          }
        }
      );
    }
  };

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    setMap(null);
  }, []);

  const onAutocompleteLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        setDestination(place.formatted_address);
        // Trigger calculation immediately when a place is selected
        setTimeout(() => calculateTrip(), 100);
      }
    } else {
      console.log('Autocomplete is not loaded yet!');
    }
  };

  return (
    <div className="relative h-screen w-full bg-zinc-100 overflow-hidden">
      {/* Header / Back Button */}
      <div className="absolute top-6 left-6 z-20">
        <button 
          onClick={onBack}
          className="w-12 h-12 bg-gold text-black rounded-2xl shadow-2xl flex items-center justify-center hover:bg-yellow-500 transition-colors border border-black/10"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      {/* Map Implementation */}
      <div className="absolute inset-0 z-0">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={userLocation}
            zoom={14}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
              styles: mapStyles,
              disableDefaultUI: true,
              zoomControl: true,
            }}
          >
            {isLoaded && window.google && (
              <Marker 
                position={userLocation} 
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: "#3b82f6",
                  fillOpacity: 1,
                  strokeWeight: 4,
                  strokeColor: "#ffffff",
                }}
                onClick={() => setSelectedMarker({ id: 'current', name: 'صفاقس، تونس', location: userLocation })}
              />
            )}
            
            {selectedMarker?.id === 'current' && (
              <InfoWindow
                position={userLocation}
                onCloseClick={() => setSelectedMarker(null)}
              >
                <div className="p-2 text-right" dir="rtl">
                  <p className="font-bold text-zinc-900">موقعك الحالي في صفاقس</p>
                  <p className="text-xs text-zinc-500">ولاية صفاقس، تونس</p>
                </div>
              </InfoWindow>
            )}
            
            {/* Show Nearby Active Drivers as GREEN icons */}
            {activeDrivers.map(driver => (
              driver.location && (
                <Marker 
                  key={driver.id}
                  position={{
                    lat: driver.location.lat,
                    lng: driver.location.lng
                  }}
                  icon={{
                    path: "M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z",
                    fillColor: "#22c55e", 
                    fillOpacity: 1,
                    strokeWeight: 1,
                    strokeColor: "#ffffff",
                    scale: 1.2,
                    anchor: new google.maps.Point(12, 12)
                  }}
                />
              )
            ))}
          </GoogleMap>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-200">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-zinc-500 font-medium">{t('calculating')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Search Popup */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-20 flex justify-center">
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-md bg-white rounded-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 space-y-6"
        >
          {!estimation ? (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">{t('pickup_location')}</p>
                </div>
                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center gap-3">
                  <LocateFixed className="w-5 h-5 text-blue-500" />
                  <span className="text-zinc-800 font-semibold truncate">{t('pickup_location')}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">{t('destination')}</p>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none z-10">
                    <Search className="w-5 h-5 text-zinc-400" />
                  </div>
                  {isLoaded ? (
                    <div className="relative">
                      <Autocomplete
                        onLoad={onAutocompleteLoad}
                        onPlaceChanged={onPlaceChanged}
                        options={{
                          componentRestrictions: { country: "tn" },
                          fields: ["formatted_address", "geometry", "name"],
                          bounds: new google.maps.LatLngBounds(
                            new google.maps.LatLng(34.6, 10.6),
                            new google.maps.LatLng(34.9, 10.9)
                          )
                        }}
                      >
                        <input 
                          type="text" 
                          placeholder="ابحث عن عنوان في صفاقس..."
                          value={destination}
                          onChange={(e) => setDestination(e.target.value)}
                          onFocus={() => setIsSearchFocused(true)}
                          onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                          className="w-full h-14 pl-12 pr-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold text-zinc-800"
                        />
                      </Autocomplete>

                      {/* Suggested Places Dropdown */}
                      <AnimatePresence>
                        {isSearchFocused && !destination && suggestedPlaces.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute left-0 right-0 top-full mt-2 bg-white border border-zinc-100 rounded-2xl shadow-xl z-50 overflow-hidden"
                          >
                            <div className="p-3 border-b border-zinc-50 flex items-center justify-between">
                              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('suggested_places') || 'Suggested Places'}</p>
                              <div className="flex items-center gap-1">
                                <Zap size={10} className="text-yellow-500 fill-yellow-500" />
                                <span className="text-[10px] font-black text-yellow-600 uppercase">AI Helper</span>
                              </div>
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                              {suggestedPlaces.map((place, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    setDestination(place.name + ", " + (place.vicinity || "Sfax"));
                                    setIsSearchFocused(false);
                                    // Trigger calculation
                                    setTimeout(() => calculateTrip(), 100);
                                  }}
                                  className="w-full p-4 flex items-center gap-3 hover:bg-zinc-50 transition-colors text-right border-b border-zinc-50 last:border-0"
                                >
                                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center shrink-0">
                                    <MapPin size={16} className="text-yellow-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-zinc-900 truncate">{place.name}</p>
                                    <p className="text-[10px] text-zinc-500 truncate">{place.vicinity}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      placeholder={t('where_to')}
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full h-14 pl-12 pr-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold text-zinc-800"
                    />
                  )}
                </div>
              </div>

              <motion.button
                onClick={calculateTrip}
                disabled={!destination || isCalculating}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full h-16 bg-zinc-900 text-white rounded-2xl font-bold text-xl shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isCalculating ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>{t('confirm_destination')}</span>
                    <ArrowRight className="w-6 h-6" />
                  </>
                )}
              </motion.button>
            </>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-taxi-yellow rounded-2xl flex items-center justify-center">
                    <Car className="w-6 h-6 text-yellow-800" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-400 uppercase">{t('estimated_trip')}</p>
                    <p className="text-lg font-black text-zinc-900">{estimation.distance} • {estimation.duration}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-zinc-400 uppercase">{t('price')}</p>
                  <p className="text-2xl font-black text-green-600">Free <span className="text-xs text-zinc-400">(Pilot)</span></p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setEstimation(null)}
                  className="h-14 bg-zinc-100 text-zinc-600 rounded-2xl font-bold"
                >
                  {t('edit')}
                </button>
                <button 
                  onClick={() => onSearch(estimation, userLocation, { address: destination })}
                  className="h-14 bg-gold text-black rounded-2xl font-bold shadow-lg shadow-gold/20"
                >
                  {t('request_ride')}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Floating Action Buttons */}
      <div className="absolute right-6 bottom-80 z-20 flex flex-col gap-3">
        <button 
          onClick={() => map?.panTo(userLocation)}
          className="w-12 h-12 bg-white rounded-2xl shadow-lg flex items-center justify-center hover:bg-zinc-50 transition-colors"
        >
          <Navigation className="w-6 h-6 text-blue-500 fill-current" />
        </button>
      </div>
    </div>
  );
}

// --- Searching Driver Page Component ---
function SearchingDriverPage({ requestId, onCancel, onFound, isLoaded }: { requestId: string | null, onCancel: () => void, onFound: (tripData: any) => void, isLoaded: boolean }) {
  const { t } = useTranslation();
  const [userLocation, setUserLocation] = useState(center);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [nearbyCars, setNearbyCars] = useState<{ lat: number, lng: number, id: number }[]>([]);

  // Listen for driver acceptance
  useEffect(() => {
    if (!requestId) return;

    const unsubscribe = onSnapshot(doc(db, "trip_requests", requestId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === "accepted" && data.driverId) {
          onFound({ id: docSnap.id, ...data });
        }
      }
    });

    return () => unsubscribe();
  }, [requestId, onFound]);

  // Listen for real nearby drivers
  useEffect(() => {
    const q = query(
      collection(db, "sfax_drivers"),
      where("isOnline", "==", true),
      where("status", "==", "approved")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const drivers = snapshot.docs
        .map(doc => ({
          id: doc.id,
          lat: doc.data().location?.lat,
          lng: doc.data().location?.lng
        }))
        .filter(d => d.lat && d.lng);
      setNearbyCars(drivers as any);
    });

    return () => unsubscribe();
  }, []);

  // Request Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(pos);
          map?.panTo(pos);
        }
      );
    }
  }, [map]);

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    setMap(map);
  }, []);

  return (
    <div className="relative h-screen w-full bg-zinc-100 overflow-hidden">
      {/* Map Implementation */}
      <div className="absolute inset-0 z-0">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={userLocation}
            zoom={15}
            onLoad={onLoad}
            options={{
              styles: mapStyles,
              disableDefaultUI: true,
              zoomControl: true,
            }}
          >
            {/* User Location Marker */}
            {isLoaded && window.google && (
              <Marker 
                position={userLocation} 
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: "#3b82f6",
                  fillOpacity: 1,
                  strokeWeight: 4,
                  strokeColor: "#ffffff",
                }}
              />
            )}

            {/* Simulated Nearby Cars */}
            {nearbyCars.map(car => (
              <Marker 
                key={car.id}
                position={{ lat: car.lat, lng: car.lng }}
                icon={{
                  path: "M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z",
                  fillColor: "#22c55e", // Green as requested
                  fillOpacity: 1,
                  strokeWeight: 2,
                  strokeColor: "#ffffff",
                  scale: 1.8,
                  anchor: isLoaded && window.google ? new google.maps.Point(12, 12) : undefined,
                }}
              />
            ))}
          </GoogleMap>
        ) : (
          <div className="w-full h-full bg-zinc-200 animate-pulse" />
        )}
      </div>

      {/* Searching UI Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-64 h-64 bg-blue-500 rounded-full"
        />
      </div>

      {/* Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-20 flex justify-center">
        <motion.div 
          initial={{ y: 200 }}
          animate={{ y: 0 }}
          className="w-full max-w-md bg-white rounded-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-8 space-y-8 text-center"
        >
          <div className="space-y-2">
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center animate-bounce">
                  <Car className="w-8 h-8 text-black" />
                </div>
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 border-4 border-yellow-400 rounded-2xl"
                />
              </div>
            </div>
            <h3 className="text-2xl font-display font-black text-zinc-900 pt-4 tracking-tight">
              <span className="text-yellow-500">AI</span> {t('finding_driver')}
            </h3>
            <p className="text-zinc-500 font-medium">الذكاء الاصطناعي يقوم بتحليل موقعك والبحث عن أقرب سائق متاح في ولاية صفاقس...</p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => window.open('tel:+21600000000', '_blank')}
                className="h-16 bg-zinc-900 text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl"
              >
                <Phone size={20} />
                <span>{t('call')}</span>
              </button>
              <button 
                onClick={() => window.open('https://wa.me/21600000000', '_blank')}
                className="h-16 bg-green-500 text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl"
              >
                <MessageCircle size={20} />
                <span>{t('whatsapp')}</span>
              </button>
            </div>
            
            <button 
              onClick={onCancel}
              className="w-full h-14 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 transition-colors"
            >
              {t('cancel_ride')}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// --- Driver Found Page Component ---
function DriverFoundPage({ tripRequest, onBack, isLoaded }: { tripRequest: any, onBack: () => void, isLoaded: boolean }) {
  const { t } = useTranslation();
  const [userLocation, setUserLocation] = useState(center);
  const [driverLocation, setDriverLocation] = useState({
    lat: center.lat + 0.002,
    lng: center.lng + 0.002
  });
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [driverData, setDriverData] = useState<any>(null);
  const [currency, setCurrency] = useState<"EUR" | "TND">("TND");
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Listen for real-time driver location
  useEffect(() => {
    if (!tripRequest?.driverId) return;

    const unsubscribe = onSnapshot(doc(db, "sfax_drivers", tripRequest.driverId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.location) {
          setDriverLocation(data.location);
        }
        setDriverData(data);
      }
    });

    return () => unsubscribe();
  }, [tripRequest?.driverId]);

  const basePriceTND = tripRequest?.estimation?.price || 15;
  const exchangeRate = 0.3; // 1 TND = 0.3 EUR approx
  const displayPrice = currency === "TND" ? basePriceTND : basePriceTND * exchangeRate;

  // Request Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(pos);
          map?.panTo(pos);
        }
      );
    }
  }, [map]);

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    setMap(map);
  }, []);

  const handlePayment = async () => {
    setIsPaying(true);
    
    try {
      // Simulate Stripe Payment Processing
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Save trip to Firestore
      if (auth.currentUser) {
        const tripId = `trip_${Date.now()}`;
        const tripData = {
          id: tripId,
          driverId: "سارة محمد", // Updated to Sarah Mohammed
          passengerId: auth.currentUser.uid,
          passengerEmail: "bookingonline97@gmail.com",
          destination: "صفاقس - وسط المدينة", // Updated to Sfax
          distance: "3.5 كم",
          duration: "8 دقائق",
          earnings: basePriceTND, // Store in TND
          currency: "TND",
          date: new Date().toISOString().split('T')[0],
          timestamp: serverTimestamp()
        };
        
        await setDoc(doc(db, "trips", tripId), tripData);
        console.log("Trip saved successfully");

        // 3. Trip Completion Notification
        sendNotification(
          auth.currentUser.uid,
          "اكتملت الرحلة",
          "لقد وصلت إلى وجهتك (صفاقس - وسط المدينة). شكراً لاستخدامك 2GO!",
          "trip_complete"
        );
      }
      
      setIsPaying(false);
      setPaymentSuccess(true);
    } catch (error) {
      console.error("Error processing payment or saving trip:", error);
      setIsPaying(false);
      alert("حدث خطأ أثناء معالجة الدفع. يرجى المحاولة مرة أخرى.");
    }
  };

  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Simulate Trip Lifecycle Notifications
  useEffect(() => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;

    // 1. Driver Arrival (after 5 seconds)
    const arrivalTimer = setTimeout(() => {
      sendNotification(
        userId,
        "وصل السائق!",
        "سارة محمد وصلت إلى موقعك الآن. السيارة: تويوتا كامري (تونس 12345)",
        "driver_arrival"
      );
    }, 5000);

    // 2. Trip Start (after 15 seconds)
    const startTimer = setTimeout(() => {
      sendNotification(
        userId,
        "بدأت الرحلة",
        "رحلتك إلى وسط المدينة بدأت الآن. استمتع بالرحلة!",
        "trip_start"
      );
    }, 15000);

    return () => {
      clearTimeout(arrivalTimer);
      clearTimeout(startTimer);
    };
  }, []);

  // Real-time Chat Listener
  useEffect(() => {
    if (!auth.currentUser) return;
    
    // In a real app, we'd use the actual tripId. For this demo, we use a fixed ID for the current session.
    const tripId = "current_demo_trip"; 
    
    const q = query(
      collection(db, "chats"),
      where("tripId", "==", tripId),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChatMessages(messages);
      
      // Auto-scroll to bottom
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });

    return () => unsubscribe();
  }, []);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !auth.currentUser) return;

    const messageText = newMessage;
    setNewMessage("");

    try {
      await addDoc(collection(db, "chats"), {
        tripId: "current_demo_trip",
        senderId: auth.currentUser.uid,
        text: messageText,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      alert("يرجى اختيار تقييم أولاً");
      return;
    }

    setIsSubmittingReview(true);
    try {
      // In a real app, we'd find the latest trip or pass the tripId
      // For this demo, we'll just save a review associated with the driver
      const reviewData = {
        driverId: "سارة محمد",
        passengerId: auth.currentUser?.uid,
        rating,
        review,
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, "reviews"), reviewData);
      setReviewSubmitted(true);
      setTimeout(() => {
        setPaymentSuccess(false);
        onBack();
      }, 2000);
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("حدث خطأ أثناء إرسال التقييم");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <>
      <div className="relative h-screen w-full bg-zinc-100 overflow-hidden">
        {/* Header */}
      <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-center">
        <button 
          onClick={onBack}
          className="w-12 h-12 bg-taxi-yellow text-black rounded-2xl shadow-xl flex items-center justify-center hover:bg-yellow-500 transition-colors border border-black/10"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="bg-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="font-bold text-zinc-900">{t('driver_found')}</span>
        </div>
      </div>

      {/* Map Implementation */}
      <div className="absolute inset-0 z-0">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={userLocation}
            zoom={14}
            onLoad={onLoad}
            options={{
              styles: mapStyles,
              disableDefaultUI: true,
              zoomControl: true,
            }}
          >
            {/* User Location Marker */}
            <Marker 
              position={userLocation} 
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: "#3b82f6",
                fillOpacity: 1,
                strokeWeight: 4,
                strokeColor: "#ffffff",
              }}
            />

            {/* Driver Marker */}
            {isLoaded && window.google && (
              <Marker 
                position={driverLocation}
                icon={{
                  path: "M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z",
                  fillColor: "#FFD700",
                  fillOpacity: 1,
                  strokeWeight: 2,
                  strokeColor: "#000000",
                  scale: 2.2,
                  anchor: new google.maps.Point(12, 12),
                }}
              />
            )}

            {/* Orange Path Line */}
            <Polyline
              path={[userLocation, driverLocation]}
              options={{
                strokeColor: "#f97316", // Orange
                strokeOpacity: 0.8,
                strokeWeight: 6,
                geodesic: true,
              }}
            />
          </GoogleMap>
        ) : (
          <div className="w-full h-full bg-zinc-200" />
        )}
      </div>

      {/* Driver Info Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-20 flex justify-center">
        <motion.div 
          initial={{ y: 300 }}
          animate={{ y: 0 }}
          className="w-full max-w-md bg-white rounded-[40px] shadow-[0_-20px_60px_rgba(0,0,0,0.15)] overflow-hidden"
        >
          {/* Driver Profile Section */}
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-24 h-24 bg-zinc-100 rounded-[32px] overflow-hidden border-4 border-white shadow-xl ring-1 ring-zinc-100">
                    <img 
                      src={driverData?.profile_image_url || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&h=200&q=80"} 
                      alt={driverData?.fullName || "سائق"} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-taxi-yellow text-black text-xs font-black px-3 py-1 rounded-xl border-2 border-white shadow-lg flex items-center gap-1">
                    <Star size={12} className="fill-current" />
                    <span>4.9</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-2xl font-display font-black text-zinc-900">{driverData?.fullName || t('calculating')}</h4>
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 size={12} className="text-white" />
                    </div>
                  </div>
                  <p className="text-zinc-500 font-bold text-sm">{driverData?.carModel || t('car_model')} • {driverData?.carPlate || t('car_plate')}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="bg-zinc-900 text-white px-3 py-1 rounded-lg flex items-center gap-2 shadow-sm">
                      <span className="text-[10px] font-black opacity-50 border-r border-white/20 pr-2">TN</span>
                      <span className="text-xs font-black tracking-widest">{driverData?.carPlate || "1234 ABC"}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => setShowChat(true)}
                  className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-900 hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 shadow-sm"
                >
                  <MessageCircle className="w-6 h-6" />
                  <span className="sr-only">{t('chat')}</span>
                </button>
                <button className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-all hover:scale-105 active:scale-95 shadow-sm">
                  <Phone className="w-6 h-6" />
                  <span className="sr-only">{t('call')}</span>
                </button>
              </div>
            </div>

            {/* Trip Stats */}
            <div className="grid grid-cols-3 gap-4 py-6 border-y border-zinc-100">
              <div className="text-center space-y-1">
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">المسافة</p>
                <p className="text-xl font-black text-zinc-900">3.5 كم</p>
              </div>
              <div className="text-center space-y-1 border-x border-zinc-100">
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">الوقت</p>
                <p className="text-xl font-black text-zinc-900">8 دقائق</p>
              </div>
              <div className="text-center space-y-1">
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">السعر</p>
                <p className="text-xl font-black text-yellow-600">
                  0 {t('currency')}
                </p>
              </div>
            </div>

            {/* Direct Connection Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => window.open(`tel:${driverData?.phone || '+21600000000'}`, '_blank')}
                className="h-16 bg-zinc-900 text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl"
              >
                <Phone size={20} />
                <span>{t('call')}</span>
              </button>
              <button 
                onClick={() => window.open(`https://wa.me/${driverData?.phone?.replace(/\+/g, '') || '21600000000'}`, '_blank')}
                className="h-16 bg-green-500 text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl"
              >
                <MessageCircle size={20} />
                <span>{t('whatsapp')}</span>
              </button>
            </div>

            <motion.button
              onClick={onBack}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full h-16 bg-yellow-400 text-black rounded-2xl font-black text-lg shadow-xl flex items-center justify-center gap-3"
            >
              <span>{t('back')}</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>

      {/* Chat Modal */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            className="fixed inset-0 z-50 bg-white flex flex-col"
          >
            {/* Chat Header */}
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-white sticky top-0">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowChat(false)}
                  className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-900"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h4 className="font-black text-zinc-900">{driverData?.fullName || "سارة محمد"}</h4>
                  <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">{t('online')}</p>
                </div>
              </div>
              <div className="w-10 h-10 bg-zinc-100 rounded-xl overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80" 
                  alt="Sarah" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                  <MessageCircle size={48} />
                  <p className="font-bold">{t('chat')}</p>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = msg.senderId === auth.currentUser?.uid;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, scale: 0.9, x: isMe ? 20 : -20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] p-4 rounded-3xl font-bold text-sm shadow-sm ${
                        isMe 
                          ? 'bg-zinc-900 text-white rounded-br-none' 
                          : 'bg-white text-zinc-900 rounded-bl-none border border-zinc-100'
                      }`}>
                        {msg.text}
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-6 bg-white border-t border-zinc-100 space-y-4">
              {/* Quick Replies */}
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {["أنا قادم الآن", "أين أنت بالضبط؟", "سأصل خلال دقيقتين", "شكراً لك"].map((reply) => (
                  <button
                    key={reply}
                    onClick={() => setNewMessage(reply)}
                    className="whitespace-nowrap px-4 py-2 bg-zinc-100 hover:bg-yellow-400 hover:text-black rounded-full text-xs font-bold text-zinc-600 transition-colors border border-zinc-200"
                  >
                    {reply}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <input 
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={t('chat')}
                  className="flex-1 h-14 bg-zinc-50 border border-zinc-100 rounded-2xl px-6 font-bold text-zinc-900 focus:outline-none focus:border-yellow-400 transition-colors"
                />
                <button 
                  type="submit"
                  className="w-14 h-14 bg-yellow-400 text-black rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-400/20 hover:bg-yellow-500 transition-colors"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Success Modal */}
      <AnimatePresence>
        {paymentSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm bg-white rounded-[40px] p-8 text-center space-y-6 shadow-2xl my-8"
            >
              {reviewSubmitted ? (
                <div className="py-8 space-y-4">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-black text-zinc-900">{t('trip_completed')}</h3>
                  <p className="text-zinc-500 font-medium">تم إرسال تقييمك بنجاح. نتمنى لك يوماً سعيداً.</p>
                </div>
              ) : (
                <>
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-10 h-10 text-green-600" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-zinc-900">{t('trip_completed')}</h3>
                    <p className="text-zinc-500 font-medium">تم تأكيد رحلتك بنجاح. السائق في طريقه إليك الآن.</p>
                  </div>

                  <div className="bg-zinc-50 rounded-3xl p-6 space-y-4 border border-zinc-100">
                    <p className="text-sm font-black text-zinc-900">كيف كانت تجربتك مع {driverData?.fullName || "سارة"}؟</p>
                    <div className="flex justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button 
                          key={star}
                          onClick={() => setRating(star)}
                          className="focus:outline-none transition-transform active:scale-90"
                        >
                          <Star 
                            size={32} 
                            className={`${rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-300'}`} 
                          />
                        </button>
                      ))}
                    </div>
                    <textarea 
                      placeholder={t('chat')}
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                      className="w-full h-24 p-4 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium text-zinc-900 resize-none"
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={handleSubmitReview}
                      disabled={isSubmittingReview || rating === 0}
                      className="w-full h-16 bg-zinc-900 text-white rounded-2xl font-black hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmittingReview ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        t('submit_application')
                      )}
                    </button>
                    <button 
                      onClick={() => {
                        setPaymentSuccess(false);
                        onBack();
                      }}
                      className="text-zinc-400 font-bold text-sm hover:text-zinc-600 transition-colors"
                    >
                      {t('back')}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// --- Terms and Conditions Modal Component ---
const TermsModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
          >
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gold rounded-xl flex items-center justify-center shadow-lg shadow-gold/20">
                  <ShieldCheck className="text-black" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-zinc-900 leading-none">Privacy Policy & Terms</h3>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Legal Document v1.0</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center hover:bg-zinc-200 transition-colors"
              >
                <X size={20} className="text-zinc-600" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8 text-left" dir="ltr">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Entity</p>
                    <p className="text-xs font-bold text-zinc-900">Swift Drive LLC</p>
                  </div>
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Jurisdiction</p>
                    <p className="text-xs font-bold text-zinc-900">Wyoming, USA</p>
                  </div>
                </div>
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-3">
                  <FileText className="text-blue-500" size={20} />
                  <p className="text-xs font-bold text-blue-700">App Name: 2GO</p>
                </div>
              </div>

              <section className="space-y-3">
                <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-6 h-6 bg-zinc-900 text-white rounded-lg flex items-center justify-center text-[10px]">1</span>
                  {t('introduction')}
                </h4>
                <p className="text-sm text-zinc-600 leading-relaxed font-medium">
                  {t('introduction_body')}
                </p>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-6 h-6 bg-zinc-900 text-white rounded-lg flex items-center justify-center text-[10px]">2</span>
                  {t('data_collection')}
                </h4>
                <p className="text-sm text-zinc-600 leading-relaxed font-medium">
                  {t('data_collection_body')}
                </p>
                <ul className="space-y-2">
                  {[t('data_item_1'), t('data_item_2'), t('data_item_3'), t('data_item_4')].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-zinc-600 font-medium">
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-6 h-6 bg-zinc-900 text-white rounded-lg flex items-center justify-center text-[10px]">3</span>
                  {t('use_of_data')}
                </h4>
                <p className="text-sm text-zinc-600 leading-relaxed font-medium">
                  {t('use_of_data_body')}
                </p>
                <ul className="space-y-2">
                  {[t('use_item_1'), t('use_item_2'), t('use_item_3'), t('use_item_4')].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-zinc-600 font-medium">
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-6 h-6 bg-zinc-900 text-white rounded-lg flex items-center justify-center text-[10px]">4</span>
                  {t('driver_requirements')}
                </h4>
                <p className="text-sm text-zinc-600 leading-relaxed font-medium">
                  {t('driver_requirements_body')}
                </p>
                <ul className="space-y-2">
                  {[t('driver_item_1'), t('driver_item_2'), t('driver_item_3')].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-zinc-600 font-medium">
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-6 h-6 bg-zinc-900 text-white rounded-lg flex items-center justify-center text-[10px]">5</span>
                  {t('liability')}
                </h4>
                <p className="text-sm text-zinc-600 leading-relaxed font-medium">
                  {t('liability_body')}
                </p>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-6 h-6 bg-zinc-900 text-white rounded-lg flex items-center justify-center text-[10px]">6</span>
                  Third-Party Disclosure
                </h4>
                <p className="text-sm text-zinc-600 leading-relaxed font-medium">
                  We do not sell your personal data. We only share information with essential service providers (e.g., payment gateways and map services) required to operate the app.
                </p>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-6 h-6 bg-zinc-900 text-white rounded-lg flex items-center justify-center text-[10px]">7</span>
                  Contact Us
                </h4>
                <p className="text-sm text-zinc-600 leading-relaxed font-medium">
                  For any inquiries regarding your data or these terms, please contact: <br/>
                  <span className="font-black text-zinc-900 mt-2 block">Email: bookingonline97@gmail.com</span>
                </p>
              </section>

              <div className="pt-8 border-t border-zinc-100 text-center">
                <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">Powered by: Swift Drive LLC, Wyoming, USA</p>
              </div>
            </div>

            <div className="p-6 bg-zinc-50 border-t border-zinc-100">
              <button 
                onClick={onClose}
                className="w-full h-14 bg-zinc-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-zinc-200 hover:bg-zinc-800 transition-all active:scale-95"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- Sfax Pilot Registration Page ---
function SfaxPilotRegistrationPage({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    licenseId: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone || !formData.licenseId) {
      toast.error("Veuillez remplir tous les champs / يرجى ملء جميع الحقول");
      return;
    }

    setIsSubmitting(true);
    try {
      const pilotData = {
        ...formData,
        status: "approved",
        createdAt: serverTimestamp(),
        region: "Sfax",
        type: "Pilot"
      };

      // Path requested: /artifacts/{appId}/public/data/sfax_pilots
      const appId = "1:296953656151:web:d25cb7d1d876f42ff58412";
      await addDoc(collection(db, "artifacts", appId, "public", "data", "sfax_pilots"), pilotData);
      
      setShowSuccess(true);
      toast.success("Bienvenue dans le pilote ! / مرحباً بك في البرنامج التجريبي");
    } catch (error) {
      console.error("Error joining pilot:", error);
      toast.error("Erreur lors de l'inscription / خطأ في التسجيل");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-3xl font-black text-zinc-900">Félicitations ! / مبروك!</h2>
        <p className="text-zinc-500 font-medium">
          Vous faites maintenant partie du programme pilote 2GO à Sfax.
          <br />
          لقد أصبحت الآن جزءاً من برنامج 2GO التجريبي في صفاقس.
        </p>
        <button 
          onClick={onBack}
          className="w-full h-16 bg-zinc-900 text-white rounded-2xl font-bold"
        >
          {t('back')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans">
      <div className="p-6 bg-white border-b border-zinc-100 flex items-center justify-between sticky top-0 z-30">
        <button 
          onClick={onBack}
          className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center text-black shadow-md"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-black text-zinc-900">{t('join_pilot')}</h2>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 p-6 max-w-md mx-auto w-full space-y-8">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-taxi-yellow rounded-3xl flex items-center justify-center mx-auto shadow-xl">
            <Car size={40} className="text-black" />
          </div>
          <h3 className="text-2xl font-black text-zinc-900">Sfax Taxi Pilot</h3>
          <p className="text-zinc-500 font-medium">Inscription rapide pour les chauffeurs de taxi à Sfax</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">{t('full_name')}</label>
              <input 
                type="text" 
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                placeholder="Nom complet / الاسم الكامل"
                className="w-full h-14 px-4 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">{t('phone')}</label>
              <input 
                type="tel" 
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="Numéro de téléphone / رقم الهاتف"
                className="w-full h-14 px-4 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">{t('license_id')}</label>
              <input 
                type="text" 
                value={formData.licenseId}
                onChange={(e) => setFormData({...formData, licenseId: e.target.value})}
                placeholder="Numéro de licence / رقم الرخصة"
                className="w-full h-14 px-4 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none font-bold"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full h-16 bg-taxi-yellow text-black rounded-2xl font-black text-lg shadow-xl shadow-yellow-400/20 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>{t('submit_application')}</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div className="p-6 bg-yellow-50 rounded-3xl border border-yellow-100">
          <p className="text-xs font-bold text-yellow-800 leading-relaxed text-center">
            Ce programme est 100% gratuit pour les chauffeurs de taxi à Sfax pendant la période d'essai.
            <br />
            هذا البرنامج مجاني 100% لسائقي التاكسي في صفاقس خلال الفترة التجريبية.
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Driver Registration Page Component ---
function DriverRegistrationPage({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "+216 ",
    carModel: "",
    carYear: "",
    carPlate: "",
    vehicleType: "",
    preferredCurrency: "TND",
    payoutMethod: "bank_transfer",
    bankName: "Attijari Bank - البنك التجاري",
    accountNumber: "",
    swiftCode: "",
    bio: "",
    termsAccepted: false
  });
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);
  const [carPhoto, setCarPhoto] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const idInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'car' | 'profile' | 'id') => {
    const file = e.target.files?.[0];
    if (file) {
      // Image Compression Logic
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Max dimensions
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Quality 0.7 for good balance
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          
          if (type === 'car') setCarPhoto(compressedBase64);
          else if (type === 'profile') setProfilePhoto(compressedBase64);
          else setIdPhoto(compressedBase64);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const validateCarYear = () => {
    const currentYear = new Date().getFullYear();
    const year = parseInt(formData.carYear);
    if (isNaN(year) || currentYear - year > 3) {
      return false;
    }
    return true;
  };

  const generateBio = async () => {
    if (!formData.fullName || !formData.carModel) {
      setError("يرجى إدخال الاسم وموديل السيارة أولاً لتوليد نبذة تعريفية.");
      return;
    }

    setIsGeneratingBio(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `أنت مساعد ذكي لتطبيق 2GO لتوصيل الركاب في مدينة صفاقس. 
        قم بكتابة نبذة تعريفية قصيرة وجذابة (باللغة العربية) لسائق اسمه ${formData.fullName} يقود سيارة ${formData.carModel}. 
        اجعلها تبدو احترافية وودودة للركاب. لا تزد عن 30 كلمة.`,
      });
      
      if (response.text) {
        setFormData(prev => ({ ...prev, bio: response.text.trim() }));
      }
    } catch (err) {
      console.error("Gemini AI error:", err);
      setError("فشل توليد النبذة التعريفية. يرجى المحاولة لاحقاً.");
    } finally {
      setIsGeneratingBio(false);
    }
  };

  const analyzeDocument = async (base64Image: string, type: 'id' | 'license') => {
    if (!base64Image || !base64Image.includes(',')) {
      return {
        isClear: false,
        isAuthentic: false,
        isValid: false,
        summary: "لم يتم توفير صورة للفحص التلقائي.",
        rejectionReason: null,
        needsManualReview: true
      };
    }
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image.split(',')[1],
              },
            },
            {
              text: `Analyze this ${type === 'id' ? 'ID card' : 'Driver License'} image for a ride-sharing app onboarding. 
              Check for:
              1. Clarity: Is the text readable?
              2. Authenticity: Does it look like a real document?
              3. Expiry: If visible, is it still valid?
              Return a JSON object with:
              - isClear (boolean)
              - isAuthentic (boolean)
              - isValid (boolean)
              - summary (string in Arabic explaining the result)
              - rejectionReason (string in Arabic if any check fails, otherwise null)
              - needsManualReview (boolean if you are unsure)`,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isClear: { type: Type.BOOLEAN },
              isAuthentic: { type: Type.BOOLEAN },
              isValid: { type: Type.BOOLEAN },
              summary: { type: Type.STRING },
              rejectionReason: { type: Type.STRING },
              needsManualReview: { type: Type.BOOLEAN },
            },
            required: ["isClear", "isAuthentic", "isValid", "summary", "needsManualReview"],
          },
        },
      });

      return JSON.parse(response.text || "{}");
    } catch (err) {
      console.error("AI Analysis error:", err);
      return { isClear: false, isAuthentic: false, isValid: false, summary: "فشل التحليل الآلي", needsManualReview: true };
    }
  };

  const handleSubmit = async () => {
    // Removed car year restriction to allow all models for pilot phase
    if (!formData.fullName || !formData.phone) {
      setError("يرجى ملء الاسم ورقم الهاتف.");
      return;
    }

    if (!formData.termsAccepted) {
      setError("يجب الموافقة على الشروط والأحكام للمتابعة.");
      return;
    }

    // Phone Validation - Simplified (ensure at least something is entered)
    if (!formData.phone || formData.phone.length < 5) {
      setError("يرجى إدخال رقم هاتف صحيح");
      return;
    }

    // Email Validation - Simplified
    if (formData.email && !formData.email.includes('@')) {
      setError(t('invalid_email'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");

      console.log("Starting registration for user:", user.uid);

      // Add a timeout to the entire process
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("انتهت مهلة الطلب. يرجى التحقق من اتصال الإنترنت.")), 30000)
      );

      const registrationProcess = (async () => {
        let carPhotoUrl = "";
        let profilePhotoUrl = user.photoURL || "";
        let idPhotoUrl = "";

        // Parallel Uploads for efficiency and reliability
        const uploadPromises = [];

        if (carPhoto && carPhoto.startsWith('data:image')) {
          const carPhotoRef = ref(storage, `drivers/${user.uid}/car_front.jpg`);
          uploadPromises.push(
            uploadString(carPhotoRef, carPhoto, 'data_url')
              .then(() => getDownloadURL(carPhotoRef))
              .then(url => { 
                carPhotoUrl = url; 
                console.log("Car photo uploaded:", url); 
              })
              .catch(err => {
                console.error("Car upload error:", err);
                toast.error("خطأ في رفع صورة السيارة");
              })
          );
        }

        if (profilePhoto && profilePhoto.startsWith('data:image')) {
          const profilePhotoRef = ref(storage, `drivers/${user.uid}/profile.jpg`);
          uploadPromises.push(
            uploadString(profilePhotoRef, profilePhoto, 'data_url')
              .then(() => getDownloadURL(profilePhotoRef))
              .then(url => { 
                profilePhotoUrl = url; 
                console.log("Profile photo uploaded:", url); 
              })
              .catch(err => {
                console.error("Profile upload error:", err);
              })
          );
        }

        if (idPhoto && idPhoto.startsWith('data:image')) {
          const idPhotoRef = ref(storage, `drivers/${user.uid}/id_card.jpg`);
          uploadPromises.push(
            uploadString(idPhotoRef, idPhoto, 'data_url')
              .then(() => getDownloadURL(idPhotoRef))
              .then(url => { 
                idPhotoUrl = url; 
                console.log("ID photo uploaded:", url); 
              })
              .catch(err => {
                console.error("ID upload error:", err);
                toast.error("خطأ في رفع صورة الهوية");
              })
          );
        }

        // Wait for all uploads to finish before continuing
        await Promise.all(uploadPromises);

        setIsAnalyzing(true);
        const aiResult = await analyzeDocument(idPhoto || "", 'id');
        setIsAnalyzing(false);

        const finalStatus = "approved"; // Set to approved for testing as requested

        const driverData = {
          uid: user.uid,
          fullName: formData.fullName,
          email: formData.email || user.email || `${user.uid}@2go.app`,
          phone: formData.phone,
          carModel: formData.carModel,
          carYear: Number(formData.carYear),
          carPlate: formData.carPlate,
          vehicleType: formData.vehicleType,
          preferredCurrency: formData.preferredCurrency,
          payoutMethod: formData.payoutMethod,
          bankName: formData.payoutMethod === 'bank_transfer' ? formData.bankName : null,
          accountNumber: formData.payoutMethod === 'bank_transfer' ? formData.accountNumber : null,
          swiftCode: formData.payoutMethod === 'bank_transfer' ? formData.swiftCode : null,
          bio: formData.bio,
          car_image_url: carPhotoUrl || "",
          profile_image_url: profilePhotoUrl || "",
          id_card_url: idPhotoUrl || "",
          status: finalStatus,
          aiReviewResult: aiResult.summary,
          rejectionReason: aiResult.rejectionReason || null,
          isFlaggedForManualReview: aiResult.needsManualReview || (finalStatus === ("pending" as string) && !aiResult.rejectionReason),
          createdAt: serverTimestamp()
        };

        console.log("Attempting to save driver data to sfax_drivers:", JSON.stringify(driverData, null, 2));
        await setDoc(doc(db, "sfax_drivers", user.uid), driverData);
        console.log("Driver data saved successfully to sfax_drivers");
        return true;
      })();

      await Promise.race([registrationProcess, timeoutPromise]);
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error("Full Registration Error Object:", err);
      let errorMessage = "حدث خطأ أثناء حفظ البيانات.";
      
      if (err.message?.includes("insufficient permissions") || err.code === "permission-denied") {
        errorMessage = "خطأ في الصلاحيات: يرجى التأكد من تفعيل Firestore Rules للبرنامج التجريبي.";
      } else if (err.message?.includes("timed out")) {
        errorMessage = err.message;
      } else if (err.message) {
        errorMessage += ` (${err.message})`;
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans relative overflow-x-hidden">
      {/* Header */}
      <div className="p-6 bg-white border-b border-zinc-100 flex items-center justify-between sticky top-0 z-30">
        <button 
          onClick={onBack}
          className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center text-black shadow-md"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-black text-zinc-900">{t('driver_registration')}</h2>
        <div className="w-10"></div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-zinc-100">
        <motion.div 
          initial={{ width: "0%" }}
          animate={{ width: `${(step / 3) * 100}%` }}
          className="h-full bg-yellow-400"
        />
      </div>

      <div className="flex-1 p-6 max-w-md mx-auto w-full space-y-8 pb-32">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-zinc-900">{t('driver_registration')}</h3>
                <p className="text-zinc-500 font-medium">أدخل معلوماتك الأساسية للتواصل</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-400 flex items-center gap-2">
                    <UserCircle size={16} /> الاسم الكامل
                  </label>
                  <input 
                    type="text" 
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="أدخل اسمك كما في الهوية"
                    className="w-full h-14 px-4 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-400 flex items-center gap-2">
                    <Mail size={16} /> البريد الإلكتروني
                  </label>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="example@mail.com"
                    className="w-full h-14 px-4 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-400 flex items-center gap-2">
                    <Phone size={16} /> رقم الهاتف
                  </label>
                  <input 
                    type="tel" 
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+216 XXXXXXXX"
                    pattern="^\+216\s\d{8}$"
                    className="w-full h-14 px-4 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none font-bold"
                  />
                </div>
              </div>

              <button 
                onClick={() => setStep(2)}
                disabled={!formData.fullName || !formData.phone}
                className="w-full h-16 bg-zinc-900 text-white rounded-2xl font-black text-lg disabled:opacity-50"
              >
                {t('next')}
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-zinc-900">{t('car_model')}</h3>
                <p className="text-zinc-500 font-medium">أدخل تفاصيل سيارتك التي ستعمل بها</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-400 flex items-center gap-2">
                    <Car size={16} /> موديل السيارة
                  </label>
                  <input 
                    type="text" 
                    name="carModel"
                    value={formData.carModel}
                    onChange={handleInputChange}
                    placeholder="مثلاً: تويوتا كامري"
                    className="w-full h-14 px-4 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-400 flex items-center gap-2">
                    <Calendar size={16} /> سنة الصنع
                  </label>
                  <input 
                    type="number" 
                    name="carYear"
                    value={formData.carYear}
                    onChange={handleInputChange}
                    placeholder="2024"
                    className="w-full h-14 px-4 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-400 flex items-center gap-2">
                    <Hash size={16} /> رقم اللوحة
                  </label>
                  <input 
                    type="text" 
                    name="carPlate"
                    value={formData.carPlate}
                    onChange={handleInputChange}
                    placeholder="أ ب ج 1234"
                    className="w-full h-14 px-4 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-400 flex items-center gap-2">
                    <Car size={16} /> {t('vehicle_type')}
                  </label>
                  <input 
                    type="text"
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleInputChange}
                    placeholder={t('vehicle_model_placeholder')}
                    className="w-full h-14 px-4 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-400 flex items-center gap-2">
                    <CreditCard size={16} /> العملة المفضلة للأرباح
                  </label>
                  <select 
                    name="preferredCurrency"
                    value={formData.preferredCurrency}
                    onChange={handleInputChange}
                    className="w-full h-14 px-4 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none font-bold appearance-none"
                  >
                    <option value="TND">{t('tnd')}</option>
                    <option value="EUR">{t('eur')}</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-black text-zinc-400 flex items-center gap-2 uppercase tracking-widest">
                    <CreditCard size={16} /> طريقة استلام الأرباح
                  </label>
                  <div className="grid grid-cols-1 gap-4">
                    {/* Bank Transfer Option */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, payoutMethod: 'bank_transfer' }))}
                      className={`relative p-6 rounded-[32px] border-2 transition-all text-right flex flex-col gap-4 ${
                        formData.payoutMethod === 'bank_transfer' 
                          ? 'border-yellow-400 bg-yellow-50/50 shadow-xl shadow-yellow-400/10' 
                          : 'border-zinc-100 bg-white hover:border-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                          formData.payoutMethod === 'bank_transfer' ? 'bg-yellow-400 text-black' : 'bg-zinc-100 text-zinc-400'
                        }`}>
                          <Clock size={28} />
                        </div>
                        {formData.payoutMethod === 'bank_transfer' && (
                          <div className="bg-yellow-400 text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                            مختار
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-xl font-black text-zinc-900">{t('local_payment')}</p>
                        <p className="text-sm font-bold text-zinc-500">تحويل مباشر وآمن إلى حسابك البنكي في تونس.</p>
                      </div>

                      <div className="pt-4 border-t border-zinc-100 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-600">
                          <CheckCircle2 size={14} className="text-green-500" />
                          <span>لا توجد رسوم إضافية على التحويل</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
                          <Clock size={14} />
                          <span>وقت المعالجة: 1 - 3 أيام عمل</span>
                        </div>
                      </div>
                    </motion.button>
                  </div>

                  {/* Conditional Bank Details Fields */}
                  <AnimatePresence>
                    {formData.payoutMethod === 'bank_transfer' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 pt-4 overflow-hidden"
                      >
                        <div className="p-4 bg-yellow-50/50 rounded-2xl border border-yellow-100 space-y-4">
                          <p className="text-xs font-black text-yellow-700 uppercase tracking-widest">تفاصيل الحساب البنكي</p>
                          
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-400">{t('bank_name')}</label>
                            <input 
                              type="text" 
                              name="bankName"
                              value={formData.bankName}
                              readOnly
                              className="w-full h-12 px-4 bg-zinc-100 border border-zinc-200 rounded-xl outline-none font-bold text-sm text-zinc-500 cursor-not-allowed"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-400">{t('account_number')}</label>
                            <input 
                              type="text" 
                              name="accountNumber"
                              value={formData.accountNumber}
                              onChange={handleInputChange}
                              placeholder="AE00 0000 0000 0000 0000 000"
                              className="w-full h-12 px-4 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none font-bold text-sm"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-400">{t('swift_code')}</label>
                            <input 
                              type="text" 
                              name="swiftCode"
                              value={formData.swiftCode}
                              onChange={handleInputChange}
                              placeholder="XXXX AE XX"
                              className="w-full h-12 px-4 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none font-bold text-sm"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="flex-1 h-16 bg-zinc-100 text-zinc-600 rounded-2xl font-black">{t('back')}</button>
                <button 
                  onClick={() => setStep(3)}
                  disabled={!formData.carModel || !formData.carYear || !formData.carPlate}
                  className="flex-[2] h-16 bg-zinc-900 text-white rounded-2xl font-black"
                >
                  {t('next')}
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-zinc-900">الصور والتوثيق (اختياري حالياً)</h3>
                <p className="text-zinc-500 font-medium">يمكنك تخطي هذه الخطوة أو رفع الصور لاحقاً</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div 
                  onClick={() => profileInputRef.current?.click()}
                  className="aspect-square bg-white border-2 border-dashed border-zinc-200 rounded-3xl flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:border-yellow-400 transition-colors overflow-hidden relative"
                >
                  {profilePhoto ? (
                    <img src={profilePhoto} className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <>
                      <Camera className="text-zinc-400 mb-2" size={32} />
                      <span className="text-xs font-bold text-zinc-500">صورة شخصية حديثة</span>
                    </>
                  )}
                  <input type="file" ref={profileInputRef} hidden accept="image/*" onChange={(e) => handlePhotoUpload(e, 'profile')} />
                </div>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square bg-white border-2 border-dashed border-zinc-200 rounded-3xl flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:border-yellow-400 transition-colors overflow-hidden relative"
                >
                  {carPhoto ? (
                    <img src={carPhoto} className="absolute inset-0 w-full h-full object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <>
                      <Car className="text-zinc-400 mb-2" size={32} />
                      <span className="text-xs font-bold text-zinc-500">صورة السيارة (أمامية)</span>
                    </>
                  )}
                  <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => handlePhotoUpload(e, 'car')} />
                </div>

                <div 
                  onClick={() => idInputRef.current?.click()}
                  className="aspect-square bg-white border-2 border-dashed border-zinc-200 rounded-3xl flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:border-yellow-400 transition-colors overflow-hidden relative col-span-2"
                >
                  {idPhoto ? (
                    <img src={idPhoto} className="absolute inset-0 w-full h-full object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <>
                      <IdCard className="text-zinc-400 mb-2" size={32} />
                      <span className="text-xs font-bold text-zinc-500">صورة الهوية الوطنية / جواز السفر</span>
                    </>
                  )}
                  <input type="file" ref={idInputRef} hidden accept="image/*" onChange={(e) => handlePhotoUpload(e, 'id')} />
                </div>
              </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-400 flex items-center gap-2">
                    <ClipboardList size={16} /> نبذة تعريفية (Bio)
                  </label>
                  <div className="relative">
                    <textarea 
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      placeholder="أخبر الركاب قليلاً عن نفسك..."
                      className="w-full h-24 p-4 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none font-medium resize-none text-black"
                    />
                    <button 
                      type="button"
                      onClick={generateBio}
                      disabled={isGeneratingBio}
                      className="absolute bottom-3 left-3 px-3 py-1.5 bg-yellow-400 text-black rounded-xl text-xs font-black flex items-center gap-1 hover:bg-yellow-500 transition-colors disabled:opacity-50"
                    >
                      {isGeneratingBio ? "جاري التوليد..." : "توليد بالذكاء الاصطناعي ✨"}
                    </button>
                  </div>
                </div>

              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                <AlertCircle className="text-blue-500 shrink-0" size={20} />
                <p className="text-xs font-bold text-blue-700 leading-relaxed">
                  تأكد من أن لوحة أرقام السيارة واضحة تماماً في الصورة لتجنب رفض الطلب.
                </p>
              </div>

              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      name="termsAccepted"
                      checked={formData.termsAccepted}
                      onChange={handleInputChange}
                      className="peer h-6 w-6 cursor-pointer appearance-none rounded-lg border-2 border-zinc-200 bg-white checked:bg-yellow-400 checked:border-yellow-400 transition-all" 
                    />
                    <CheckCircle2 className="absolute h-6 w-6 text-black opacity-0 peer-checked:opacity-100 pointer-events-none p-1" />
                  </div>
                  <span className="text-sm font-bold text-zinc-600 leading-tight">
                    أوافق على <button type="button" onClick={() => setShowTermsModal(true)} className="text-blue-600 underline">الشروط والأحكام</button> وسياسة الخصوصية الخاصة بـ 2GO.
                  </span>
                </label>
              </div>

              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold flex items-center gap-2">
                  <AlertCircle size={18} /> {error}
                </div>
              )}

              <div className="flex gap-4">
                <button onClick={() => setStep(2)} className="flex-1 h-16 bg-zinc-100 text-zinc-600 rounded-2xl font-black">{t('back')}</button>
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting || !carPhoto || !profilePhoto || !idPhoto}
                  className="flex-[2] h-16 bg-yellow-400 text-black rounded-2xl font-black flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-yellow-400/20"
                >
                  {isSubmitting || isAnalyzing ? (
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>{isAnalyzing ? t('analyzing_docs') : t('processing')}</span>
                    </div>
                  ) : (
                    <>{t('register_new_driver')} <ShieldCheck size={20} /></>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="relative bg-white w-full max-w-sm rounded-[40px] p-8 text-center space-y-6 shadow-2xl"
            >
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={48} />
              </div>
              <div className="space-y-2">
                <h4 className="text-2xl font-black text-zinc-900">{t('trip_completed')}</h4>
                <p className="text-zinc-500 font-bold leading-relaxed">
                  سيتم مراجعة طلبك للانضمام إلى العمل معنا وتصبح عضواً مساهماً في التطبيق.
                </p>
              </div>
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                <p className="text-sm font-bold text-zinc-600">
                  مراجعة طلبات الموافقة تستغرق من <span className="text-zinc-900">24 إلى 48 ساعة</span>. ستصلك رسالة عبر البريد الإلكتروني بالنتيجة.
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowSuccessModal(false);
                  onBack();
                }}
                className="w-full h-16 bg-zinc-900 text-white rounded-2xl font-black"
              >
                {t('back')}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Driver Portal Page Component ---
function DriverPortalPage({ onBack, onRegister, onStartWork, onViewHistory, onOpenAdmin }: { onBack: () => void, onRegister: () => void, onStartWork: () => void, onViewHistory: () => void, onOpenAdmin: () => void }) {
  const { t } = useTranslation();
  const [driverData, setDriverData] = useState<any>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDriverData = async () => {
      if (auth.currentUser) {
        setIsAdminUser(auth.currentUser.email === "fixteamdorr@gmail.com");
        const docRef = doc(db, "sfax_drivers", auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setDriverData(docSnap.data());
        }
      }
      setIsLoading(false);
    };
    fetchDriverData();
  }, []);

  const handleStartWork = async () => {
    if (!driverData) {
      toast.error(t('complete_registration_first'));
      return;
    }

    const now = new Date();
    const startTime = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const startDate = now.toISOString().split('T')[0];
    
    // Expected end time (10 hours later)
    const end = new Date(now.getTime() + 10 * 60 * 60 * 1000);
    const endTime = end.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

    try {
      // Save shift to Firestore
      await addDoc(collection(db, "driver_shifts"), {
        driverId: auth.currentUser?.uid,
        driverName: driverData.fullName,
        phone: driverData.phone,
        startDate: startDate,
        startTime: startTime,
        expectedEnd: endTime,
        timestamp: serverTimestamp()
      });
      
      toast.success(t('shift_started'));
      onStartWork();
    } catch (error) {
      console.error("Error starting shift:", error);
      toast.error("حدث خطأ أثناء بدء العمل");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans overflow-hidden relative">
      {/* Background Decorative Icons */}
      <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-10 rotate-12"><IdCard size={120} /></div>
        <div className="absolute bottom-20 right-10 -rotate-12"><Car size={150} /></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10"><ShieldCheck size={300} /></div>
        <div className="absolute top-1/4 right-1/4 rotate-45"><Camera size={80} /></div>
      </div>

      {/* Header */}
      <div className="p-6 flex items-center justify-between relative z-10">
        <button 
          onClick={onBack}
          className="w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center hover:bg-yellow-500 transition-colors shadow-lg"
        >
          <ArrowLeft className="w-6 h-6 text-black" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
            <span className="font-black text-black text-sm">2</span>
          </div>
          <span className="font-black text-xl tracking-tight">2GO DRIVER</span>
        </div>
      </div>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 relative z-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-24 h-24 bg-yellow-400 rounded-[32px] flex items-center justify-center shadow-2xl shadow-yellow-400/20 mb-4"
        >
          <UserCircle size={48} className="text-black" />
        </motion.div>
        
        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-tight">{t('driver_portal')}</h2>
          <p className="text-zinc-400 font-medium text-lg max-w-xs mx-auto">
            {t('slogan')}
          </p>
        </div>

        {(driverData?.status === 'approved' || driverData?.status === 'auto-approved') && (
          <DriverStats driverId={auth.currentUser?.uid || ""} />
        )}

        {driverData?.status === 'rejected' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xs p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm font-bold flex items-start gap-3"
          >
            <AlertCircle size={20} className="shrink-0" />
            <div className="text-right">
              <p>{t('rejected')}</p>
              <p className="text-[10px] opacity-80 mt-1">{t('reason')}: {driverData.rejectionReason || "يرجى إعادة رفع الوثائق بشكل أوضح"}</p>
            </div>
          </motion.div>
        )}

        {driverData?.status === 'approved' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xs p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-500 text-sm font-bold flex items-start gap-3"
          >
            <ShieldCheck size={20} className="shrink-0" />
            <div className="text-right">
              <p>{t('approved')}</p>
              <p className="text-[10px] opacity-80 mt-1">أنت الآن جاهز لاستقبال الطلبات</p>
            </div>
          </motion.div>
        )}

        {driverData?.status === 'auto-approved' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xs p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-500 text-sm font-bold flex items-start gap-3"
          >
            <ShieldCheck size={20} className="shrink-0" />
            <div className="text-right">
              <p>{t('approved')}</p>
              <p className="text-[10px] opacity-80 mt-1">وثائقك سليمة وجاهزة للعمل</p>
            </div>
          </motion.div>
        )}

        {driverData?.status === 'pending' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xs p-4 bg-yellow-400/10 border border-yellow-400/20 rounded-2xl text-yellow-400 text-sm font-bold flex items-start gap-3"
          >
            <ClipboardList size={20} className="shrink-0" />
            <div className="text-right">
              <p>{t('pending')}</p>
              <p className="text-[10px] opacity-80 mt-1">سيتم إشعارك فور اكتمال مراجعة وثائقك</p>
            </div>
          </motion.div>
        )}

        {/* Requirements Badges */}
        <div className="flex flex-wrap justify-center gap-3 pt-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${driverData?.id_card_url ? 'bg-green-500/10 border-green-500/20' : 'bg-white/5 border-white/10'}`}>
            <IdCard size={16} className={driverData?.id_card_url ? 'text-green-500' : 'text-yellow-400'} />
            <span className={`text-xs font-bold ${driverData?.id_card_url ? 'text-green-500' : 'text-zinc-300'}`}>
              {driverData?.id_card_url ? t('id_uploaded') : t('id_card')}
            </span>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${driverData?.car_image_url ? 'bg-green-500/10 border-green-500/20' : 'bg-white/5 border-white/10'}`}>
            <Car size={16} className={driverData?.car_image_url ? 'text-green-500' : 'text-yellow-400'} />
            <span className={`text-xs font-bold ${driverData?.car_image_url ? 'text-green-500' : 'text-zinc-300'}`}>
              {driverData?.car_image_url ? t('car_photo_uploaded') : t('car_photo')}
            </span>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${driverData?.profile_image_url ? 'bg-green-500/10 border-green-500/20' : 'bg-white/5 border-white/10'}`}>
            <Camera size={16} className={driverData?.profile_image_url ? 'text-green-500' : 'text-yellow-400'} />
            <span className={`text-xs font-bold ${driverData?.profile_image_url ? 'text-green-500' : 'text-zinc-300'}`}>
              {driverData?.profile_image_url ? t('profile_photo_uploaded') : t('profile_photo')}
            </span>
          </div>
          {driverData?.preferredCurrency && (
            <div className="flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 px-4 py-2 rounded-full">
              <CreditCard size={16} className="text-yellow-400" />
              <span className="text-xs font-bold text-yellow-400">{t('currency')}: {driverData.preferredCurrency}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-8 space-y-4 relative z-10 mb-8">
        {!isLoading && !driverData && (
          <motion.button
            onClick={onRegister}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full h-20 bg-white text-black rounded-3xl flex items-center justify-between px-8 shadow-2xl group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center group-hover:bg-yellow-400 transition-colors">
                <IdCard className="w-6 h-6" />
              </div>
              <span className="text-xl font-black">{t('driver_registration')}</span>
            </div>
            <ArrowRight className="w-6 h-6 opacity-30 group-hover:opacity-100 transition-all group-hover:translate-x-2" />
          </motion.button>
        )}

        {(driverData?.status === 'approved' || driverData?.status === 'auto-approved') && (
          <>
            <motion.button
              onClick={handleStartWork}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full h-20 bg-gold text-black rounded-3xl flex items-center justify-between px-8 shadow-2xl shadow-gold/20 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-black/10 rounded-2xl flex items-center justify-center group-hover:bg-black group-hover:text-yellow-400 transition-colors">
                  <Play className="w-6 h-6 fill-current" />
                </div>
                <span className="text-xl font-black">{t('active_trip')}</span>
              </div>
              <ArrowRight className="w-6 h-6 opacity-30 group-hover:opacity-100 transition-all group-hover:translate-x-2" />
            </motion.button>

            <motion.button
              onClick={onViewHistory}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full h-20 bg-white/5 border border-white/10 text-white rounded-3xl flex items-center justify-between px-8 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white group-hover:text-black transition-colors">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <span className="text-xl font-black">{t('trip_history')}</span>
              </div>
              <ArrowRight className="w-6 h-6 opacity-30 group-hover:opacity-100 transition-all group-hover:translate-x-2" />
            </motion.button>
          </>
        )}

        {isAdminUser && (
          <motion.button
            onClick={onOpenAdmin}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-between px-8 shadow-2xl shadow-blue-600/20 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white group-hover:text-blue-600 transition-colors">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="text-xl font-black">{t('admin_dashboard')}</span>
            </div>
            <ArrowRight className="w-6 h-6 opacity-30 group-hover:opacity-100 transition-all group-hover:translate-x-2" />
          </motion.button>
        )}

        <div className="flex items-center justify-center gap-2 pt-4 text-zinc-500">
          <ShieldCheck size={16} />
          <span className="text-xs font-bold uppercase tracking-widest">نظام آمن وموثق 100%</span>
        </div>
      </div>
    </div>
  );
}

// --- Admin Dashboard Component ---
function AdminDashboard({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'flagged' | 'pending'>('all');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchDrivers = () => {
      try {
        const q = query(collection(db, "sfax_drivers"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          setDrivers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setIsLoading(false);
        }, (error) => {
          console.error("Error in admin snapshot:", error);
          setIsLoading(false);
        });
        return unsubscribe;
      } catch (error) {
        console.error("Error initializing admin listener:", error);
        setIsLoading(false);
      }
    };
    const unsub = fetchDrivers();
    return () => unsub?.();
  }, []);

  const handleStatusUpdate = async (driverId: string, newStatus: string, reason?: string) => {
    try {
      await updateDoc(doc(db, "sfax_drivers", driverId), {
        status: newStatus,
        rejectionReason: reason || null,
        isFlaggedForManualReview: false
      });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const filteredDrivers = drivers.filter(d => {
    const statusMatch = filter === 'flagged' ? d.isFlaggedForManualReview : (filter === 'pending' ? d.status === 'pending' : true);
    const vehicleMatch = vehicleFilter === 'all' || d.vehicleType?.toLowerCase() === vehicleFilter.toLowerCase();
    return statusMatch && vehicleMatch;
  });

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans">
      <div className="p-6 bg-white border-b border-zinc-100 flex items-center justify-between sticky top-0 z-30">
        <button onClick={onBack} className="w-10 h-10 bg-gold rounded-xl flex items-center justify-center text-black shadow-md">
          <ArrowRight size={20} />
        </button>
        <h2 className="text-xl font-black text-zinc-900">{t('admin_dashboard')}</h2>
        <div className="w-10"></div>
      </div>

      <div className="p-6 space-y-6 max-w-4xl mx-auto w-full pb-20">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {[
            { id: 'all', label: t('all') },
            { id: 'flagged', label: 'مراجعة يدوية 🚩' },
            { id: 'pending', label: t('pending') }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-6 py-3 rounded-2xl font-black text-sm whitespace-nowrap transition-all ${filter === f.id ? 'bg-zinc-900 text-white shadow-lg' : 'bg-white text-zinc-400 border border-zinc-100'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'sedan', label: 'سيدان' },
            { id: 'SUV', label: 'SUV' },
            { id: 'luxury', label: 'فاخرة' }
          ].map(v => (
            <button
              key={v.id}
              onClick={() => setVehicleFilter(v.id)}
              className={`px-4 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${vehicleFilter === v.id ? 'bg-gold text-black shadow-lg' : 'bg-white text-zinc-400 border border-zinc-100'}`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center"><div className="w-10 h-10 border-4 border-zinc-200 border-t-yellow-400 rounded-full animate-spin" /></div>
        ) : (
          <div className="grid gap-6">
            {filteredDrivers.map(driver => (
              <motion.div key={driver.id} layout className="bg-white p-6 rounded-[40px] border border-zinc-100 shadow-sm space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-20 h-20 bg-zinc-100 rounded-3xl overflow-hidden border border-zinc-100 cursor-pointer"
                      onClick={() => setPreviewImage(driver.profile_image_url || "https://picsum.photos/seed/user/400/400")}
                    >
                      <img 
                        src={driver.profile_image_url || "https://picsum.photos/seed/user/100/100"} 
                        alt="" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "https://picsum.photos/seed/error/100/100";
                        }}
                      />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-zinc-900">{driver.fullName}</h3>
                      <p className="text-sm font-bold text-zinc-400">{driver.carModel} • {driver.carPlate} • <span className="text-gold uppercase text-[10px]">{driver.vehicleType || 'Unknown'}</span></p>
                      <p className="text-[10px] text-zinc-300 font-mono mt-1">{driver.phone}</p>
                    </div>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    driver.status === 'approved' ? 'bg-green-100 text-green-600' :
                    driver.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
                  }`}>
                    {driver.status}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2">صورة السيارة</p>
                    <div 
                      onClick={() => setPreviewImage(driver.car_image_url)}
                      className="aspect-video bg-zinc-100 rounded-2xl overflow-hidden border border-zinc-100 cursor-pointer group relative"
                    >
                      {driver.car_image_url ? (
                        <img 
                          src={driver.car_image_url} 
                          alt="Car" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer" 
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "https://picsum.photos/seed/car_error/400/300";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-300 italic text-[10px]">لا توجد صورة</div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera size={24} className="text-white" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2">الهوية / الرخصة</p>
                    <div 
                      onClick={() => setPreviewImage(driver.id_card_url)}
                      className="aspect-video bg-zinc-100 rounded-2xl overflow-hidden border border-zinc-100 cursor-pointer group relative"
                    >
                      {driver.id_card_url ? (
                        <img 
                          src={driver.id_card_url} 
                          alt="ID" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer" 
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "https://picsum.photos/seed/id_error/400/300";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-300 italic text-[10px]">لا توجد صورة</div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <IdCard size={24} className="text-white" />
                      </div>
                    </div>
                  </div>
                </div>

                {driver.aiReviewResult && (
                  <div className="p-5 bg-zinc-50 rounded-3xl border border-zinc-100 space-y-2">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck size={14} className="text-yellow-600" /> نتيجة فحص الذكاء الاصطناعي
                    </p>
                    <p className="text-sm font-bold text-zinc-700 leading-relaxed">{driver.aiReviewResult}</p>
                    {driver.isFlaggedForManualReview && (
                      <div className="flex items-center gap-2 text-orange-600 text-[10px] font-black bg-orange-50 p-2 rounded-xl border border-orange-100">
                        <AlertCircle size={14} /> يتطلب مراجعة يدوية
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-4">
                  <button 
                    onClick={() => handleStatusUpdate(driver.id, 'approved')}
                    className="flex-[2] h-16 bg-green-500 text-white rounded-2xl font-black shadow-xl shadow-green-500/20 active:scale-95 transition-all"
                  >
                    {t('approved')}
                  </button>
                  <button 
                    onClick={() => {
                      const reason = prompt(t('reason') + ":");
                      if (reason) handleStatusUpdate(driver.id, 'rejected', reason);
                    }}
                    className="flex-1 h-16 bg-red-50 text-white rounded-2xl font-black shadow-xl shadow-red-500/20 active:scale-95 transition-all"
                  >
                    {t('rejected')}
                  </button>
                </div>
              </motion.div>
            ))}
            {filteredDrivers.length === 0 && (
              <div className="py-20 text-center space-y-4 opacity-50">
                <Search size={48} className="mx-auto text-zinc-300" />
                <p className="font-bold text-zinc-400">لا يوجد طلبات في هذا القسم</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
            onClick={() => setPreviewImage(null)}
          >
            <button className="absolute top-8 right-8 text-white"><X size={32} /></button>
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={previewImage} 
              alt="Preview" 
              className="max-w-full max-h-[80vh] object-contain rounded-3xl"
              referrerPolicy="no-referrer"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "https://picsum.photos/seed/id_error/800/600";
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Notification Settings Page Component ---
function NotificationSettingsPage({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState({
    pushEnabled: true,
    tripUpdates: true,
    promotional: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!auth.currentUser) return;
      try {
        const docRef = doc(db, "user_preferences", auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPreferences(docSnap.data().notifications);
        }
      } catch (error) {
        console.error("Error fetching preferences:", error);
      } finally {
        setIsLoaded(true);
      }
    };
    fetchPreferences();
  }, []);

  const handleToggle = (key: keyof typeof preferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, "user_preferences", auth.currentUser.uid), {
        uid: auth.currentUser.uid,
        notifications: preferences
      }, { merge: true });
      toast.success(t('preferences_saved'));
    } catch (error) {
      console.error("Error saving preferences:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-zinc-200 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans">
      <div className="p-6 bg-white border-b border-zinc-100 flex items-center justify-between sticky top-0 z-30">
        <button onClick={onBack} className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-900">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-black text-zinc-900">{t('notification_settings')}</h2>
        <div className="w-10"></div>
      </div>

      <div className="p-6 space-y-6 max-w-xl mx-auto w-full">
        <div className="bg-white rounded-[40px] border border-zinc-100 shadow-sm overflow-hidden">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-black text-zinc-900">{t('push_notifications')}</p>
                <p className="text-xs font-medium text-zinc-500">تلقي تنبيهات مباشرة على هاتفك</p>
              </div>
              <button 
                onClick={() => handleToggle('pushEnabled')}
                className={`w-14 h-8 rounded-full transition-all relative ${preferences.pushEnabled ? 'bg-yellow-400' : 'bg-zinc-200'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${preferences.pushEnabled ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-50 pt-6">
              <div className="space-y-1">
                <p className="font-black text-zinc-900">{t('trip_updates')}</p>
                <p className="text-xs font-medium text-zinc-500">تنبيهات حول حالة الرحلة والسائق</p>
              </div>
              <button 
                onClick={() => handleToggle('tripUpdates')}
                className={`w-14 h-8 rounded-full transition-all relative ${preferences.tripUpdates ? 'bg-yellow-400' : 'bg-zinc-200'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${preferences.tripUpdates ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-50 pt-6">
              <div className="space-y-1">
                <p className="font-black text-zinc-900">{t('promotional_messages')}</p>
                <p className="text-xs font-medium text-zinc-500">العروض الخاصة والخصومات الجديدة</p>
              </div>
              <button 
                onClick={() => handleToggle('promotional')}
                className={`w-14 h-8 rounded-full transition-all relative ${preferences.promotional ? 'bg-yellow-400' : 'bg-zinc-200'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${preferences.promotional ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full h-16 bg-zinc-900 text-white rounded-[24px] font-black shadow-xl shadow-black/10 flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isSaving ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <ShieldCheck size={20} />}
          <span>{t('save_preferences')}</span>
        </button>
      </div>
    </div>
  );
}

// --- Passenger Bookings Page Component ---
function PassengerBookingsPage({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const [trips, setTrips] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(
          collection(db, "trips"),
          where("passengerId", "==", auth.currentUser.uid),
          orderBy("timestamp", "desc")
        );
        const snapshot = await getDocs(q);
        setTrips(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching passenger trips:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrips();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      <div className="p-6 bg-white border-b border-zinc-100 sticky top-0 z-10">
        <h2 className="text-2xl font-black text-zinc-900">{t('my_trips')}</h2>
        <p className="text-zinc-500 text-xs font-bold mt-1">{t('trip_history')}</p>
      </div>

      <div className="p-6 space-y-4">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <div className="w-10 h-10 border-4 border-zinc-200 border-t-yellow-400 rounded-full animate-spin" />
          </div>
        ) : trips.length > 0 ? (
          trips.map((trip) => (
            <motion.div
              key={trip.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-5 rounded-[32px] border border-zinc-100 shadow-sm space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400">
                    <Car size={20} />
                  </div>
                  <div>
                    <p className="font-black text-zinc-900 text-sm">{trip.destination}</p>
                    <p className="text-[10px] font-bold text-zinc-400">
                      {new Date(trip.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-zinc-900">{trip.earnings} د.ت</p>
                  <p className="text-[10px] font-bold text-green-500 uppercase">{t('trip_completed')}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-2 border-t border-zinc-50">
                <div className="flex items-center gap-1">
                  <MapPin size={12} className="text-zinc-300" />
                  <span className="text-[10px] font-bold text-zinc-400">{trip.distance}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar size={12} className="text-zinc-300" />
                  <span className="text-[10px] font-bold text-zinc-400">{trip.duration}</span>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto text-zinc-300">
              <Luggage size={40} />
            </div>
            <div className="space-y-1">
              <p className="font-black text-zinc-900">{t('no_rides_found')}</p>
              <p className="text-zinc-500 text-xs font-medium">ابدأ رحلتك الأولى الآن واستمتع بالرفاهية</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Passenger Profile Page Component ---
function PassengerProfilePage({ user, onDriverPortal, onLogout, onNotificationSettings }: { user: FirebaseUser | null, onDriverPortal: () => void, onLogout: () => void, onNotificationSettings: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      {/* Header */}
      <div className="bg-zinc-900 pt-16 pb-24 px-8 rounded-b-[60px] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <div className="w-28 h-28 bg-white p-1.5 rounded-[40px] shadow-2xl">
              <div className="w-full h-full bg-zinc-100 rounded-[35px] overflow-hidden relative group">
                <img 
                  src={user?.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&h=200&q=80"} 
                  alt={user?.displayName || "User"} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera size={24} className="text-white" />
                </div>
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-yellow-400 rounded-2xl flex items-center justify-center border-4 border-zinc-900 shadow-lg">
              <Star size={18} className="text-black fill-current" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white">{user?.displayName || t('app_name')}</h2>
            <p className="text-zinc-400 text-sm font-medium">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Menu Options */}
      <div className="px-6 -mt-12 relative z-20 space-y-4">
        <div className="bg-white rounded-[40px] shadow-xl shadow-black/5 p-2 space-y-1">
          <button className="w-full p-5 flex items-center justify-between hover:bg-zinc-50 rounded-[30px] transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                <Settings size={24} />
              </div>
              <span className="font-black text-zinc-900">{t('account_settings')}</span>
            </div>
            <ArrowRight size={20} className="text-zinc-300 group-hover:text-zinc-900 transition-colors" />
          </button>

          <button 
            onClick={onNotificationSettings}
            className="w-full p-5 flex items-center justify-between hover:bg-zinc-50 rounded-[30px] transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-all">
                <Zap size={24} />
              </div>
              <span className="font-black text-zinc-900">{t('notification_settings')}</span>
            </div>
            <ArrowRight size={20} className="text-zinc-300 group-hover:text-zinc-900 transition-colors" />
          </button>

          <button className="w-full p-5 flex items-center justify-between hover:bg-zinc-50 rounded-[30px] transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all">
                <CreditCard size={24} />
              </div>
              <span className="font-black text-zinc-900">{t('payment_methods')}</span>
            </div>
            <ArrowRight size={20} className="text-zinc-300 group-hover:text-zinc-900 transition-colors" />
          </button>

          <button className="w-full p-5 flex items-center justify-between hover:bg-zinc-50 rounded-[30px] transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-all">
                <HelpCircle size={24} />
              </div>
              <span className="font-black text-zinc-900">{t('help_support')}</span>
            </div>
            <ArrowRight size={20} className="text-zinc-300 group-hover:text-zinc-900 transition-colors" />
          </button>

          <div className="px-5 pb-4 pt-2 space-y-3 border-t border-zinc-50">
            <div className="flex flex-col gap-2">
              <a href="tel:00971527731553" className="flex items-center gap-3 text-zinc-600 hover:text-zinc-900 transition-colors">
                <div className="w-8 h-8 bg-zinc-50 rounded-xl flex items-center justify-center">
                  <Phone size={14} className="text-zinc-400" />
                </div>
                <span className="text-xs font-bold">00971527731553 (call)</span>
              </a>
              <a href="mailto:bookingonline97@gmail.com" className="flex items-center gap-3 text-zinc-600 hover:text-zinc-900 transition-colors">
                <div className="w-8 h-8 bg-zinc-50 rounded-xl flex items-center justify-center">
                  <Mail size={14} className="text-zinc-400" />
                </div>
                <span className="text-xs font-bold">bookingonline97@gmail.com</span>
              </a>
            </div>
          </div>
        </div>

        {/* Driver Portal Access */}
        <button 
          onClick={onDriverPortal}
          className="w-full bg-yellow-400 p-6 rounded-[40px] flex items-center justify-between shadow-xl shadow-yellow-400/20 group hover:bg-yellow-500 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-black/10 rounded-[24px] flex items-center justify-center group-hover:bg-black group-hover:text-yellow-400 transition-all">
              <Car size={32} />
            </div>
            <div className="text-right">
              <p className="font-black text-zinc-900 text-lg">{t('driver_portal')}</p>
              <p className="text-[10px] font-bold text-black/60 uppercase tracking-widest">{t('driver_registration')}</p>
            </div>
          </div>
          <ArrowRight size={24} className="text-black/30 group-hover:text-black transition-all group-hover:translate-x-2" />
        </button>

        {/* Admin Dashboard Access (Only for Admin) */}
        {user?.email === "fixteamdorr@gmail.com" && (
          <button 
            onClick={() => window.location.href = '/admin'}
            className="w-full bg-zinc-900 p-6 rounded-[40px] flex items-center justify-between shadow-xl shadow-black/20 group hover:bg-black transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-yellow-400 rounded-[24px] flex items-center justify-center group-hover:scale-110 transition-all">
                <ShieldCheck size={32} className="text-black" />
              </div>
              <div className="text-right">
                <p className="font-black text-white text-lg">{t('admin_dashboard')}</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">إدارة النظام والسائقين</p>
              </div>
            </div>
            <ArrowRight size={24} className="text-zinc-700 group-hover:text-yellow-400 transition-all group-hover:translate-x-2" />
          </button>
        )}

        {/* Logout */}
        <button 
          onClick={onLogout}
          className="w-full p-6 flex items-center justify-center gap-3 text-red-500 font-black hover:bg-red-50 rounded-[40px] transition-all"
        >
          <LogOut size={20} />
          <span>{t('logout')}</span>
        </button>
      </div>

      {/* App Version */}
      <div className="text-center py-8">
        <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">2GO App v2.4.0</p>
      </div>
    </div>
  );
}

// --- Trip History Page Component ---
// --- Driver Work Page Component ---
function DriverWorkPage({ onBack, isLoaded }: { onBack: () => void, isLoaded: boolean }) {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [activeTrip, setActiveTrip] = useState<any | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  const cancellationReasons = [
    "العميل لم يحضر",
    "مشكلة في السيارة",
    "زحمة مرورية",
    "حالة طوارئ شخصية",
    "أخرى"
  ];

  const handleCancelTrip = async () => {
    if (!activeTrip) return;
    const finalReason = cancelReason === "أخرى" ? customReason : cancelReason;
    
    try {
      await updateDoc(doc(db, "trip_requests", activeTrip.id), {
        status: "cancelled",
        cancellationReason: finalReason,
        cancelledBy: "driver",
        cancelledAt: serverTimestamp()
      });
      setActiveTrip(null);
      setShowCancelModal(false);
      setCancelReason("");
      setCustomReason("");
      toast.success("تم إلغاء الرحلة بنجاح");
    } catch (error) {
      console.error("Error cancelling trip:", error);
      toast.error("حدث خطأ أثناء إلغاء الرحلة");
    }
  };

  useEffect(() => {
    if (!isOnline || !auth.currentUser) return;

    // Update online status in Firestore
    const driverRef = doc(db, "sfax_drivers", auth.currentUser.uid);
    updateDoc(driverRef, { isOnline: true, lastSeen: serverTimestamp() });

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Update Firestore with new location
        updateDoc(driverRef, {
          location: { lat: latitude, lng: longitude },
          lastSeen: serverTimestamp()
        });
      },
      (error) => console.error("Error watching position:", error),
      { 
        enableHighAccuracy: true, 
        maximumAge: 10000, // 10 seconds
        timeout: 5000 
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      updateDoc(driverRef, { isOnline: false, lastSeen: serverTimestamp() });
    };
  }, [isOnline]);

  useEffect(() => {
    if (!isOnline) {
      setRequests([]);
      return;
    }

    const q = query(
      collection(db, "trip_requests"),
      where("status", "==", "pending"),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRequests(reqs);
    });

    return () => unsubscribe();
  }, [isOnline]);

  const handleAccept = async (requestId: string) => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, "trip_requests", requestId), {
        status: "accepted",
        driverId: auth.currentUser.uid
      });
      // In a real app, we'd move to a "Trip in Progress" view for the driver
      const trip = requests.find(r => r.id === requestId);
      setActiveTrip(trip);
    } catch (error) {
      console.error("Error accepting trip:", error);
    }
  };

  if (activeTrip) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white p-6 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center space-y-8">
          <div className="w-24 h-24 bg-yellow-400 rounded-[32px] flex items-center justify-center shadow-2xl shadow-yellow-400/20">
            <Navigation className="w-12 h-12 text-black animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black">{t('active_trip')}</h2>
            <p className="text-zinc-400 font-bold">أنت الآن في طريقك إلى {activeTrip.passengerName}</p>
          </div>
          
          <div className="w-full max-w-md bg-zinc-800/50 rounded-[40px] p-8 space-y-6 border border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">الراكب</p>
                <p className="text-xl font-black">{activeTrip.passengerName}</p>
              </div>
              <div className="w-12 h-12 bg-zinc-700 rounded-2xl flex items-center justify-center">
                <User className="text-zinc-400" />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase">نقطة الانطلاق</p>
                  <p className="font-bold text-sm">موقع الراكب الحالي</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2"></div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase">الوجهة</p>
                  <p className="font-bold text-sm">{activeTrip.destination?.address}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setShowCancelModal(true)}
            className="h-16 bg-zinc-800 text-white font-black rounded-3xl"
          >
            {t('cancel_ride')}
          </button>
          <button 
            onClick={async () => {
              if (!auth.currentUser) return;
              try {
                await updateDoc(doc(db, "trip_requests", activeTrip.id), { status: "completed" });
                
                // Create a permanent trip record
                await addDoc(collection(db, "trips"), {
                  driverId: auth.currentUser.uid,
                  passengerId: activeTrip.passengerId,
                  passengerName: activeTrip.passengerName,
                  destination: activeTrip.destination?.address || "وجهة غير محددة",
                  distance: activeTrip.estimation?.distance || "0 km",
                  duration: activeTrip.estimation?.duration || "0 min",
                  earnings: typeof activeTrip.estimation?.price === 'string' ? parseFloat(activeTrip.estimation.price) : (activeTrip.estimation?.price || 0),
                  currency: "TND",
                  date: new Date().toISOString().split('T')[0],
                  timestamp: serverTimestamp()
                });

                setActiveTrip(null);
              } catch (error) {
                console.error("Error completing trip:", error);
              }
            }}
            className="h-16 bg-green-500 text-white font-black rounded-3xl shadow-xl shadow-green-500/20"
          >
            {t('trip_completed')}
          </button>
        </div>

        {/* Cancellation Modal */}
        <AnimatePresence>
          {showCancelModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowCancelModal(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-zinc-900 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-white/10 relative z-10"
              >
                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-white">سبب الإلغاء</h3>
                    <button onClick={() => setShowCancelModal(false)} className="text-zinc-500 hover:text-white">
                      <X size={24} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {cancellationReasons.map((reason) => (
                      <button
                        key={reason}
                        onClick={() => setCancelReason(reason)}
                        className={`w-full p-4 rounded-2xl border transition-all text-right font-bold ${
                          cancelReason === reason 
                            ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400' 
                            : 'border-white/5 bg-white/5 text-zinc-400 hover:bg-white/10'
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>

                  {cancelReason === "أخرى" && (
                    <textarea
                      placeholder="اكتب السبب هنا..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      className="w-full h-24 p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium text-white resize-none"
                    />
                  )}

                  <button
                    onClick={handleCancelTrip}
                    disabled={!cancelReason || (cancelReason === "أخرى" && !customReason)}
                    className="w-full h-16 bg-red-500 text-white font-black rounded-2xl shadow-xl shadow-red-500/20 disabled:opacity-50"
                  >
                    تأكيد الإلغاء
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white flex flex-col">
      {/* Header */}
      <div className="p-6 flex items-center justify-between bg-zinc-900/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center text-white"
          >
            <ArrowLeft />
          </button>
          <h2 className="text-xl font-black">{t('driver_portal')}</h2>
        </div>
        <div className="flex items-center gap-3 bg-zinc-800 p-1.5 rounded-2xl">
          <button 
            onClick={() => setIsOnline(true)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${isOnline ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'text-zinc-500'}`}
          >
            {t('online')}
          </button>
          <button 
            onClick={() => setIsOnline(false)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${!isOnline ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-zinc-500'}`}
          >
            {t('offline')}
          </button>
        </div>
      </div>

      {/* Requests List */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {!isOnline ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
            <div className="w-20 h-20 bg-zinc-800 rounded-[32px] flex items-center justify-center">
              <ShieldCheck size={40} className="text-zinc-500" />
            </div>
            <p className="font-bold">أنت الآن غير متصل. قم بتغيير الحالة لاستقبال الطلبات.</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative">
              <div className="w-24 h-24 bg-yellow-400/10 rounded-full flex items-center justify-center animate-pulse">
                <Search size={40} className="text-yellow-400" />
              </div>
              <motion.div 
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 border-2 border-yellow-400 rounded-full"
              />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black">{t('finding_driver')}</h3>
              <p className="text-zinc-500 text-sm font-bold">سيتم إخطارك فور توفر رحلة قريبة منك</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs font-black text-zinc-500 uppercase tracking-widest px-2">طلبات الرحلات القريبة ({requests.length})</p>
            {requests.map((req) => (
              <motion.div 
                key={req.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-800/50 rounded-[32px] p-6 border border-white/5 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-700 rounded-2xl flex items-center justify-center">
                      <User className="text-zinc-400" />
                    </div>
                    <div>
                      <h4 className="font-black">{req.passengerName}</h4>
                      <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">طلب جديد</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-green-400">{req.estimation?.price} د.ت</p>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase">{req.estimation?.distance}</p>
                  </div>
                </div>

                <div className="space-y-3 p-4 bg-zinc-900/50 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    <p className="text-xs font-bold text-zinc-400 truncate">موقع الراكب الحالي</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                    <p className="text-xs font-bold text-zinc-400 truncate">{req.destination?.address}</p>
                  </div>
                </div>

                <button 
                  onClick={() => handleAccept(req.id)}
                  className="w-full h-14 bg-yellow-400 text-black font-black rounded-2xl shadow-xl shadow-yellow-400/10 hover:bg-yellow-500 transition-all active:scale-95"
                >
                  قبول الرحلة
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TripHistoryPage({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const [filterDate, setFilterDate] = useState("");
  const [trips, setTrips] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [driverName, setDriverName] = useState("");
  
  useEffect(() => {
    const fetchTrips = async () => {
      if (!auth.currentUser) return;
      
      try {
        // Fetch driver name
        const driverDoc = await getDoc(doc(db, "sfax_drivers", auth.currentUser.uid));
        if (driverDoc.exists()) {
          setDriverName(driverDoc.data().fullName);
        }

        const tripsQuery = query(
          collection(db, "trips"),
          orderBy("timestamp", "desc")
        );
        
        const querySnapshot = await getDocs(tripsQuery);
        const fetchedTrips = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setTrips(fetchedTrips);
      } catch (error) {
        console.error("Error fetching trips:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTrips();
  }, []);

  const filteredTrips = filterDate 
    ? trips.filter(trip => trip.date === filterDate)
    : trips;

  const totalEarnings = filteredTrips.reduce((sum, trip) => sum + (trip.earnings || 0), 0);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans">
      {/* Header */}
      <div className="p-6 bg-white border-b border-zinc-100 flex items-center justify-between sticky top-0 z-30">
        <button 
          onClick={onBack}
          className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center text-black shadow-md"
        >
          <ArrowRight size={20} />
        </button>
        <h2 className="text-xl font-black text-zinc-900">{t('trip_history')}</h2>
        <div className="w-10"></div>
      </div>

      <div className="p-6 space-y-6 max-w-md mx-auto w-full">
        {/* Filter Section */}
        <div className="space-y-2">
          <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">{t('filter_by_date')}</label>
          <div className="relative group">
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 z-10 pointer-events-none">
              <Calendar size={20} />
            </div>
            
            {/* Custom Display for Date */}
            <div className="w-full h-14 pr-12 pl-4 bg-white border border-zinc-200 rounded-2xl flex items-center justify-start font-bold text-zinc-900 group-hover:border-yellow-400 transition-colors">
              {filterDate ? (
                <span>
                  {new Date(filterDate).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              ) : (
                <span className="text-zinc-300">DD / MM / YYYY</span>
              )}
            </div>

            {/* Hidden Date Input that covers the display */}
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            />

            {filterDate && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setFilterDate("");
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 z-30"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Wallet Card (Bank Card Style) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative aspect-[1.58/1] w-full bg-zinc-900 rounded-[32px] p-8 text-white shadow-2xl overflow-hidden group border border-white/5"
        >
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-yellow-400/20 transition-colors" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-10 -mb-10 blur-2xl" />
          
          <div className="relative h-full flex flex-col justify-between">
            {/* Top Row: Logo & Label */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                  <span className="font-black text-black text-xs">2</span>
                </div>
                <span className="font-black text-lg tracking-tight uppercase">Wallet</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <p className="text-[9px] font-black uppercase tracking-widest text-white">
                  برنامج تجريبي مجاني
                </p>
              </div>
            </div>

            {/* Middle Row: Balance/Earnings */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">رصيد المحفظة</p>
                <div className="px-2 py-0.5 bg-yellow-400/10 rounded-md border border-yellow-400/20">
                  <p className="text-[8px] font-black text-yellow-400">0% عمولة</p>
                </div>
              </div>
              <h3 className="text-5xl font-black tracking-tighter flex items-baseline gap-2">
                {totalEarnings.toFixed(2)}
                <span className="text-xl text-yellow-500 font-bold">د.ت</span>
              </h3>
              <p className="text-[9px] font-bold text-zinc-500 italic">التطبيق مجاني 100% خلال الفترة التجريبية في صفاقس</p>
            </div>

            {/* Bottom Row: Driver Name & Chip */}
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">حامل المحفظة</p>
                <p className="text-lg font-black text-white tracking-wide font-serif italic">
                  {driverName || "جاري التحميل..."}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-white/5 p-2 rounded-xl backdrop-blur-md">
                  <Zap size={16} className="text-yellow-400 fill-yellow-400" />
                </div>
                <div className="w-12 h-10 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-lg shadow-inner border border-white/10 relative overflow-hidden">
                   <div className="absolute inset-x-0 top-1/4 h-px bg-white/20" />
                   <div className="absolute inset-x-0 top-1/2 h-px bg-white/20" />
                   <div className="absolute inset-x-0 top-3/4 h-px bg-white/20" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Trip List */}
        <div className="space-y-4">
          <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">{t('trips')}</h4>
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <div className="w-8 h-8 border-4 border-zinc-200 border-t-yellow-400 rounded-full animate-spin"></div>
            </div>
          ) : filteredTrips.length > 0 ? (
            filteredTrips.map(trip => (
              <motion.div 
                key={trip.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm flex items-center justify-between group hover:border-yellow-400 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-yellow-400 group-hover:text-black transition-colors">
                    <Car size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-zinc-900">{trip.destination}</p>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 font-bold">
                      <span>
                        {new Date(trip.date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <span>•</span>
                      <span>{trip.distance}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-zinc-900">{trip.earnings.toFixed(2)}</p>
                  <p className="text-[10px] font-black text-zinc-400 uppercase">د.ت</p>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto text-zinc-300">
                <Search size={32} />
              </div>
              <p className="text-zinc-500 font-bold">{t('no_rides_found')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Sfax Hub Page Component ---
function SfaxHubPage({ onBack, isLoaded }: { onBack: () => void, isLoaded: boolean }) {
  const { t } = useTranslation();
  const [activeScreen, setActiveScreen] = useState<'home' | 'tracker' | 'trains' | 'partners' | 'chat'>('home');
  const [activeTab, setActiveTab] = useState('flights');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<{suggestion: string, best_transport: string} | null>(null);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: 'أهلاً بك في 2go صفاقس! أنا مساعدك الذكي، كيف يمكنني خدمتك اليوم؟' }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  // --- تعليمات الهوية المؤسسية (System Instructions) ---
  const CORPORATE_IDENTITY = `
    أنت المساعد الذكي الرسمي لتطبيق 2go في تونس.
    عندما تُسأل عن تطبيق 2go أو من نحن أو من المؤسس، يجب أن تجيب بدقة واحترافية بالمعلومات التالية:
    1. تطبيق 2go مملوك للمؤسسة الأمريكية Swift Drive ومقرها ولاية ديلاوير (Delaware).
    2. المدير التنفيذي للتطبيق في منطقة الشرق الأوسط وشمال أفريقيا هو رائد أعمال تونسي.
    3. التطبيق حالياً في مرحلة تجريبية انطلقت من عاصمة الجنوب "صفاقس" نظراً لأهميتها الديموغرافية وكثافتها السكانية.
    4. الخطة هي التعميم على كامل الجمهورية التونسية ثم دول شمال أفريقيا.
    5. لمزيد من الاستفسارات، اطلب من المستخدم التواصل عبر البريد الإلكتروني الرسمي الموجود في الموقع.
    6. دائماً حافظ على نبرة احترافية، تونسية، وفخورة بمدينة صفاقس.
  `;
  const [showAirportModal, setShowAirportModal] = useState(false);
  const [isAirportRefreshing, setIsAirportRefreshing] = useState(false);
  const [showHotelModal, setShowHotelModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [currentExternalUrl, setCurrentExternalUrl] = useState("");

  const HOTELS_GENERAL_URL = "https://www.booking.com/city/tn/sfax.ar.html";
  const AIRPORT_URL = "https://www.flightradar24.com/data/airports/sfa";

  const openHotels = (url = HOTELS_GENERAL_URL, name = "فنادق صفاقس") => {
    setModalTitle(name);
    setCurrentExternalUrl(url);
    setShowHotelModal(true);
  };

  const INITIAL_TAXIS = [
    { id: 1, name: "تاكسي 1", lat: 34.7405, lng: 10.7602, status: 'available' },
    { id: 2, name: "تاكسي 2", lat: 34.7450, lng: 10.7650, status: 'busy' },
    { id: 3, name: "تاكسي 3", lat: 34.7380, lng: 10.7550, status: 'available' },
    { id: 4, name: "تاكسي 4", lat: 34.7420, lng: 10.7680, status: 'busy' },
    { id: 5, name: "تاكسي 5", lat: 34.7350, lng: 10.7620, status: 'available' },
  ];
  const [taxis, setTaxis] = useState(INITIAL_TAXIS);
  const [selectedTaxi, setSelectedTaxi] = useState<any>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTaxis(prev => prev.map(t => ({
        ...t,
        lat: t.lat + (Math.random() - 0.5) * 0.001,
        lng: t.lng + (Math.random() - 0.5) * 0.001,
      })));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const SFAX_FLIGHTS = [
    { id: 1, to: 'باريس (CDG)', time: '14:30', status: 'في الموعد', price: '450 TND' },
    { id: 2, to: 'اسطنبول (IST)', time: '18:15', status: 'تأخير 10 دق', price: '620 TND' },
    { id: 3, to: 'ليون (LYS)', time: '09:00', status: 'في الموعد', price: '380 TND' },
  ];

  const HOTELS = [
    { id: 1, name: 'فندق الزيتونة بارك', rating: 4.5, price: '180 TND', ai_tip: 'الأكثر طلباً لرجال الأعمال' },
    { id: 2, name: 'فندق برج الضيافة', rating: 4.8, price: '250 TND', ai_tip: 'توصية الذكاء الاصطناعي للعائلات' },
  ];

  const TRAIN_SCHEDULES = [
    { id: 1, from: "صفاقس", to: "تونس العاصمة", departure: "05:00", duration: "3h 45m", type: "Express" },
    { id: 2, from: "صفاقس", to: "تونس العاصمة", departure: "09:20", duration: "4h 10m", type: "Grande Ligne" },
    { id: 3, from: "صفاقس", to: "سوسة", departure: "13:45", duration: "2h 15m", type: "Express" },
  ];

  const BUSES = [
    { id: 1, line: 'خط 102 - المطار', time: 'كل 20 دقيقة', status: 'نشط', price: '1.5 TND' },
    { id: 2, line: 'خط 35 - المحطة المركزية', time: 'كل 15 دقيقة', status: 'نشط', price: '1.2 TND' },
  ];

  const SNCFT_URL = "https://www.sncft.com.tn/";

  const handleExternalBooking = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleAiSearch = () => {
    if (!searchQuery) return;
    setIsAiLoading(true);
    setTimeout(() => {
      setAiResponse({
        suggestion: "بناءً على ازدحام طريق تونس حالياً، ننصحك بالتوجه للمطار قبل 3 ساعات. حالة الطقس في صفاقس مشمشة (24°C)، مما يضمن إقلاعاً سلساً.",
        best_transport: "سيارات التاكسي عبر تطبيق 2GO هي الأسرع حالياً."
      });
      setIsAiLoading(false);
    }, 1500);
  };

  const askGemini = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    
    const userMsg = { role: 'user' as const, text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    const currentInput = chatInput;
    setChatInput("");
    setIsChatLoading(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: 'user', parts: [{ text: CORPORATE_IDENTITY + "\n\nسؤال المستخدم: " + currentInput }] }
        ],
        config: {
          systemInstruction: CORPORATE_IDENTITY
        }
      });
      
      const aiResponseText = response.text || "عذراً، أحتاج لربط مفتاح الـ API للرد بشكل حي.";
      setChatMessages(prev => [...prev, { role: 'ai' as const, text: aiResponseText }]);
    } catch (error) {
      console.error("Gemini Error:", error);
      // رد افتراضي في حالة عدم وجود API لضمان استمرار التجربة
      let fallbackText = "أنا مساعد 2go الذكي. هل تسأل عن خدماتنا في صفاقس؟";
      if (currentInput.includes("2go") || currentInput.includes("مؤسس") || currentInput.includes("من أنتم")) {
        fallbackText = "تطبيق 2go مملوك للمؤسسة الأمريكية Swift Drive (ولاية ديلاوير). يديره في الشرق الأوسط وشمال أفريقيا رائد أعمال تونسي، وقد اخترنا صفاقس كمنطلق لنسختنا التجريبية نظراً لثقلها السكاني والاقتصادي. سننطلق قريباً في كامل تونس وشمال أفريقيا. لمزيد من التفاصيل راسلنا عبر البريد الرسمي.";
      }
      setChatMessages(prev => [...prev, { role: 'ai' as const, text: fallbackText }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const renderAiAssistant = () => (
    <div className="flex flex-col h-full bg-zinc-50 animate-in slide-in-from-bottom duration-500">
      {/* AI Header */}
      <div className="p-6 bg-white border-b border-zinc-100 flex items-center justify-between shadow-sm sticky top-10 z-[55]">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveScreen('home')} className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-600">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-xl text-white">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="font-black text-zinc-900 text-sm">مساعد 2go الذكي</h3>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">عبر محرك Swift Drive</span>
              </div>
            </div>
          </div>
        </div>
        <Sparkles size={20} className="text-amber-500" />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-24">
        {chatMessages.map((msg, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={i} 
            className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
          >
            <div className={`max-w-[85%] p-5 rounded-[2.2rem] shadow-sm flex gap-3 relative ${
              msg.role === 'user' 
              ? 'bg-blue-600 text-white rounded-br-none' 
              : 'bg-white text-zinc-800 rounded-bl-none border border-zinc-100'
            }`}>
              {msg.role === 'ai' && <Bot size={18} className="shrink-0 mt-1 text-blue-500" />}
              <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
              {msg.role === 'user' && <User size={18} className="shrink-0 mt-1 opacity-50" />}
            </div>
          </motion.div>
        ))}
        {isChatLoading && (
          <div className="flex justify-end">
            <div className="bg-white p-5 rounded-[2.2rem] border border-zinc-100 flex items-center gap-3 shadow-sm">
              <Loader2 size={16} className="animate-spin text-blue-600" />
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Thinking... جاري المراجعة</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white border-t border-zinc-100 sticky bottom-0 z-50">
        <div className="relative flex items-center bg-zinc-50 rounded-[2.2rem] border border-zinc-100 p-1.5 focus-within:border-blue-500 transition-colors">
          <input 
            type="text" 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && askGemini()}
            placeholder="اسألني عن أي مكان في صفاقس..."
            className="flex-1 py-4 pr-6 pl-14 bg-transparent outline-none text-zinc-900 font-bold placeholder:text-zinc-300 text-right"
          />
          <button 
            disabled={isChatLoading || !chatInput.trim()}
            onClick={askGemini}
            className="absolute left-2 w-12 h-12 bg-zinc-900 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 disabled:opacity-50 transition-all"
          >
            <Send size={20} className="rotate-180" />
          </button>
        </div>
        <div className="mt-3 flex items-center justify-center gap-2">
           <Sparkles size={12} className="text-amber-400" />
           <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest">Powered by Gemini AI • ذكاء اصطناعي فائق</p>
        </div>
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      {/* Bio Header */}
      <div className="flex flex-col items-center justify-center space-y-6 pt-6">
        <div className="relative w-32 h-32">
          <div className="absolute inset-0 bg-blue-600 rounded-[3rem] rotate-6 opacity-20 animate-pulse"></div>
          <div className="relative bg-blue-600 w-full h-full rounded-[3rem] flex items-center justify-center text-white shadow-2xl">
            <Bot size={64} />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-black text-zinc-900 tracking-tight leading-tight">2go <span className="text-blue-600">Smart</span></h2>
          <p className="text-zinc-400 font-bold text-xs uppercase tracking-widest mt-2">بوابة صفاقس للذكاء الاصطناعي</p>
        </div>
      </div>

      {/* Main Services Grid */}
      <div className="grid grid-cols-2 gap-4">
        <motion.button 
          whileHover={{ scale: 0.95 }}
          onClick={() => setActiveScreen('tracker')} 
          className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-[2.5rem] text-white shadow-xl flex flex-col items-center justify-center space-y-3 aspect-square relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-8" />
          <Navigation size={32} />
          <span className="font-black text-sm uppercase tracking-wider">تتبع المباشر</span>
        </motion.button>
        <button onClick={() => setActiveScreen('trains')} className="bg-white p-6 rounded-[2.5rem] text-zinc-800 shadow-lg border border-zinc-100 flex flex-col items-center justify-center space-y-3 aspect-square transition-transform hover:scale-95">
          <Train size={32} className="text-green-500" />
          <span className="font-black text-sm uppercase tracking-wider">القطارات</span>
        </button>
        <button onClick={() => openHotels()} className="bg-white p-6 rounded-[2.5rem] text-zinc-800 shadow-lg border border-zinc-100 flex flex-col items-center justify-center space-y-3 aspect-square transition-transform hover:scale-95">
          <Hotel size={32} className="text-indigo-500" />
          <span className="font-black text-sm uppercase tracking-wider">الفنادق</span>
        </button>
        <button onClick={() => setShowAirportModal(true)} className="bg-white p-6 rounded-[2.5rem] text-zinc-800 shadow-lg border border-zinc-100 flex flex-col items-center justify-center space-y-3 aspect-square transition-transform hover:scale-95 relative group">
          <div className="absolute top-4 right-4 group-hover:scale-110 transition-transform">
             <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping absolute inset-0" />
             <div className="w-2.5 h-2.5 bg-red-500 rounded-full relative" />
          </div>
          <Plane size={32} className="text-blue-500" />
          <span className="font-black text-sm uppercase tracking-wider">المطار</span>
        </button>
      </div>

      {/* Partners Banner CTA */}
      <motion.button 
        whileHover={{ scale: 0.98 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setActiveScreen('partners')}
        className="w-full bg-slate-900 rounded-[2.5rem] p-6 text-white flex items-center justify-between shadow-xl relative overflow-hidden group border border-white/10"
      >
        <div className="absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500 opacity-20" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
            <Handshake size={24} className="text-blue-400" />
          </div>
          <div className="text-right">
            <h4 className="font-black text-sm">شركاء النجاح الرقمي</h4>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Partenariats Stratégiques</p>
          </div>
        </div>
        <ArrowUpRight size={20} className="text-zinc-500 group-hover:text-white transition-colors relative z-10" />
      </motion.button>

      {/* AI Search Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-zinc-900 flex items-center gap-2">
           <Zap size={20} className="text-yellow-500 fill-yellow-500" />
           وجهة ذكية
        </h3>
        <div className="bg-white p-1.5 rounded-[2.5rem] border border-zinc-100 shadow-lg flex items-center pr-4">
          <Search size={20} className="text-zinc-400" />
          <input 
            type="text" 
            placeholder="اسأل صفاقس الذكية..." 
            className="flex-1 py-4 bg-transparent outline-none text-zinc-900 font-bold px-3 placeholder:text-zinc-300 text-right"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button 
            onClick={handleAiSearch}
            className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform"
          >
            <ArrowRight size={20} className="rotate-180" />
          </button>
        </div>
        
        <AnimatePresence>
          {aiResponse && (
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-zinc-900 rounded-[2rem] p-6 text-white relative overflow-hidden shadow-2xl"
            >
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
              <p className="text-lg font-medium leading-relaxed mb-4 text-right">
                "{aiResponse.suggestion}"
              </p>
              <div className="flex items-center gap-2 text-[10px] text-yellow-400 font-black uppercase tracking-widest">
                <Clock size={12} /> {aiResponse.best_transport}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI Assistant Banner CTA */}
      <motion.button 
        whileHover={{ scale: 0.98 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setActiveScreen('chat')}
        className="w-full bg-white border border-zinc-100 rounded-[2.5rem] p-6 shadow-xl flex items-center justify-between group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <MessageSquare size={28} />
          </div>
          <div className="text-right">
            <h4 className="font-black text-zinc-900 text-lg">اسأل المساعد الذكي</h4>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1 text-center">إجابات فورية من خرائط جوجل • Gemini AI</p>
          </div>
        </div>
        <Sparkles size={24} className="text-amber-400 group-hover:scale-125 transition-transform relative z-10" />
      </motion.button>

      {/* Corporate Identity Section */}
      <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white flex items-center justify-between shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
          <Info size={80} />
        </div>
        <div className="relative z-10 flex flex-col items-start gap-4">
          <div className="space-y-1">
            <h4 className="font-bold text-sm">معلومات المؤسسة</h4>
            <p className="text-[10px] text-zinc-400">اكتشف رؤية 2go المستقبلية</p>
          </div>
          <button 
            onClick={() => {
              setChatInput("من مؤسس تطبيق 2go وما هو مقره؟");
              setActiveScreen('chat');
              // Triggering chat with predefined query
              setTimeout(() => {
                const input = document.querySelector('input[placeholder*="اسألني"]');
                if (input) {
                  (input as HTMLInputElement).value = "من مؤسس تطبيق 2go وما هو مقره؟";
                }
              }, 100);
            }} 
            className="bg-white/10 p-3 rounded-2xl hover:bg-white/20 transition-colors flex items-center gap-2"
          >
            <Info size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest">اعرف المزيد</span>
          </button>
        </div>
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg rotate-12">
          <Bot size={28} className="text-white" />
        </div>
      </div>
      <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/20 transition-all duration-700" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
            <Zap className="text-yellow-400" fill="currentColor" size={20} />
          </div>
          <h4 className="text-xl font-black">نصيحة اليوم</h4>
        </div>
        <p className="text-blue-500 bg-white/90 px-4 py-3 rounded-2xl text-sm font-bold leading-relaxed shadow-sm">
          "مطار صفاقس طينة الدولي يشهد حركة طيران خفيفة الآن. جميع الرحلات القادمة في موعدها."
        </p>
      </div>

      {/* Featured Hotels List (Quick Access) */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="font-black text-zinc-900 uppercase tracking-widest text-xs">أفضل الفنادق حالياً</h3>
          <button onClick={() => openHotels()} className="text-[10px] text-blue-600 font-black uppercase tracking-widest hover:underline">عرض الكل</button>
        </div>
        
        <div className="space-y-3">
          {[
            { name: "فندق زيتونة بليس", stars: 5, price: "240 TND", color: "bg-blue-50/50", border: "border-blue-100", iconColor: "text-blue-600" },
            { name: "فندق الأقواس صفاقس", stars: 4, price: "180 TND", color: "bg-amber-50/50", border: "border-amber-100", iconColor: "text-amber-600" },
            { name: "فندق إيبيس صفاقس", stars: 3, price: "155 TND", color: "bg-red-50/50", border: "border-red-100", iconColor: "text-red-600" }
          ].map((hotel, i) => (
            <motion.div 
              key={i} 
              whileTap={{ scale: 0.98 }}
              onClick={() => openHotels(HOTELS_GENERAL_URL, hotel.name)} 
              className={`${hotel.color} p-5 rounded-[2rem] border ${hotel.border} flex justify-between items-center cursor-pointer transition-all hover:shadow-md`}
            >
              <div className="flex items-center gap-4">
                <div className="bg-white w-12 h-12 rounded-2xl shadow-sm flex items-center justify-center text-zinc-900">
                  <Hotel size={24} className={hotel.iconColor} />
                </div>
                <div>
                  <h4 className="font-black text-sm text-zinc-900">{hotel.name}</h4>
                  <div className="flex text-amber-500 mt-1">
                    {[...Array(hotel.stars)].map((_, s) => <Star key={s} size={10} fill="currentColor" />)}
                  </div>
                </div>
              </div>
              <div className="text-left bg-white/50 px-3 py-2 rounded-xl border border-white">
                <span className="block font-black text-sm text-zinc-900">{hotel.price}</span>
                <span className="text-[9px] text-zinc-400 font-black uppercase tracking-widest">لليلة</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Detailed Services Content (Tabs) */}
      <div className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {['flights', 'hotels', 'buses'].map((id) => (
             <button
               key={id}
               onClick={() => setActiveTab(id)}
               className={`px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest whitespace-nowrap transition-all ${
                 activeTab === id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white text-zinc-400'
               }`}
             >
               {id === 'flights' ? 'طيران' : id === 'hotels' ? 'فنادق' : 'حافلات'}
             </button>
          ))}
        </div>

        <div className="space-y-3">
          {activeTab === 'flights' && SFAX_FLIGHTS.map(f => (
            <div key={f.id} className="bg-white p-5 rounded-3xl border border-zinc-100 flex items-center justify-between group hover:border-blue-500 transition-colors shadow-sm">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                   <Plane size={24} />
                 </div>
                 <div>
                   <p className="font-black text-zinc-900">{f.to}</p>
                   <p className="text-xs font-bold text-zinc-400">{f.time} • {f.status}</p>
                 </div>
               </div>
               <p className="font-black text-blue-600">{f.price}</p>
            </div>
          ))}
          {activeTab === 'hotels' && HOTELS.map(h => (
            <div key={h.id} className="bg-white p-5 rounded-3xl border border-zinc-100 space-y-3 shadow-sm">
               <div className="flex items-center justify-between">
                 <h4 className="font-black text-zinc-900">{h.name}</h4>
                 <div className="flex text-yellow-400">
                    {[1,2,3,4,5].map(s => <Star key={s} size={10} fill={s <= Math.floor(h.rating) ? "currentColor" : "none"} />)}
                 </div>
               </div>
               <div className="bg-zinc-50 p-2 rounded-xl text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                 <Bot size={14} className="text-blue-500" /> {h.ai_tip}
               </div>
               <div className="flex justify-between items-center pt-2">
                 <span className="font-black text-zinc-900">{h.price}</span>
                 <button className="text-xs font-black text-blue-600 uppercase tracking-widest">عرض الفندق</button>
               </div>
            </div>
          ))}
          {activeTab === 'buses' && BUSES.map(b => (
            <div key={b.id} className="bg-white p-5 rounded-3xl border border-zinc-100 flex items-center justify-between shadow-sm">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-zinc-50 text-zinc-400 rounded-2xl flex items-center justify-center">
                   <Bus size={24} />
                 </div>
                 <div>
                   <p className="font-black text-zinc-900">{b.line}</p>
                   <p className="text-xs font-bold text-zinc-400">{b.time}</p>
                 </div>
               </div>
               <p className="font-black text-zinc-900">{b.price}</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Footer */}
      <div className="text-center p-8 pb-12 space-y-3">
        <p className="text-xs font-black text-zinc-300 uppercase tracking-widest">© 2026 مشروع صفاقس الذكي. جميع الحقوق محفوظة لـ AI Studio</p>
        <button 
          onClick={() => setShowTermsModal(true)}
          className="text-[10px] text-zinc-400 font-bold hover:text-blue-600 transition-colors uppercase tracking-widest"
        >
          الشروط والأحكام
        </button>
        <p className="text-[10px] text-zinc-400 italic">صنع بشغف لربط صفاقس بالعالم</p>
      </div>
    </div>
  );

  const renderTrains = () => (
    <div className="flex flex-col h-full animate-in slide-in-from-left duration-500 bg-zinc-50">
      <div className="p-6 flex items-center justify-between bg-white border-b border-zinc-100 sticky top-10 z-[55]">
        <div className="flex items-center gap-4">
          <button onClick={() => setActiveScreen('home')} className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center">
            <ChevronLeft size={24} />
          </button>
          <h3 className="text-xl font-black text-zinc-900">رحلات القطار صفاقس</h3>
        </div>
        <Train size={24} className="text-green-600" />
      </div>

      <div className="p-6 space-y-6 overflow-y-auto pb-10">
        <div className="bg-green-50 border border-green-100 p-5 rounded-3xl flex items-start gap-3 shadow-sm">
          <Info className="text-green-600 shrink-0" size={20} />
          <p className="text-xs text-green-800 font-bold leading-relaxed">
            نحن نقدم لك جدول الرحلات التقريبي. للحجز الفعلي وتأكيد المواعيد، سيتم توجيهك للموقع الرسمي لشركة SNCFT.
          </p>
        </div>

        {TRAIN_SCHEDULES.map((train) => (
          <motion.div 
            key={train.id} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-[2.5rem] border border-zinc-100 shadow-md space-y-6"
          >
            <div className="flex justify-between items-center">
              <span className="bg-zinc-100 px-4 py-1 rounded-full text-[10px] font-black uppercase text-zinc-500 tracking-widest">{train.type}</span>
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Clock size={14} />
                <span className="text-xs font-black uppercase tracking-widest">{train.duration}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-6 px-4">
              <div className="text-center space-y-1">
                <div className="text-2xl font-black text-zinc-900">{train.departure}</div>
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{train.from}</div>
              </div>
              
              <div className="flex-1 flex flex-col items-center gap-2">
                <div className="h-[2px] w-full bg-zinc-100 relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3">
                    <ArrowRightLeft size={20} className="text-blue-600" />
                  </div>
                </div>
                <span className="text-[9px] font-black text-blue-600/50 uppercase tracking-[0.2em]">DIRECT</span>
              </div>

              <div className="text-center space-y-1">
                <div className="text-2xl font-black text-zinc-900 opacity-30">--:--</div>
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{train.to}</div>
              </div>
            </div>

            <button 
              onClick={() => handleExternalBooking(SNCFT_URL)}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-green-100 active:scale-95"
            >
              <span>حجز عبر SNCFT</span>
              <ExternalLink size={20} />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderPartners = () => (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-10 duration-700 bg-white overflow-hidden">
      {/* Premium Header */}
      <div className="p-8 pb-4 relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16" />
        <button onClick={() => setActiveScreen('home')} className="mb-6 p-3 bg-zinc-100 rounded-2xl hover:bg-zinc-200 transition-colors">
          <ChevronLeft size={24} className="text-zinc-900" />
        </button>
        <h2 className="text-3xl font-black text-zinc-900 tracking-tight leading-none mb-3">
          الشركاء <br/>
          <span className="text-blue-600">Smart Partners</span>
        </h2>
        <p className="text-zinc-500 text-sm font-medium leading-relaxed">
          نعمل على رقمنة صفاقس بالتعاون مع المؤسسات الرائدة. <br/>
          <span className="text-[10px] uppercase font-black tracking-widest">Innovation Durable • ابتكار مستدام</span>
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-10 space-y-8 no-scrollbar scroll-smooth">
        {/* Call to Action Card */}
        <div className="bg-zinc-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Handshake size={100} />
          </div>
          <div className="relative z-10">
            <div className="bg-blue-600/30 w-fit px-4 py-1.5 rounded-full border border-blue-600/40 mb-6">
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Partner Program • 2026</span>
            </div>
            <h3 className="text-2xl font-black mb-4">كن شريكاً في التحول الرقمي</h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              ندعو كافة المؤسسات الحكومية والخاصة لربط بياناتها المفتوحة لتعزيز جودة الحياة للمواطن الصفاقسي.
            </p>
            <button className="bg-white text-zinc-900 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-transform">
              قدم طلب الشراكة • Postuler
            </button>
          </div>
        </div>

        {/* Partners Categories */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">مؤسسات موثقة • Partenaires Officiels</h4>
            <div className="h-px bg-zinc-100 flex-1 ml-4" />
          </div>
          
          {[
            { id: "sncft", name: "SNCFT", arabic: "السكك الحديدية التونسية", role: "النقل اللوجستي | Logistique", color: "bg-green-50", icon: <Train size={20} className="text-green-600" /> },
            { id: "oaca", name: "OACA", arabic: "ديوان الطيران المدني", role: "بيانات المطار | Open Data", color: "bg-blue-50", icon: <Plane size={20} className="text-blue-600" /> },
            { id: "municipality", name: "Ville de Sfax", arabic: "بلدية صفاقس", role: "الذكاء الحضري | Smart City", color: "bg-indigo-50", icon: <Building2 size={20} className="text-indigo-600" /> },
            { id: "tt", name: "Tunisie Telecom", arabic: "اتصالات تونس", role: "شريك الاتصال | Connectivité", color: "bg-emerald-50", icon: <ArrowUpRight size={20} className="text-emerald-600" /> },
            { id: "hotel", name: "FTI Sfax", arabic: "جامعة نزل صفاقس", role: "السياحة والضيافة | Tourisme", color: "bg-amber-50", icon: <Hotel size={20} className="text-amber-600" /> },
            { id: "soretras", name: "SORETRAS", arabic: "النقل الجهوي بصفاقس", role: "النقل العمومي | Transport", color: "bg-red-50", icon: <Bus size={20} className="text-red-600" /> }
          ].map((p) => (
            <motion.div 
              key={p.id}
              whileTap={{ scale: 0.98 }}
              className={`${p.color} p-6 rounded-[2.5rem] border border-white shadow-sm flex items-center justify-between group cursor-pointer hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center gap-4">
                <div className="bg-white w-14 h-14 rounded-2xl shadow-inner flex items-center justify-center">
                  {p.icon}
                </div>
                <div>
                  <h5 className="font-black text-zinc-900 text-sm">{p.arabic}</h5>
                  <p className="font-bold text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">{p.name} • {p.role}</p>
                </div>
              </div>
              <div className="bg-white/50 p-3 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowUpRight size={18} className="text-zinc-400 group-hover:text-blue-600" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Impact Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-50 p-8 rounded-[2.5rem] text-center space-y-2 border border-zinc-100">
             <div className="text-3xl font-black text-zinc-900">85%</div>
             <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-relaxed">دقة البيانات <br/> Data Accuracy</p>
          </div>
          <div className="bg-zinc-50 p-8 rounded-[2.5rem] text-center space-y-2 border border-zinc-100">
             <div className="text-3xl font-black text-zinc-900">+12</div>
             <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-relaxed">جهة حكومية <br/> Gov Entities</p>
          </div>
        </div>

        {/* Future Vision Footer */}
        <div className="py-8 text-center border-t border-zinc-100">
          <Bot size={32} className="mx-auto text-blue-600 mb-4 opacity-20" />
          <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.3em]">Vision Sfax 2030</p>
        </div>
      </div>
    </div>
  );

  const renderTracker = () => (
    <div className="flex flex-col h-full animate-in slide-in-from-left duration-500 bg-white">
      <div className="p-6 flex items-center justify-between border-b border-zinc-100 bg-white sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => setActiveScreen('home')} className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center">
            <ChevronLeft size={24} />
          </button>
          <h3 className="text-xl font-black text-zinc-900">تتبع المواصلات الحية</h3>
        </div>
        <div className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
           مباشر
        </div>
      </div>

      {/* Real Google Map Container */}
      <div className="flex-1 m-4 rounded-[2.5rem] overflow-hidden shadow-2xl border border-blue-100 bg-blue-50 relative group">
        {!isLoaded ? (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-100">
             <div className="w-10 h-10 border-4 border-zinc-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={14}
            options={{
              styles: mapStyles,
              disableDefaultUI: true,
              zoomControl: false,
              clickableIcons: false,
              gestureHandling: 'greedy'
            }}
          >
            {taxis.map(taxi => (
              <Marker
                key={taxi.id}
                position={{ lat: taxi.lat, lng: taxi.lng }}
                onClick={() => setSelectedTaxi(taxi)}
                icon={{
                  path: taxi.status === 'available' 
                    ? "M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"
                    : "M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z M12,2C10.3,2,9,3.3,9,5s1.3,3,3,3s3-1.3,3-3S13.7,2,12,2z", // Added a dot on top for busy
                  fillColor: taxi.status === 'available' ? "#22c55e" : "#ef4444",
                  fillOpacity: 1,
                  strokeWeight: taxi.status === 'available' ? 2 : 3,
                  strokeColor: taxi.status === 'available' ? "#ffffff" : "#000000",
                  scale: taxi.status === 'available' ? 1.5 : 1.7,
                  anchor: new google.maps.Point(12, 12)
                }}
              />
            ))}
          </GoogleMap>
        )}
        
        {/* Map Legend Overlay */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-2 rounded-2xl border border-zinc-100 shadow-lg flex flex-col gap-1.5 z-10">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">متاح</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">مشغول</span>
           </div>
        </div>

        {/* Floating Controls */}
        <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-3">
          <AnimatePresence>
            {selectedTaxi ? (
              <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                className="bg-white p-6 rounded-[2.5rem] shadow-2xl border border-blue-100"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-3xl flex items-center justify-center ${
                      selectedTaxi.status === 'available' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      <Car size={28} />
                    </div>
                    <div>
                      <h4 className="font-black text-lg text-zinc-900">{selectedTaxi.name}</h4>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${
                        selectedTaxi.status === 'available' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {selectedTaxi.status === 'available' ? 'متاح للطلب' : 'مشغول حالياً'}
                      </span>
                    </div>
                  </div>
                  <button className="bg-blue-600 text-white p-4 rounded-3xl shadow-xl active:scale-90">
                    <PhoneCall size={24} />
                  </button>
                </div>
                <div className="bg-zinc-50 p-4 rounded-2xl flex items-center gap-3 mb-6">
                   <div className="w-8 h-8 bg-zinc-200 rounded-lg flex items-center justify-center text-zinc-500">
                     <MapPin size={16} />
                   </div>
                   <p className="text-sm font-bold text-zinc-600 tracking-tight">متواجد بالقرب من <span className="font-black text-zinc-900">طريق المطار، صفاقس</span></p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                        setSelectedTaxi(null);
                        setActiveScreen('home');
                    }}
                    className="flex-1 bg-zinc-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95"
                  >
                    اطلب الرحلة الآن
                  </button>
                  <button onClick={() => setSelectedTaxi(null)} className="px-6 py-4 bg-zinc-100 rounded-2xl text-zinc-400 font-bold active:scale-95">
                    إلغاء
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900/90 backdrop-blur-xl p-5 rounded-[2.5rem] flex justify-around shadow-2xl border border-white/10"
              >
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-black text-green-400">{taxis.filter(t => t.status === 'available').length}</span>
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">متاحة الآن</span>
                </div>
                <div className="w-px bg-white/10 h-8 self-center"></div>
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-black text-white">12</span>
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">في الخدمة</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm h-[850px] bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] rounded-[3.5rem] border-[12px] border-zinc-900 overflow-hidden flex flex-col relative" dir="rtl">
        {/* Dynamic Island Status Bar */}
        <div className="h-10 w-full flex justify-center items-end pb-2 sticky top-0 bg-white z-[60]">
          <div className="w-28 h-7 bg-zinc-900 rounded-full flex items-center justify-center gap-2 px-3">
            <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
            <span className="text-[9px] text-white font-black tracking-widest uppercase">SFAX-HUB LIVE</span>
          </div>
        </div>

        {/* Header (Hub Identity) */}
        {activeScreen === 'home' && (
          <div className="px-6 py-4 flex items-center justify-start bg-white/80 backdrop-blur sticky top-10 z-[55]">
            <button 
              onClick={onBack}
              className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400"
            >
              <ArrowLeft size={18} />
            </button>
          </div>
        )}

        {/* Main Content Viewport */}
        <div className="flex-1 overflow-y-auto bg-zinc-50 custom-scrollbar">
          {activeScreen === 'home' && renderHome()}
          {activeScreen === 'tracker' && renderTracker()}
          {activeScreen === 'trains' && renderTrains()}
          {activeScreen === 'partners' && renderPartners()}
          {activeScreen === 'chat' && renderAiAssistant()}
        </div>

        {/* Tab Bar (Bio-Design) */}
        <div className="bg-white/95 backdrop-blur-xl border-t border-zinc-100 px-10 py-8 flex justify-around items-center relative z-50">
          <button 
            onClick={() => setActiveScreen('home')} 
            className={`transition-all duration-300 ${activeScreen === 'home' ? 'text-blue-600 scale-125' : 'text-zinc-300'}`}
          >
            <Search size={28} />
          </button>
          <div 
            onClick={() => setActiveScreen('chat')}
            className={`w-14 h-14 rounded-3xl -mt-16 shadow-xl flex items-center justify-center text-white ring-8 ring-white active:scale-90 transition-all cursor-pointer ${activeScreen === 'chat' ? 'bg-blue-600 scale-110' : 'bg-zinc-900'}`}
          >
             <Bot size={28} />
          </div>
          <button 
             className="text-zinc-300 transition-all hover:text-blue-600"
             onClick={() => {
                setChatInput("كيف يمكنني التواصل مع فريق 2go؟");
                setActiveScreen('chat');
             }}
          >
            <Mail size={28} />
          </button>
          
          <motion.div 
            animate={{ 
              x: activeScreen === 'home' ? -120 : activeScreen === 'partners' ? 120 : 0,
              opacity: (activeScreen === 'chat' || activeScreen === 'partners') ? 0 : 1
            }}
            className="absolute bottom-4 left-1/2 h-1 w-8 bg-blue-600 rounded-full"
          />
        </div>

        {/* Airport Modal (Custom Flight Board) */}
        <AnimatePresence>
          {showAirportModal && (
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-x-0 bottom-0 top-10 bg-white z-[70] flex flex-col overflow-hidden rounded-t-[3rem] shadow-[-20px_-20px_60px_rgba(0,0,0,0.1)] border-t border-zinc-100"
            >
              {/* Modal Header */}
              <div className="p-6 flex justify-between items-center border-b border-zinc-100 bg-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                    <Plane size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-zinc-900">مطار صفاقس طينة الدولي</h4>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">مباشر الآن</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAirportModal(false)}
                  className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 active:scale-90 transition-transform"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content - Custom Flight Board */}
              <div className="flex-1 bg-zinc-50 overflow-y-auto no-scrollbar pb-10">
                {/* Board Summary Header */}
                <div className="bg-zinc-900 p-8 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                  <div className="flex justify-between items-center relative z-10">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">إجمالي الرحلات اليوم</p>
                      <p className="text-4xl font-black">12 <span className="text-sm font-medium text-zinc-400">رحلة</span></p>
                    </div>
                    <button 
                      onClick={() => {
                        setIsAirportRefreshing(true);
                        setTimeout(() => setIsAirportRefreshing(false), 1500);
                      }}
                      className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                      <Activity size={24} className={isAirportRefreshing ? "animate-spin" : ""} />
                    </button>
                  </div>
                  <div className="mt-8 flex gap-6 relative z-10">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-green-500" />
                       <span className="text-[10px] font-black text-zinc-400 uppercase">10 في الموعد</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-amber-500" />
                       <span className="text-[10px] font-black text-zinc-400 uppercase">2 متأخرة</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <h5 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">لوحة المغادرة والوصول</h5>
                  
                  {isAirportRefreshing ? (
                    <div className="py-20 flex flex-col items-center gap-4">
                       <div className="w-10 h-10 border-4 border-zinc-200 border-t-blue-600 rounded-full animate-spin" />
                       <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">جاري تحديث البيانات...</p>
                    </div>
                  ) : (
                    [
                      { id: 101, airline: "Tunisair", flight: "TU 712", to: "باريس (CDG)", time: "14:30", status: "Boarding", gate: "A02", type: "dep" },
                      { id: 102, airline: "Turkish Airlines", flight: "TK 664", to: "اسطنبول (IST)", time: "18:15", status: "On Time", gate: "B01", type: "dep" },
                      { id: 103, airline: "Nouvelair", flight: "BJ 221", to: "ليون (LYS)", time: "09:00", status: "Delayed", gate: "A01", type: "dep" },
                      { id: 104, airline: "Tunisair Express", flight: "UG 003", to: "تونس (TUN)", time: "07:30", status: "Departed", gate: "C01", type: "dep" },
                      { id: 105, airline: "Transavia", flight: "TO 451", to: "مارسيليا (MRS)", time: "21:00", status: "Scheduled", gate: "--", type: "dep" },
                    ].map((f) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={f.id} 
                        className="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm flex items-center justify-between group hover:border-blue-500 transition-all"
                      >
                        <div className="flex items-center gap-4">
                           <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center relative">
                              <Plane size={24} className="text-zinc-300 group-hover:text-blue-600 transition-colors" />
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-zinc-200 border-2 border-white rounded-full" />
                           </div>
                           <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-zinc-900">{f.to}</span>
                                <span className="text-[9px] font-black bg-zinc-100 px-2 py-0.5 rounded text-zinc-400 uppercase">{f.flight}</span>
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs font-bold text-zinc-400">{f.airline}</span>
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{f.time}</span>
                              </div>
                           </div>
                        </div>
                        <div className="text-right space-y-1">
                           <p className={`text-[10px] font-black uppercase tracking-widest ${
                             f.status === 'Boarding' ? 'text-blue-600' : 
                             f.status === 'Delayed' ? 'text-amber-500' :
                             f.status === 'On Time' ? 'text-green-500' : 'text-zinc-400'
                           }`}>{f.status}</p>
                           <p className="text-xs font-black text-zinc-900">GATE {f.gate}</p>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                {/* Airport Stats Section */}
                <div className="p-6">
                   <div className="bg-zinc-100/50 p-6 rounded-[2.5rem] border border-zinc-100 flex justify-around">
                      <div className="text-center">
                         <p className="text-2xl font-black text-zinc-900">24°C</p>
                         <p className="text-[9px] font-black text-zinc-400 uppercase">درجة الحرارة</p>
                      </div>
                      <div className="w-px bg-zinc-200 h-8 self-center" />
                      <div className="text-center">
                         <p className="text-2xl font-black text-zinc-900">12km</p>
                         <p className="text-[9px] font-black text-zinc-400 uppercase">مدى الرؤية</p>
                      </div>
                      <div className="w-px bg-zinc-200 h-8 self-center" />
                      <div className="text-center">
                         <p className="text-2xl font-black text-zinc-900">08kt</p>
                         <p className="text-[9px] font-black text-zinc-400 uppercase">الرياح</p>
                      </div>
                   </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-8 bg-white border-t border-zinc-100 flex gap-4">
                <button 
                  onClick={() => handleExternalBooking(AIRPORT_URL)}
                  className="flex-1 bg-zinc-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  فتح لوحة التتبع <Maximize2 size={16}/>
                </button>
                <button 
                  onClick={() => setShowAirportModal(false)}
                  className="flex-1 bg-blue-50 text-blue-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-transform"
                >
                  العودة للدليل
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hotel/External Dashboard Modal */}
        <AnimatePresence>
          {showHotelModal && (
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-x-0 bottom-0 top-10 bg-white z-[70] flex flex-col overflow-hidden rounded-t-[3rem] shadow-[-20px_-20px_60px_rgba(0,0,0,0.1)] border-t border-zinc-100"
            >
              {/* Modal Header */}
              <div className="p-6 flex justify-between items-center border-b border-zinc-100 bg-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                    <Hotel size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-zinc-900 truncate max-w-[180px]">{modalTitle}</h4>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">تحديث مباشر • 2026</span>
                  </div>
                </div>
                <button 
                  onClick={() => setShowHotelModal(false)}
                  className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 active:scale-90 transition-transform"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Iframe Content */}
              <div className="flex-1 bg-zinc-50 relative">
                <iframe 
                  src={currentExternalUrl}
                  className="w-full h-full border-none"
                  title="Hotel Explorer"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white to-transparent pointer-events-none" />
              </div>

              {/* Modal Footer */}
              <div className="p-8 bg-white border-t border-zinc-100 flex gap-4">
                <button 
                  onClick={() => handleExternalBooking(currentExternalUrl)}
                  className="flex-1 bg-zinc-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  فتح الموقع الأصلي <ExternalLink size={16}/>
                </button>
                <button 
                  onClick={() => setShowHotelModal(false)}
                  className="flex-1 bg-blue-50 text-blue-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-transform"
                >
                  العودة للتطبيق
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Terms and Conditions Modal */}
        <AnimatePresence>
          {showTermsModal && (
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-x-0 bottom-0 top-10 bg-white z-[80] flex flex-col overflow-hidden rounded-t-[3rem] shadow-[-20px_-20px_60px_rgba(0,0,0,0.1)] border-t border-zinc-100"
            >
              <div className="p-6 flex justify-between items-center border-b border-zinc-100 bg-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-100 text-zinc-900 rounded-2xl flex items-center justify-center">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-zinc-900 uppercase tracking-widest text-xs">الشروط والأحكام</h4>
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">تحديث: 19 أفريل 2026</span>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTermsModal(false)}
                  className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 active:scale-90 transition-transform"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 bg-zinc-50 overflow-y-auto p-8 space-y-8 text-right font-medium text-zinc-600 leading-relaxed custom-scrollbar text-right" dir="rtl">
                <section>
                  <h5 className="text-lg font-black text-zinc-900 mb-3 border-r-4 border-blue-600 pr-3">1. مقدمة</h5>
                  <p className="text-sm">باستخدامك لتطبيق "دليل صفاقس الذكي"، فإنك توافق على الالتزام بالشروط والأحكام الموضحة في هذا المستند. يهدف التطبيق إلى توفير معلومات سياحية وخدمية عن مدينة صفاقس.</p>
                </section>

                <section>
                  <h5 className="text-lg font-black text-zinc-900 mb-3 border-r-4 border-blue-600 pr-3">2. استخدام المعلومات</h5>
                  <ul className="list-disc pr-6 space-y-2 text-sm">
                    <li>جميع المعلومات المتعلقة بالرحلات الجوية، الفنادق، والقطارات يتم جلبها من مصادر خارجية لغرض التوجيه فقط.</li>
                    <li>التطبيق غير مسؤول عن أي تغيير مفاجئ في مواعيد الرحلات أو أسعار الغرف الفندقية من المصدر.</li>
                  </ul>
                </section>

                <section>
                  <h5 className="text-lg font-black text-zinc-900 mb-3 border-r-4 border-blue-600 pr-3">3. الخصوصية وحماية البيانات</h5>
                  <p className="text-sm">نحن نلتزم بحماية خصوصيتك. التطبيق لا يقوم بجمع بيانات شخصية حساسة دون إذن صريح، ويتم استخدام ملفات تعريف الارتباط فقط لتحسين تجربة المستخدم داخل الواجهة الذكية.</p>
                </section>

                <section>
                  <h5 className="text-lg font-black text-zinc-900 mb-3 border-r-4 border-blue-600 pr-3">4. روابط الأطراف الثالثة</h5>
                  <p className="text-sm">يتضمن التطبيق روابط لمواقع خارجية (مثل FlightRadar24 وBooking.com). نحن غير مسؤولين عن محتوى هذه المواقع أو سياسات الخصوصية الخاصة بها.</p>
                </section>

                <section>
                  <h5 className="text-lg font-black text-zinc-900 mb-3 border-r-4 border-blue-600 pr-3">5. حدود المسؤولية</h5>
                  <p className="text-sm">يتم تقديم الخدمة "كما هي". لا يتحمل مطورو التطبيق مسؤولية أي أضرار ناتجة عن استخدام التطبيق أو الاعتماد على المعلومات الواردة فيه في حالات الطوارئ.</p>
                </section>

                <section>
                  <h5 className="text-lg font-black text-zinc-900 mb-3 border-r-4 border-blue-600 pr-3">6. التعديلات</h5>
                  <p className="text-sm">نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم إخطار المستخدمين بأي تغييرات جوهرية عبر تحديث هذا المستند.</p>
                </section>

                <div className="pt-8 border-t border-zinc-200 text-center">
                  <p className="text-xs italic text-zinc-400">شكراً لثقتكم بدليل صفاقس الذكي.</p>
                  <p className="text-xs font-black text-zinc-900 uppercase tracking-widest mt-1">إدارة التطبيق - صفاقس، تونس</p>
                </div>
              </div>

              <div className="p-8 bg-white border-t border-zinc-100">
                <button 
                  onClick={() => setShowTermsModal(false)}
                  className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-transform shadow-xl shadow-zinc-200"
                >
                  فهمت وأوافق
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
