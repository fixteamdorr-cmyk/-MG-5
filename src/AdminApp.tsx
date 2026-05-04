import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { 
  Users, 
  Map as MapIcon, 
  BarChart3, 
  Settings, 
  LogOut, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  AlertCircle, 
  ArrowRight,
  TrendingUp,
  DollarSign,
  Navigation,
  Search,
  Filter,
  Eye,
  Menu,
  X,
  Mail,
  Car,
  ClipboardList
} from "lucide-react";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc,
  limit,
  getDoc
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { sendNotification } from "./components/NotificationService";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, OverlayView } from "@react-google-maps/api";
import { Maps_API_KEY } from "./config";

const containerStyle = {
  width: '100%',
  height: '100%'
};

const center = {
  lat: 34.7400, // Sfax, Tunisia
  lng: 10.7600
};

const mapStyles = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#212121" }]
  },
  {
    "elementType": "labels.icon",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#757575" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#212121" }]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [{ "color": "#757575" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#000000" }]
  }
];

export default function AdminApp() {
  console.log("AdminApp rendering");
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<"drivers" | "map" | "rides" | "revenue" | "fleet">("drivers");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [stats, setStats] = useState({
    totalDrivers: 0,
    approvedDrivers: 0,
    pendingDrivers: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    // Real-time stats listener
    const driversUnsub = onSnapshot(collection(db, "sfax_drivers"), (snapshot) => {
      const all = snapshot.docs.map(d => d.data());
      setStats(prev => ({
        ...prev,
        totalDrivers: all.length,
        approvedDrivers: all.filter(d => d.status === 'approved').length,
        pendingDrivers: all.filter(d => d.status === 'pending' || !d.status).length
      }));
    });

    const tripsUnsub = onSnapshot(collection(db, "trips"), (snapshot) => {
      const all = snapshot.docs.map(d => d.data());
      setStats(prev => ({
        ...prev,
        totalRevenue: all.reduce((sum, t) => sum + (t.earnings || 0), 0)
      }));
    });

    const activeTripsUnsub = onSnapshot(query(collection(db, "trip_requests"), where("status", "==", "searching")), (snapshot) => {
      setStats(prev => ({
        ...prev,
        activeTrips: snapshot.size
      }));
    });

    return () => {
      driversUnsub();
      tripsUnsub();
      activeTripsUnsub();
    };
  }, []);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: Maps_API_KEY,
    libraries: ["places", "geometry"],
    language: i18n.language
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex font-sans overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="bg-zinc-900 border-l border-white/5 flex flex-col relative z-50"
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold rounded-xl flex items-center justify-center shadow-lg shadow-gold/20">
                <Car size={24} className="text-black" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-lg tracking-tight leading-none">SWIFT DRIVE</span>
                <span className="text-[10px] font-black text-gold tracking-[0.2em]">SFAX ADMIN</span>
              </div>
            </div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center hover:bg-zinc-700 transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-8">
          <SidebarItem 
            icon={<Users size={20} />} 
            label="السائقين" 
            active={activeTab === "drivers"} 
            onClick={() => setActiveTab("drivers")}
            isOpen={isSidebarOpen}
          />
          <SidebarItem 
            icon={<MapIcon size={20} />} 
            label="الخريطة الحية" 
            active={activeTab === "map"} 
            onClick={() => setActiveTab("map")}
            isOpen={isSidebarOpen}
          />
          <SidebarItem 
            icon={<Navigation size={20} />} 
            label="الرحلات" 
            active={activeTab === "rides"} 
            onClick={() => setActiveTab("rides")}
            isOpen={isSidebarOpen}
          />
          <SidebarItem 
            icon={<BarChart3 size={20} />} 
            label="الإيرادات" 
            active={activeTab === "revenue"} 
            onClick={() => setActiveTab("revenue")}
            isOpen={isSidebarOpen}
          />
          <SidebarItem 
            icon={<Car size={20} />} 
            label="الأسطول" 
            active={activeTab === "fleet"} 
            onClick={() => setActiveTab("fleet")}
            isOpen={isSidebarOpen}
          />
        </nav>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-40">
          <h2 className="text-xl font-black">
            {activeTab === "drivers" && "إدارة السائقين"}
            {activeTab === "map" && "تتبع السائقين المباشر"}
            {activeTab === "rides" && "إدارة طلبات الرحلات"}
            {activeTab === "revenue" && "التقارير المالية"}
            {activeTab === "fleet" && "إدارة الأسطول والطيارين"}
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-zinc-900 px-4 py-2 rounded-xl border border-white/5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-bold text-zinc-400">النظام متصل</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-zinc-900 border border-white/5 p-6 rounded-3xl flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                <Users size={24} className="text-blue-500" />
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">إجمالي السائقين</p>
                <p className="text-2xl font-black text-white">{stats.totalDrivers}</p>
              </div>
            </div>
            <div className="bg-zinc-900 border border-white/5 p-6 rounded-3xl flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center">
                <CheckCircle2 size={24} className="text-green-500" />
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">المعتمدين</p>
                <p className="text-2xl font-black text-green-500">{stats.approvedDrivers}</p>
              </div>
            </div>
            <div className="bg-zinc-900 border border-white/5 p-6 rounded-3xl flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center">
                <Clock size={24} className="text-yellow-500" />
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">قيد المراجعة</p>
                <p className="text-2xl font-black text-yellow-500">{stats.pendingDrivers}</p>
              </div>
            </div>
            <div className="bg-zinc-900 border border-white/5 p-6 rounded-3xl flex items-center gap-4">
              <div className="w-12 h-12 bg-gold/10 rounded-2xl flex items-center justify-center">
                <DollarSign size={24} className="text-gold" />
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">إجمالي الإيرادات</p>
                <p className="text-2xl font-black text-gold">{stats.totalRevenue.toLocaleString()} د.ت</p>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "drivers" && <DriverManagement />}
            {activeTab === "map" && <LiveMap isLoaded={isLoaded} />}
            {activeTab === "rides" && <RideManagement />}
            {activeTab === "revenue" && <RevenueView />}
            {activeTab === "fleet" && <FleetManagement />}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick, isOpen }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full h-14 flex items-center gap-4 px-4 rounded-2xl transition-all group ${
        active ? 'bg-gold text-black shadow-lg shadow-gold/10' : 'text-zinc-500 hover:bg-white/5 hover:text-white'
      }`}
    >
      <div className="shrink-0">{icon}</div>
      {isOpen && <span className="font-black text-sm whitespace-nowrap">{label}</span>}
    </button>
  );
}

function DriverManagement() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [vehicleFilter, setVehicleTypeFilter] = useState<string>("all");

  useEffect(() => {
    // Listening to sfax_drivers collection (Firestore equivalent of RTDB node)
    const q = query(collection(db, "sfax_drivers"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("AdminApp: Fetched sfax_drivers - Count:", docs.length);
      if (docs.length > 0) {
        const firstDoc = docs[0] as any;
        console.log("Debug - First driver image keys:", {
          profile: !!firstDoc.profile_image_url,
          car: !!firstDoc.car_image_url,
          id: !!firstDoc.id_card_url
        });
      }
      setDrivers(docs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching drivers:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "sfax_drivers", id), { status });
      
      // WhatsApp Notification Logic
      let message = "";
      if (status === 'approved') {
        message = "تهانينا! تم اعتماد حسابك في Swift Drive صفاقس. يمكنك الآن البدء في استقبال الرحلات.";
      } else if (status === 'rejected') {
        message = "نعتذر، لم يتم قبول طلبك حالياً. يرجى التثبت من الوثائق المرفقة.";
      } else if (status === 'pending') {
        message = "تم إعادة طلبك للمراجعة. يرجى التأكد من اكتمال وثائقك وانتظار الرد.";
      }
      
      const cleanPhone = (selectedDriver?.phone || "").replace('+', '').replace(/\s/g, '');
      if (cleanPhone.startsWith('216') && message) {
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
      }

      // Send in-app notification to driver
      if (status === 'approved') {
        await sendNotification(
          id,
          "تم تفعيل حسابك",
          "تهانينا! تم اعتماد حسابك كتاكسي رسمي في صفاقس. يمكنك الآن بدء استقبال الطلبات.",
          "account_approved"
        );
      } else if (status === 'rejected') {
        await sendNotification(
          id,
          "تحديث بخصوص طلبك",
          "نأسف لإبلاغك بأنه لم يتم قبول طلبك في الوقت الحالي. يرجى مراجعة الوثائق المرفوعة.",
          "account_rejected"
        );
      } else if (status === 'pending') {
        await sendNotification(
          id,
          "طلبك قيد المراجعة",
          "تمت إعادة ملفك للمراجعة من قبل الإدارة. يرجى الانتظار.",
          "account_pending"
        );
      }

      // Update local state for immediate feedback
      setDrivers(prev => prev.map(d => d.id === id ? { ...d, status } : d));
      if (selectedDriver?.id === id) {
        setSelectedDriver({ ...selectedDriver, status });
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("حدث خطأ أثناء تحديث الحالة.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Drivers List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black">طلبات التسجيل ({drivers.length})</h3>
            <div className="flex gap-2">
              <select 
                value={vehicleFilter}
                onChange={(e) => setVehicleTypeFilter(e.target.value)}
                className="bg-zinc-900 border border-white/5 rounded-lg text-xs font-bold px-3 py-2 outline-none text-zinc-400 focus:text-white transition-colors"
              >
                <option value="all">جميع أنواع السيارات</option>
                <option value="sedan">سيدان (Sedan)</option>
                <option value="SUV">دفع رباعي (SUV)</option>
                <option value="luxury">فاخرة (Luxury)</option>
              </select>
              <button className="p-2 bg-zinc-900 border border-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors">
                <Filter size={18} />
              </button>
              <button className="p-2 bg-zinc-900 border border-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors">
                <Search size={18} />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {drivers?.filter(d => vehicleFilter === 'all' || d.vehicleType?.toLowerCase() === vehicleFilter.toLowerCase()).map(driver => (
              <div 
                key={driver.id}
                onClick={() => setSelectedDriver(driver)}
                className={`p-6 bg-zinc-900 border rounded-[32px] flex items-center justify-between cursor-pointer transition-all hover:border-gold/50 ${
                  selectedDriver?.id === driver.id ? 'border-gold bg-gold/5' : 'border-white/5'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-zinc-800 rounded-2xl overflow-hidden border border-white/5">
                    <img 
                      src={driver.profile_image_url || `https://picsum.photos/seed/${driver.id}/100/100`} 
                      alt="" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h4 className="font-black text-white">{driver.fullName}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-bold">{driver.phone}</span>
                      <span className="text-[10px] text-zinc-600 font-bold">{driver.carModel} • <span className="text-gold uppercase">{driver.vehicleType || 'Unknown'}</span></span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    driver.status === 'approved' ? 'bg-green-500/10 text-green-500' :
                    driver.status === 'rejected' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'
                  }`}>
                    {driver.status}
                  </span>
                  <ArrowRight size={18} className="text-zinc-700" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Driver Details Panel */}
        <div className="bg-zinc-900 border border-white/5 rounded-[40px] p-8 h-fit sticky top-8">
          {selectedDriver ? (
            <div className="space-y-8">
              <div className="text-center space-y-4">
                <div className="w-24 h-24 bg-zinc-800 rounded-[32px] overflow-hidden mx-auto border-4 border-white/5">
                  <img 
                    src={selectedDriver.profile_image_url || `https://picsum.photos/seed/${selectedDriver.id}/200/200`} 
                    alt="" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h3 className="text-2xl font-black">{selectedDriver.fullName}</h3>
                  <p className="text-zinc-500 font-bold">{selectedDriver.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-800/50 rounded-2xl border border-white/5">
                  <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">الهاتف</p>
                  <p className="font-bold text-sm">{selectedDriver.phone}</p>
                </div>
                <div className="p-4 bg-zinc-800/50 rounded-2xl border border-white/5">
                  <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">السيارة</p>
                  <p className="font-bold text-sm">{selectedDriver.carModel} ({selectedDriver.carYear})</p>
                </div>
                <div className="p-4 bg-zinc-800/50 rounded-2xl border border-white/5">
                  <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">تاريخ التسجيل</p>
                  <p className="font-bold text-sm">
                    {selectedDriver.createdAt?.toDate ? selectedDriver.createdAt.toDate().toLocaleDateString('ar-TN') : 'غير متوفر'}
                  </p>
                </div>
                <div className="p-4 bg-zinc-800/50 rounded-2xl border border-white/5">
                  <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">التقييم</p>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-sm text-gold">{selectedDriver.rating || "5.0"}</span>
                    <TrendingUp size={12} className="text-gold" />
                  </div>
                </div>
                <div className="p-4 bg-zinc-800/50 rounded-2xl border border-white/5">
                  <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">الحالة</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${selectedDriver.isOnline ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`} />
                    <span className="font-bold text-sm">{selectedDriver.isOnline ? 'متصل الآن' : 'غير متصل'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest px-2">الوثائق الثبوتية</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-zinc-400 text-center">الهوية / الرخصة</p>
                    <div className="aspect-video bg-zinc-800 rounded-2xl overflow-hidden border border-white/5 group relative">
                      {selectedDriver.id_card_url ? (
                        <img 
                          src={selectedDriver.id_card_url} 
                          alt="ID Card" 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            console.error("ID Card loading error:", target.src);
                            // Only replace if it's not already a placeholder
                            if (!target.src.includes('picsum')) {
                              target.src = "https://picsum.photos/seed/id_error/400/300?blur=2";
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 text-[10px] gap-1">
                          <AlertCircle size={16} />
                          <span>لا توجد صورة</span>
                        </div>
                      )}
                      {selectedDriver.id_card_url && (
                        <button 
                          onClick={() => setPreviewImage(selectedDriver.id_card_url)}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <Eye size={24} className="text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-zinc-400 text-center">صورة السيارة</p>
                    <div className="aspect-video bg-zinc-800 rounded-2xl overflow-hidden border border-white/5 group relative">
                      {selectedDriver.car_image_url ? (
                        <img 
                          src={selectedDriver.car_image_url} 
                          alt="Car" 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            console.error("Car image loading error:", target.src);
                            if (!target.src.includes('picsum')) {
                              target.src = "https://picsum.photos/seed/car_error/400/300?blur=2";
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 text-[10px] gap-1">
                          <AlertCircle size={16} />
                          <span>لا توجد صورة</span>
                        </div>
                      )}
                      {selectedDriver.car_image_url && (
                        <button 
                          onClick={() => setPreviewImage(selectedDriver.car_image_url)}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <Eye size={24} className="text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {(!selectedDriver.status || selectedDriver.status === 'pending') ? (
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => updateStatus(selectedDriver.id, 'rejected')}
                    disabled={isUpdating}
                    className="flex-1 h-14 bg-red-500/10 text-red-500 font-black rounded-2xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center disabled:opacity-50"
                  >
                    {isUpdating ? <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> : "رفض الطلب"}
                  </button>
                  <button 
                    onClick={() => updateStatus(selectedDriver.id, 'approved')}
                    disabled={isUpdating}
                    className="flex-1 h-14 bg-green-500 text-white font-black rounded-2xl shadow-xl shadow-green-500/20 hover:bg-green-600 transition-all flex items-center justify-center disabled:opacity-50"
                  >
                    {isUpdating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "اعتماد السائق"}
                  </button>
                </div>
              ) : (
                <div className={`p-6 rounded-[32px] text-center font-black uppercase tracking-widest flex flex-col items-center gap-4 ${
                  selectedDriver.status === 'approved' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                }`}>
                  <div className="flex items-center justify-center gap-3">
                    {selectedDriver.status === 'approved' ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
                    <span className="text-xl">
                      {selectedDriver.status === 'approved' ? 'تم اعتماد السائق' : 'تم رفض الطلب'}
                    </span>
                  </div>
                  <button 
                    onClick={() => updateStatus(selectedDriver.id, 'pending')}
                    disabled={isUpdating}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 underline underline-offset-4 disabled:opacity-50"
                  >
                    {isUpdating ? "جاري التغيير..." : "إعادة الطلب للمراجعة (Pending)"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-20 text-center space-y-4 opacity-50">
              <Users size={48} className="mx-auto text-zinc-700" />
              <p className="font-bold text-zinc-500">اختر سائقاً لمراجعة بياناته</p>
            </div>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8 md:p-20"
          >
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute top-8 right-8 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X size={24} />
            </button>
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={previewImage} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function LiveMap({ isLoaded }: { isLoaded: boolean }) {
  const [activeDrivers, setActiveDrivers] = useState<any[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<any>(null);

  useEffect(() => {
    // Query drivers with status 'approved' and who are currently 'online'
    const q = query(
      collection(db, "sfax_drivers"), 
      where("status", "==", "approved"),
      where("isOnline", "==", true)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const drivers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("Active drivers updated:", drivers.length);
      setActiveDrivers(drivers);
    }, (error) => {
      console.error("Error fetching active drivers:", error);
    });
    return () => unsubscribe();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full rounded-[40px] overflow-hidden border border-white/5 relative"
    >
      {isLoaded ? (
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={12}
          options={{
            styles: mapStyles,
            disableDefaultUI: true,
            zoomControl: true,
          }}
          onClick={() => setSelectedMarker(null)}
        >
          {activeDrivers?.map(driver => (
            driver.location && (
              <React.Fragment key={driver.id}>
                {/* Custom Animated Overlay Marker */}
                <OverlayView
                  position={{
                    lat: driver.location.lat,
                    lng: driver.location.lng
                  }}
                  mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                >
                  <motion.div
                    layout
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    whileHover={{ scale: 1.2 }}
                    onClick={() => setSelectedMarker(driver)}
                    className="cursor-pointer"
                    style={{
                      width: 40,
                      height: 40,
                      transform: 'translate(-50%, -50%)', // Core centering
                    }}
                  >
                    <div className="relative group">
                      <div className={`absolute inset-0 rounded-full blur-lg opacity-40 transition-colors duration-500 ${driver.isBusy ? 'bg-red-500' : 'bg-green-500'}`} />
                      <div className={`relative p-2 rounded-xl border border-white/10 shadow-2xl transition-all duration-500 backdrop-blur-sm ${driver.isBusy ? 'bg-red-500' : 'bg-green-500'}`}>
                        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white shadow-sm">
                          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
                        </svg>
                      </div>
                      
                      {/* Name Tag on Hover */}
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-bold border border-white/10 shadow-xl">
                        {driver.fullName}
                      </div>
                    </div>
                  </motion.div>
                </OverlayView>

                {selectedMarker?.id === driver.id && (
                  <InfoWindow
                    position={{
                      lat: driver.location.lat,
                      lng: driver.location.lng
                    }}
                    onCloseClick={() => setSelectedMarker(null)}
                  >
                    <div className="p-2 min-w-[120px]">
                      <p className="font-black text-zinc-900 border-b border-zinc-100 pb-1 mb-1">{driver.fullName}</p>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${driver.isBusy ? 'bg-red-500' : 'bg-green-500'}`} />
                        <span className="text-[10px] font-bold text-zinc-600">
                          {driver.isBusy ? 'في رحلة حالياً' : 'متاح للطلب'}
                        </span>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </React.Fragment>
            )
          ))}
        </GoogleMap>
      ) : (
        <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-white/5 border-t-gold rounded-full animate-spin" />
        </div>
      )}

      {/* Map Overlay Stats */}
      <div className="absolute top-6 left-6 space-y-3">
        <div className="bg-zinc-900/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-2xl">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">السائقين النشطين</p>
          <p className="text-2xl font-black text-gold">{activeDrivers.length}</p>
        </div>
      </div>
    </motion.div>
  );
}

function RideManagement() {
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRide, setSelectedRide] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, "trip_requests"), orderBy("timestamp", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error fetching trip requests:", error);
    });
    return () => unsubscribe();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-zinc-900 border border-white/5 rounded-[40px] overflow-hidden">
        <table className="w-full text-right">
          <thead>
            <tr className="border-b border-white/5 bg-white/5">
              <th className="p-6 text-xs font-black text-zinc-500 uppercase tracking-widest">الراكب</th>
              <th className="p-6 text-xs font-black text-zinc-500 uppercase tracking-widest">الوجهة</th>
              <th className="p-6 text-xs font-black text-zinc-500 uppercase tracking-widest">الحالة</th>
              <th className="p-6 text-xs font-black text-zinc-500 uppercase tracking-widest">التكلفة</th>
              <th className="p-6 text-xs font-black text-zinc-500 uppercase tracking-widest">الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {requests?.map(req => (
              <tr key={req.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-6 font-bold">{req.passengerName}</td>
                <td className="p-6 text-zinc-400 text-sm truncate max-w-[200px]">{req.destination?.address}</td>
                <td className="p-6">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                    req.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                    req.status === 'cancelled' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                  }`}>
                    {req.status}
                  </span>
                </td>
                <td className="p-6 font-black text-gold">{req.estimation?.price} د.ت</td>
                <td className="p-6">
                  <button 
                    onClick={() => setSelectedRide(req)}
                    className="p-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                  >
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {selectedRide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedRide(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gold/5">
                <div>
                  <h3 className="text-2xl font-black text-white mb-1">تفاصيل الرحلة</h3>
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">المعرف: {selectedRide.id.slice(0, 8)}</p>
                </div>
                <button 
                  onClick={() => setSelectedRide(null)}
                  className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">الراكب</p>
                    <p className="text-lg font-black">{selectedRide.passengerName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">التكلفة الإجمالية</p>
                    <p className="text-lg font-black text-gold">{selectedRide.estimation?.price} د.ت</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="w-10 flex flex-col items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <div className="w-0.5 h-12 bg-zinc-800" />
                      <div className="w-3 h-3 rounded-full bg-gold" />
                    </div>
                    <div className="flex-1 space-y-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-zinc-400">نقطة الانطلاق</p>
                        <p className="text-sm font-bold text-white">{selectedRide.pickup?.address || "موقع مجهول"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-zinc-400">الوجهة النهائية</p>
                        <p className="text-sm font-bold text-white">{selectedRide.destination?.address || "موقع مجهول"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-8">
                  <div className="p-4 bg-white/5 rounded-2xl text-center">
                    <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">المسافة</p>
                    <p className="font-black">{selectedRide.estimation?.distance || "--"} كم</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl text-center">
                    <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">الوقت المقدر</p>
                    <p className="font-black">{selectedRide.estimation?.duration || "--"}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl text-center">
                    <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">تاريخ الطلب</p>
                    <p className="font-black text-[10px]">
                      {selectedRide.timestamp?.toDate().toLocaleDateString('ar-TN')} {selectedRide.timestamp?.toDate().toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {selectedRide.status === 'completed' && (
                  <div className="p-6 bg-green-500/5 border border-green-500/10 rounded-3xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center text-green-600">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <p className="font-black text-green-500">رحلة ناجحة</p>
                        <p className="text-[10px] text-green-500/60 font-bold uppercase">تم اكتمال الدفع والتقييم</p>
                      </div>
                    </div>
                    <Navigation size={24} className="text-green-500/20" />
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FleetManagement() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);

  useEffect(() => {
    // In the Sfax Pilot, the fleet consists of approved drivers
    const q = query(collection(db, "sfax_drivers"), where("status", "==", "approved"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDrivers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching fleet drivers:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="bg-zinc-900 border border-white/5 rounded-[40px] p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-black mb-2">إدارة الأسطول (صفاقس)</h3>
            <p className="text-zinc-500 font-bold">عرض وإدارة جميع المركبات والسائقين المعتمدين في النظام.</p>
          </div>
          <div className="bg-gold/10 px-6 py-3 rounded-2xl border border-gold/20">
            <p className="text-[10px] font-black text-gold uppercase tracking-widest mb-1">إجمالي الأسطول</p>
            <p className="text-2xl font-black text-gold">{drivers.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {drivers?.map(driver => (
            <div 
              key={driver.id} 
              onClick={() => setSelectedDriver(driver)}
              className="p-6 bg-zinc-800/50 rounded-[32px] border border-white/5 space-y-4 hover:border-gold/30 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-zinc-700 rounded-2xl overflow-hidden">
                  <img src={driver.car_image_url || "https://picsum.photos/seed/car/200/200"} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-white">{driver.carModel}</h4>
                  <p className="text-xs font-bold text-zinc-500">{driver.carPlate}</p>
                </div>
                <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-gold">
                  <Car size={20} />
                </div>
              </div>
              
              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-zinc-700 rounded-full overflow-hidden">
                    <img src={driver.profile_image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs font-bold text-zinc-300">{driver.fullName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded-lg text-[10px] font-black uppercase">
                    نشط
                  </span>
                  <button className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-gold transition-colors">
                    <Eye size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {drivers.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-zinc-800 rounded-[32px] flex items-center justify-center mx-auto">
                <Car size={40} className="text-zinc-600" />
              </div>
              <p className="text-zinc-500 font-bold">لا يوجد مركبات معتمدة في الأسطول حالياً</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedDriver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedDriver(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-32 bg-gold/10 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-900" />
                <button 
                  onClick={() => setSelectedDriver(null)}
                  className="absolute top-6 right-6 w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center hover:bg-white/20 transition-all z-10"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="px-8 pb-8 -mt-12 relative">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-24 h-24 bg-zinc-800 rounded-[32px] overflow-hidden border-4 border-zinc-900 shadow-xl">
                    <img 
                      src={selectedDriver.profile_image_url || `https://picsum.photos/seed/${selectedDriver.id}/200/200`} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">{selectedDriver.fullName}</h3>
                    <p className="text-gold font-bold text-sm uppercase tracking-widest">{selectedDriver.vehicleType || "سائق تاكسي"}</p>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">الهاتف</p>
                    <p className="font-bold text-sm tracking-wide">{selectedDriver.phone}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">تاريخ الالتحاق</p>
                    <p className="font-bold text-sm">
                      {selectedDriver.createdAt?.toDate ? selectedDriver.createdAt.toDate().toLocaleDateString('ar-TN') : '2024'}
                    </p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">موديل السيارة</p>
                    <p className="font-bold text-sm">{selectedDriver.carModel}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">لوحة السيارة</p>
                    <p className="font-bold text-sm">{selectedDriver.carPlate}</p>
                  </div>
                </div>

                <div className="mt-6 p-6 bg-gold/5 border border-gold/10 rounded-[32px] space-y-3">
                  <p className="text-[10px] font-black text-gold uppercase tracking-widest flex items-center gap-2">
                    <ClipboardList size={14} /> نبذة تعريفية
                  </p>
                  <p className="text-sm font-medium leading-relaxed text-zinc-300">
                    {selectedDriver.bio || "لا توجد نبذة تعريفية متوفرة لهذا السائق حالياً."}
                  </p>
                </div>

                <div className="mt-8 flex gap-4">
                  <button className="flex-1 h-14 bg-zinc-800 text-white font-black rounded-2xl hover:bg-zinc-700 transition-all border border-white/5">
                    سجل الرحلات
                  </button>
                  <button className="flex-1 h-14 bg-gold text-black font-black rounded-2xl hover:bg-yellow-500 transition-all shadow-lg shadow-gold/20">
                    تعديل البيانات
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function RevenueView() {
  const [stats, setStats] = useState({ total: 0, completed: 0, cancelled: 0 });

  useEffect(() => {
    const q = query(collection(db, "trips"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const trips = snapshot.docs.map(d => d.data());
      const total = trips.reduce((sum, t) => sum + (t.earnings || 0), 0);
      setStats({
        total,
        completed: trips.length,
        cancelled: 0 // Mock
      });
    }, (error) => console.error("Error fetching revenue:", error));
    return () => unsubscribe();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <RevenueCard 
          icon={<DollarSign className="text-green-500" />} 
          label="إجمالي الإيرادات" 
          value={`${stats.total.toLocaleString()} د.ت`} 
          trend="+12.5%"
        />
        <RevenueCard 
          icon={<CheckCircle2 className="text-blue-500" />} 
          label="الرحلات المكتملة" 
          value={stats.completed.toString()} 
          trend="+5.2%"
        />
        <RevenueCard 
          icon={<XCircle className="text-red-500" />} 
          label="الرحلات الملغاة" 
          value={stats.cancelled.toString()} 
          trend="-2.1%"
        />
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-[40px] p-8">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-black">تحليل الأداء المالي</h3>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-zinc-800 rounded-xl text-xs font-bold text-zinc-400">آخر 7 أيام</button>
            <button className="px-4 py-2 bg-gold rounded-xl text-xs font-black text-black">آخر 30 يوم</button>
          </div>
        </div>
        
        <div className="h-64 flex items-end gap-4">
          {[40, 60, 45, 90, 65, 80, 55, 70, 85, 60, 75, 95]?.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
              <div 
                className="w-full bg-gold/20 rounded-t-lg group-hover:bg-gold transition-all cursor-pointer relative"
                style={{ height: `${h}%` }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 px-2 py-1 rounded text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity">
                  {h * 100}
                </div>
              </div>
              <span className="text-[10px] font-bold text-zinc-600">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function RevenueCard({ icon, label, value, trend }: any) {
  return (
    <div className="bg-zinc-900 border border-white/5 p-8 rounded-[40px] space-y-4">
      <div className="flex items-center justify-between">
        <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center">
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-xs font-black ${trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
          <TrendingUp size={14} className={trend.startsWith('-') ? 'rotate-180' : ''} />
          {trend}
        </div>
      </div>
      <div>
        <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-black text-white">{value}</p>
      </div>
    </div>
  );
}
