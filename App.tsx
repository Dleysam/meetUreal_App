import React, { useState, useEffect, useRef } from 'react';
import { AppScreen, CurrentUser, MainTab, User, ChatMessage } from './types';
import { verifyUserPhoto } from './services/geminiService';
import { Button, Input, Logo, Select, TextArea } from './components/UI';
import { auth, db } from './services/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { 
  MapPin, Star, MessageCircle, User as UserIcon, 
  Home, Heart, X, Check, Lock, ChevronLeft,
  Settings, Zap, Send, CreditCard, Calendar, Crown, CheckCircle2,
  Phone, Mic, MicOff, Image as ImageIcon, Play, Users,
  Volume2, CheckCheck, ToggleLeft, ToggleRight,
  Ruler, Globe, Dumbbell, Trash2, Bell,
  AlertTriangle, ChevronDown, HelpCircle, LogOut,
  Upload, Filter, Eye, EyeOff, Info, Download, Share, PlusSquare, Mail
} from 'lucide-react';

// --- MOCK DATA ---
const MOCK_USERS: User[] = [
  { 
    id: '1', 
    name: 'Sarah Jenkins', 
    age: 24, 
    location: 'New York, USA', 
    distance: 2, 
    imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80', 
    photos: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80', 'https://images.unsplash.com/photo-1526657782461-9fe13402a841?w=800&q=80'],
    bio: "Love hiking, coffee, and coding. Looking for someone to explore the city with.", 
    occupation: 'UX Designer', 
    gender: 'Female', 
    ethnicity: 'White', 
    isOnline: true,
    height: '165',
    bodyType: 'Athletic',
    relationshipStatus: 'Single',
    lookingFor: ['Relationship', 'Friendship']
  },
  { 
    id: '2', 
    name: 'Jessica Alva', 
    age: 22, 
    location: 'Brooklyn, USA', 
    distance: 12, 
    imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80', 
    bio: "Art enthusiast and dog lover. Let's go to a museum!", 
    occupation: 'Student', 
    gender: 'Female', 
    ethnicity: 'Hispanic',
    height: '160',
    bodyType: 'Average',
    relationshipStatus: 'Single',
    lookingFor: ['Casual', 'Chat']
  },
  { 
    id: '3', 
    name: 'David Chen', 
    age: 28, 
    location: 'Jersey City, USA', 
    distance: 5, 
    imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80', 
    bio: "Tech founder. Always busy but making time for real connections.", 
    occupation: 'Entrepreneur', 
    gender: 'Male', 
    ethnicity: 'Asian', 
    isOnline: true,
    height: '178',
    bodyType: 'Slim',
    relationshipStatus: 'Single',
    lookingFor: ['Relationship']
  },
  { 
    id: '4', 
    name: 'Marcus Johnson', 
    age: 26, 
    location: 'Manhattan, USA', 
    distance: 1, 
    imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=80', 
    bio: "Fitness junkie and foodie. Best combo.", 
    occupation: 'Personal Trainer', 
    gender: 'Male', 
    ethnicity: 'African American', 
    isOnline: true,
    height: '185',
    bodyType: 'Athletic',
    relationshipStatus: 'Single',
    lookingFor: ['Relationship', 'Gym Buddy']
  },
  { 
    id: '5', 
    name: 'Emily Rose', 
    age: 23, 
    location: 'Queens, USA', 
    distance: 8, 
    imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80', 
    bio: "Photographer looking for a muse.", 
    occupation: 'Photographer', 
    gender: 'Female', 
    ethnicity: 'White',
    height: '170',
    bodyType: 'Curvy',
    relationshipStatus: 'Single',
    lookingFor: ['Casual', 'Friendship']
  },
];

const INITIAL_MESSAGES: ChatMessage[] = [
  { id: '1', senderId: '1', text: "Hey! I saw you like hiking too?", timestamp: Date.now() - 3600000, reactions: [], status: 'read' },
  { id: '2', senderId: 'me', text: "Yes! I go up to the Catskills often. What about you?", timestamp: Date.now() - 3500000, reactions: ['❤️'], status: 'read' },
];

const MAX_FREE_SWIPES = 100;
const MAX_FREE_MATCHES = 5;

// Helper for Haptics
const vibrate = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

// --- MAIN APP COMPONENT ---
export default function App() {
  // Navigation State
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.SPLASH);
  const [activeTab, setActiveTab] = useState<MainTab>(MainTab.HOME);
  const [isNewUser, setIsNewUser] = useState(false); 
  
  // Security State
  const [registeredEmails, setRegisteredEmails] = useState<Set<string>>(new Set());
  const [bannedEmails, setBannedEmails] = useState<Set<string>>(new Set());

  // PWA Install State
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosInstall, setShowIosInstall] = useState(false);

  // User State
  const [currentUser, setCurrentUser] = useState<CurrentUser>({
    id: 'me',
    name: '',
    email: '',
    age: 0,
    location: '',
    bio: '',
    imageUrl: '',
    photos: [],
    distance: 0,
    isVip: false,
    isVerified: false,
    locationGranted: false,
    swipesToday: 0,
    matchesToday: 0,
    lastSwipeDate: Date.now(),
    readReceiptsEnabled: true,
  });

  // Data State
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [likedUserIds, setLikedUserIds] = useState<string[]>([]);
  const [matches, setMatches] = useState<User[]>([]); 
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [showVipModal, setShowVipModal] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<User | null>(null);

  // --- LIFECYCLE ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentScreen(AppScreen.AUTH);
    }, 2000);

    // Capture install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    // Detect iOS and Standalone
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setIsIOS(ios);
    setIsStandalone(standalone);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // --- HANDLERS ---

    const handleLogin = async (email: string, password?: string) => {
    vibrate(10);
    if (bannedEmails.has(email)) {
      alert("This account has been banned due to failed verification.");
      return;
    }

    try {
      // Authenticate the user securely via Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password || "meetUreal123!");
      const firebaseUser = userCredential.user;

      setIsNewUser(false);
      setCurrentUser(prev => ({ 
        ...prev, 
        email: firebaseUser.email || email,
        id: firebaseUser.uid, // Tie your local state to the unique Firebase UID
        name: 'Alex Doe', 
        age: 25,
        isVerified: true, 
        occupation: 'Software Engineer',
        gender: 'Male',
        ethnicity: 'Mixed',
        height: '180',
        bodyType: 'Athletic',
        relationshipStatus: 'Single',
        lookingFor: ['Relationship'],
        about: "I love coding, coffee, and long walks on the beach. Looking for someone genuine.",
        imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80',
        photos: [
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80', 
          'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=80'
        ]
      }));
      setCurrentScreen(AppScreen.LOCATION);

    } catch (error: any) {
      alert("Invalid email or password. Please try again.");
    }
  };

  const handleRegister = async (email: string, password?: string) => {
    vibrate(10);
    if (bannedEmails.has(email)) {
      alert("This email is blocked due to fake account activity.");
      return;
    }

    try {
      // Create a brand new record securely inside your Firebase Authentication tab
      const userCredential = await createUserWithEmailAndPassword(auth, email, password || "meetUreal123!");
      const firebaseUser = userCredential.user;

      setIsNewUser(true);
      setCurrentUser(prev => ({ 
        ...prev, 
        email: firebaseUser.email || email, 
        id: firebaseUser.uid 
      }));
      setCurrentScreen(AppScreen.PROFILE_SETUP);

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        alert("This email is already registered. Please sign in.");
      } else {
        alert(`Registration failed: ${error.message}`);
      }
    }
  };
    // Simulating login fetch
    setCurrentUser(prev => ({ 
      ...prev, 
      email, 
      name: 'Alex Doe', 
      age: 25,
      isVerified: true, 
      occupation: 'Software Engineer',
      gender: 'Male',
      ethnicity: 'Mixed',
      height: '180',
      bodyType: 'Athletic',
      relationshipStatus: 'Single',
      lookingFor: ['Relationship'],
      about: "I love coding, coffee, and long walks on the beach. Looking for someone genuine.",
      imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80',
      photos: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=80']
    }));
    setCurrentScreen(AppScreen.LOCATION);
  };

  const handleRegister = (email: string) => {
    vibrate(10);
    if (bannedEmails.has(email)) {
      alert("This email is blocked due to fake account activity.");
      return;
    }
    if (registeredEmails.has(email)) {
      alert("This email is already registered. Please sign in.");
      return;
    }

    setIsNewUser(true);
    setCurrentUser(prev => ({ ...prev, email }));
    setCurrentScreen(AppScreen.PROFILE_SETUP);
  };

  const handleProfileComplete = (profileData: Partial<User>) => {
    vibrate(10);
    setCurrentUser(prev => ({ ...prev, ...profileData }));
    setCurrentScreen(AppScreen.EMAIL_VERIFY);
  };

  const handleEmailVerified = () => {
    vibrate([10, 50, 10]);
    setCurrentScreen(AppScreen.ADD_PHOTO);
  };

  const handlePhotosAdded = (photos: string[]) => {
    vibrate(10);
    setCurrentUser(prev => ({ ...prev, photos, imageUrl: photos[0] }));
    setCurrentScreen(AppScreen.LOCATION);
  };

  const handleLocationGrant = () => {
    vibrate(10);
    setCurrentUser(prev => ({ 
      ...prev, 
      locationGranted: true,
      city: 'New York',
      nationality: 'United States',
      zipCode: '10001',
      location: 'New York, USA'
    }));

    if (isNewUser) {
      setCurrentScreen(AppScreen.VERIFY);
    } else {
      setCurrentScreen(AppScreen.MAIN);
    }
  };

  const handleVerificationSuccess = (photoUrl: string) => {
    vibrate([50, 50, 50]);
    setRegisteredEmails(prev => new Set(prev).add(currentUser.email));
    setCurrentUser(prev => ({ ...prev, isVerified: true, photoUrl }));
    setCurrentScreen(AppScreen.MAIN);
  };

  const handleVerificationFailed = (reason: string) => {
    vibrate(200);
    setBannedEmails(prev => new Set(prev).add(currentUser.email));
    alert(`Account Blocked: ${reason}. Your email has been flagged.`);
    setCurrentScreen(AppScreen.AUTH);
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    vibrate(10); // Subtle haptic feedback
    if (!currentUser.isVip) {
      if (currentUser.swipesToday >= MAX_FREE_SWIPES) {
        setShowVipModal(true);
        return;
      }
      if (direction === 'right' && currentUser.matchesToday >= MAX_FREE_MATCHES) {
        setShowVipModal(true);
        return;
      }
    }

    const swipedUser = users[0];
    
    setCurrentUser(prev => ({
      ...prev,
      swipesToday: prev.swipesToday + 1,
      matchesToday: direction === 'right' ? prev.matchesToday + (Math.random() > 0.5 ? 1 : 0) : prev.matchesToday 
    }));

    if (direction === 'right') {
      setLikedUserIds(prev => [...prev, swipedUser.id]);
      if (Math.random() > 0.7) {
        vibrate([50, 50]); // Match vibration
        setMatches(prev => [...prev, swipedUser]);
      }
    }
    
    setUsers(prev => prev.slice(1));
  };

  const handleUpgradeToVip = () => {
    vibrate([50, 100, 50]);
    setCurrentUser(prev => ({ ...prev, isVip: true }));
    setShowVipModal(false);
  };

  const handleSendMessage = (text?: string, mediaType?: 'image' | 'audio', mediaUrl?: string) => {
    vibrate(20);
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: 'me',
      text,
      mediaType,
      mediaUrl,
      timestamp: Date.now(),
      reactions: [],
      status: 'sent'
    };
    setChatMessages(prev => [...prev, newMessage]);

    setTimeout(() => {
      setChatMessages(prev => prev.map(m => m.id === newMessage.id ? { ...m, status: 'delivered' } : m));
      setTimeout(() => {
        setChatMessages(prev => prev.map(m => m.id === newMessage.id ? { ...m, status: 'read' } : m));
      }, 5000);
    }, 1000);
  };

  const handleDeleteMessage = (messageId: string) => {
    vibrate(10);
    setChatMessages(prev => prev.filter(m => m.id !== messageId));
  };

  const handleReaction = (messageId: string, reaction: string) => {
    vibrate(10);
    setChatMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        const hasReaction = m.reactions.includes(reaction);
        const newReactions = hasReaction
          ? m.reactions.filter(r => r !== reaction)
          : [...m.reactions, reaction];
        return { ...m, reactions: newReactions };
      }
      return m;
    }));
  };

  const toggleReadReceipts = () => {
    vibrate(10);
    setCurrentUser(prev => ({ ...prev, readReceiptsEnabled: !prev.readReceiptsEnabled }));
  };

  const handleSignOut = () => {
    vibrate(10);
    setCurrentScreen(AppScreen.AUTH);
    setActiveTab(MainTab.HOME);
    setViewingProfile(null);
  };

  const handleAddPhoto = (url: string) => {
    vibrate(10);
    setCurrentUser(prev => ({
      ...prev,
      photos: [...(prev.photos || []), url],
      imageUrl: prev.photos && prev.photos.length === 0 ? url : prev.imageUrl // Set as main if first
    }));
  };

  const handleDeletePhoto = (photoUrl: string) => {
    vibrate(20);
    setCurrentUser(prev => {
      const newPhotos = prev.photos?.filter(p => p !== photoUrl) || [];
      // If main photo is deleted, set the first available one as main, or empty string if none left
      const newImageUrl = prev.imageUrl === photoUrl ? (newPhotos[0] || '') : prev.imageUrl;
      return { ...prev, photos: newPhotos, imageUrl: newImageUrl };
    });
  };

  const handleSetMainPhoto = (photoUrl: string) => {
    vibrate(10);
    setCurrentUser(prev => ({ ...prev, imageUrl: photoUrl }));
  };

  // --- RENDERERS ---

  if (currentScreen === AppScreen.SPLASH) return <SplashScreen />;
  if (currentScreen === AppScreen.AUTH) return <AuthScreen onLogin={handleLogin} onRegister={handleRegister} />;
  if (currentScreen === AppScreen.PROFILE_SETUP) return <ProfileSetupScreen initialData={currentUser} onComplete={handleProfileComplete} />;
  if (currentScreen === AppScreen.EMAIL_VERIFY) return <EmailVerificationScreen email={currentUser.email} onVerified={handleEmailVerified} />;
  if (currentScreen === AppScreen.ADD_PHOTO) return <AddPhotoScreen onComplete={handlePhotosAdded} />;
  if (currentScreen === AppScreen.LOCATION) return <LocationScreen onGrant={handleLocationGrant} />;
  if (currentScreen === AppScreen.VERIFY) return <VerificationScreen referencePhoto={currentUser.imageUrl} onSuccess={handleVerificationSuccess} onFail={handleVerificationFailed} />;

  return (
    <div className="flex flex-col h-screen bg-slate-900 max-w-md mx-auto relative overflow-hidden shadow-2xl">
      {/* Top Bar */}
      <div className="bg-slate-900/90 backdrop-blur-md p-4 flex justify-between items-center z-10 sticky top-0 border-b border-white/5">
        <div className="flex items-center gap-2">
          {currentUser.photoUrl && (
            <img src={currentUser.photoUrl} alt="Me" className="w-8 h-8 rounded-full border border-pink-500 object-cover" />
          )}
          <Logo size="sm" />
        </div>
        <div className="flex gap-3">
          {currentUser.isVip ? (
            <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full">
              <Crown size={14} className="text-white" fill="currentColor" />
              <span className="text-xs font-bold text-white">VIP</span>
            </div>
          ) : (
            <button onClick={() => setShowVipModal(true)} className="flex items-center gap-1 px-3 py-1 bg-slate-800 rounded-full border border-amber-500/50 text-amber-500 active:scale-95 transition-transform">
              <Zap size={14} />
              <span className="text-xs font-bold">Upgrade</span>
            </button>
          )}
          <button onClick={() => setActiveTab(MainTab.PROFILE)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white relative active:scale-95 transition-transform">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto relative">
        {activeTab === MainTab.HOME && (
          <HomeTab 
            users={users} 
            onSwipe={handleSwipe} 
            isVip={currentUser.isVip} 
            swipesToday={currentUser.swipesToday}
          />
        )}
        {activeTab === MainTab.CONNECT && (
          <ConnectTab 
            users={MOCK_USERS} 
            currentUser={currentUser}
            onDirectMessage={(uid: string) => {
              vibrate(10);
              if (currentUser.isVip) {
                setActiveTab(MainTab.CHAT);
                setActiveChatUserId(uid);
              } else {
                setShowVipModal(true);
              }
            }} 
          />
        )}
        {activeTab === MainTab.CHAT && (
          activeChatUserId ? (
            <ChatInterface 
              userId={activeChatUserId} 
              messages={chatMessages} 
              onBack={() => { vibrate(10); setActiveChatUserId(null); }}
              onSend={handleSendMessage}
              onDeleteMessage={handleDeleteMessage}
              onReaction={handleReaction}
              user={MOCK_USERS.find(u => u.id === activeChatUserId)}
              readReceiptsEnabled={currentUser.readReceiptsEnabled}
              onViewProfile={(u) => setViewingProfile(u)}
            />
          ) : (
            <ChatList 
              matches={matches} 
              conversations={MOCK_USERS.slice(0, 2)} 
              onSelect={(uid: string) => { vibrate(10); setActiveChatUserId(uid); }} 
            />
          )
        )}
        {activeTab === MainTab.PROFILE && (
          <ProfileTab 
            user={currentUser} 
            onToggleReadReceipts={toggleReadReceipts}
            onSignOut={handleSignOut}
            onAddPhoto={handleAddPhoto}
            onDeletePhoto={handleDeletePhoto}
            onSetMainPhoto={handleSetMainPhoto}
            installPrompt={installPrompt}
            onInstallApp={handleInstallApp}
            isIOS={isIOS}
            isStandalone={isStandalone}
            onShowIosInstall={() => setShowIosInstall(true)}
          />
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="bg-slate-900 border-t border-white/5 p-4 pb-8 flex justify-around items-center z-20">
        <NavButton active={activeTab === MainTab.HOME} onClick={() => { vibrate(10); setActiveTab(MainTab.HOME); }} icon={<Home />} label="Home" />
        <NavButton active={activeTab === MainTab.CONNECT} onClick={() => { vibrate(10); setActiveTab(MainTab.CONNECT); }} icon={<Users />} label="Connect" />
        <NavButton active={activeTab === MainTab.CHAT} onClick={() => { vibrate(10); setActiveTab(MainTab.CHAT); }} icon={<MessageCircle />} label="Chat" />
        <NavButton active={activeTab === MainTab.PROFILE} onClick={() => { vibrate(10); setActiveTab(MainTab.PROFILE); }} icon={<UserIcon />} label="Profile" />
      </div>

      {/* VIP Modal Overlay */}
      {showVipModal && (
        <VipPaymentModal onClose={() => setShowVipModal(false)} onUpgrade={handleUpgradeToVip} />
      )}

      {/* iOS Install Modal */}
      {showIosInstall && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setShowIosInstall(false)}>
          <div className="bg-slate-900 w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 border-t sm:border border-white/10 pb-10 sm:pb-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl">Install App</h3>
              <button onClick={() => setShowIosInstall(false)}><X className="text-slate-400"/></button>
            </div>
            <div className="space-y-6">
               <div className="flex items-start gap-4">
                 <div className="bg-slate-800 p-3 rounded-xl"><Share className="text-blue-500" /></div>
                 <div>
                   <div className="font-bold mb-1">1. Tap Share</div>
                   <div className="text-sm text-slate-400">Tap the Share button in the toolbar at the bottom of the screen.</div>
                 </div>
               </div>
               <div className="flex items-start gap-4">
                 <div className="bg-slate-800 p-3 rounded-xl"><PlusSquare className="text-white" /></div>
                 <div>
                   <div className="font-bold mb-1">2. Add to Home Screen</div>
                   <div className="text-sm text-slate-400">Scroll down and tap 'Add to Home Screen' to install.</div>
                 </div>
               </div>
            </div>
            <button onClick={() => setShowIosInstall(false)} className="mt-8 w-full py-3 bg-gradient-to-r from-pink-500 to-violet-600 rounded-xl font-bold">Got it</button>
          </div>
        </div>
      )}

      {/* Profile Viewer Modal (For Chat) */}
      {viewingProfile && (
        <div className="fixed inset-0 z-50 bg-slate-900 overflow-y-auto animate-slide-up">
           <div className="absolute top-4 right-4 z-20">
             <button onClick={() => setViewingProfile(null)} className="p-2 bg-black/50 rounded-full text-white active:scale-95 transition-transform">
               <X size={24} />
             </button>
           </div>
           <HomeTab 
             users={[viewingProfile]} 
             onSwipe={() => setViewingProfile(null)} 
             isVip={currentUser.isVip} 
             swipesToday={0}
             isPreview={true}
           />
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENTS ---

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-center gap-1 transition-all active:scale-95 ${active ? 'text-pink-500' : 'text-slate-500 hover:text-slate-300'}`}
    >
      <div className={`transition-transform duration-200 ${active ? 'scale-110' : ''}`}>
        {icon}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function SplashScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-900 animate-fade-in">
      <Logo size="lg" />
      <div className="mt-8 flex gap-2">
        <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
        <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  );
}

function AuthScreen({ onLogin, onRegister }: { onLogin: (email: string) => void, onRegister: (email: string) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('hello@example.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };
  
  const strength = getPasswordStrength(password);
  
  const handleAction = () => {
    if (mode === 'login') {
      onLogin(email);
    } else {
      if (strength < 5) {
        alert("Please create a stronger password (min 8 chars, uppercase, lowercase, number, special char).");
        return;
      }
      onRegister(email);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 p-6 justify-center max-w-md mx-auto">
      <div className="flex flex-col items-center mb-10">
        <Logo size="md" />
        <h2 className="text-2xl font-bold mt-6">{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
        <p className="text-slate-400 text-center mt-2">{mode === 'login' ? 'Sign in to continue your journey.' : 'Join for real connections.'}</p>
      </div>
      
      <div className="flex flex-col gap-4 w-full">
        <Input 
          label="Email" 
          type="email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          placeholder="Enter your email" 
        />
        <div className="relative">
           <Input 
            label="Password" 
            type={showPassword ? "text" : "password"} 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            placeholder="••••••••" 
          />
          <button 
            type="button"
            className="absolute right-4 top-[38px] text-slate-400"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {mode === 'register' && (
          <div className="bg-slate-800/50 p-3 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-400 uppercase font-bold">
              <span>Password Strength</span>
              <span className={strength === 5 ? 'text-green-500' : strength > 2 ? 'text-yellow-500' : 'text-red-500'}>
                {strength === 5 ? 'Strong' : strength > 2 ? 'Medium' : 'Weak'}
              </span>
            </div>
            <div className="flex gap-1 h-1">
               {[1,2,3,4,5].map(i => (
                 <div key={i} className={`flex-1 rounded-full ${strength >= i ? (strength === 5 ? 'bg-green-500' : strength > 2 ? 'bg-yellow-500' : 'bg-red-500') : 'bg-slate-700'}`} />
               ))}
            </div>
            <ul className="text-[10px] text-slate-500 grid grid-cols-2 gap-1">
              <li className={password.length >= 8 ? 'text-green-500' : ''}>• Min 8 characters</li>
              <li className={/[A-Z]/.test(password) ? 'text-green-500' : ''}>• Uppercase letter</li>
              <li className={/[a-z]/.test(password) ? 'text-green-500' : ''}>• Lowercase letter</li>
              <li className={/[0-9]/.test(password) ? 'text-green-500' : ''}>• Number</li>
              <li className={/[^A-Za-z0-9]/.test(password) ? 'text-green-500' : ''}>• Special character</li>
            </ul>
          </div>
        )}

        <div className="h-4" />
        <Button onClick={handleAction} fullWidth disabled={mode === 'register' && strength < 5}>
          {mode === 'login' ? 'Sign In' : 'Sign Up'}
        </Button>
        <div className="text-center mt-4">
          <span className="text-slate-400 text-sm">
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button 
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-pink-500 font-semibold text-sm hover:underline"
          >
            {mode === 'login' ? 'Register' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmailVerificationScreen({ email, onVerified }: { email: string, onVerified: () => void }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onVerified();
    }, 1500);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 p-6 justify-center max-w-md mx-auto text-center">
      <div className="mb-8 flex justify-center">
        <div className="w-20 h-20 bg-pink-500/20 rounded-full flex items-center justify-center">
          <Mail size={40} className="text-pink-500" />
        </div>
      </div>
      <h2 className="text-2xl font-bold mb-2">Verify Email</h2>
      <p className="text-slate-400 mb-8">
        We sent a code to <span className="text-white font-medium">{email}</span>. Enter it below.
      </p>
      
      <Input 
        value={code} 
        onChange={e => setCode(e.target.value)} 
        placeholder="123456" 
        className="text-center text-2xl tracking-widest"
        maxLength={6}
      />
      
      <div className="h-8"></div>
      <Button onClick={handleVerify} disabled={code.length < 4 || loading} fullWidth>
        {loading ? 'Verifying...' : 'Verify Email'}
      </Button>
      <button className="mt-6 text-slate-500 text-sm hover:text-white">Resend Code</button>
    </div>
  );
}

function AddPhotoScreen({ onComplete }: { onComplete: (photos: string[]) => void }) {
  const [photo, setPhoto] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-screen bg-slate-900 p-6 justify-center max-w-md mx-auto">
       <div className="flex justify-between items-center mb-8">
         <button className="p-2 text-slate-400"><ChevronLeft /></button>
         <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-700"></div>
            <div className="w-2 h-2 rounded-full bg-pink-500"></div>
            <div className="w-2 h-2 rounded-full bg-slate-700"></div>
         </div>
         <div className="w-10"></div>
       </div>

       <div className="text-center mb-8">
         <h2 className="text-2xl font-bold mb-2">Add Your Best Photo</h2>
         <p className="text-slate-400">This will be your main profile picture and used for verification.</p>
       </div>

       <div className="relative aspect-[3/4] bg-slate-800 rounded-3xl border-2 border-dashed border-slate-600 flex flex-col items-center justify-center mb-8 overflow-hidden">
        {photo ? (
          <img src={photo} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center text-slate-500">
            <Upload size={40} className="mb-2" />
            <span>Tap to upload</span>
          </div>
        )}
        <input 
          type="file" 
          accept="image/*"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = () => setPhoto(reader.result as string);
              reader.readAsDataURL(file);
            }
          }}
        />
       </div>

       <Button onClick={() => photo && onComplete([photo])} disabled={!photo} fullWidth>
         Continue
       </Button>
    </div>
  );
}

function LocationScreen({ onGrant }: { onGrant: () => void }) {
  return (
    <div className="flex flex-col h-screen bg-slate-900 p-8 justify-center items-center text-center max-w-md mx-auto">
      <div className="w-24 h-24 bg-pink-500/20 rounded-full flex items-center justify-center mb-8">
        <MapPin size={48} className="text-pink-500" />
      </div>
      <h2 className="text-2xl font-bold mb-4">Location Required</h2>
      <p className="text-slate-400 mb-8">
        meetUreal uses your location to find real connections nearby. To continue using the app, please enable location access.
      </p>
      <Button onClick={onGrant} fullWidth>Allow Location Access</Button>
      <button className="mt-6 text-slate-500 text-sm">No, thanks</button>
    </div>
  );
}

function ProfileSetupScreen({ initialData, onComplete }: { initialData: CurrentUser, onComplete: (data: Partial<User>) => void }) {
  const [formData, setFormData] = useState<Partial<User>>({ ...initialData });
  const [dob, setDob] = useState('');
  
  const handleContinue = () => {
    if (!dob || !formData.name || !formData.gender) {
        alert("Please enter your Name, Date of Birth, and Gender to continue.");
        return;
    }
    
    // Calculate Age
    const birthDate = new Date(dob);
    const ageDifMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDifMs);
    const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
    
    onComplete({ ...formData, age: calculatedAge });
  };

  return (
     <div className="flex flex-col h-screen bg-slate-900 max-w-md mx-auto overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center gap-4">
           <button className="text-slate-400"><ChevronLeft /></button>
           <h2 className="text-xl font-bold">Profile Details</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
           <Input label="Full Name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
           
           <div className="flex flex-col gap-1.5">
             <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date of Birth</label>
             <input type="date" value={dob} onChange={e => setDob(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-pink-500" />
           </div>

           <Select label="Gender" value={formData.gender || ''} onChange={e => setFormData({...formData, gender: e.target.value})} options={[{label:'Male',value:'Male'},{label:'Female',value:'Female'},{label:'Non-binary',value:'Non-binary'}]} />
           
           <Select label="Relationship Status" value={formData.relationshipStatus || ''} onChange={e => setFormData({...formData, relationshipStatus: e.target.value})} options={[{label:'Single',value:'Single'},{label:'Divorced',value:'Divorced'},{label:'Widowed',value:'Widowed'}]} />

           <Input label="Occupation" value={formData.occupation || ''} onChange={e => setFormData({...formData, occupation: e.target.value})} />

           <div className="grid grid-cols-2 gap-4">
              <Input label="Height (cm)" type="number" value={formData.height || ''} onChange={e => setFormData({...formData, height: e.target.value})} />
              <Select label="Body Type" value={formData.bodyType || ''} onChange={e => setFormData({...formData, bodyType: e.target.value})} options={[{label:'Slim',value:'Slim'},{label:'Athletic',value:'Athletic'},{label:'Average',value:'Average'},{label:'Curvy',value:'Curvy'}]} />
           </div>

           <Select label="Ethnicity" value={formData.ethnicity || ''} onChange={e => setFormData({...formData, ethnicity: e.target.value})} options={[{label:'African',value:'African'},{label:'Asian',value:'Asian'},{label:'Caucasian',value:'Caucasian'},{label:'Hispanic',value:'Hispanic'},{label:'Mixed',value:'Mixed'}]} />

           <Select label="Looking For" value={formData.lookingFor?.[0] || ''} onChange={e => setFormData({...formData, lookingFor: [e.target.value]})} options={[{label:'Relationship',value:'Relationship'},{label:'Casual',value:'Casual'},{label:'Friendship',value:'Friendship'},{label:'Chat',value:'Chat'}]} />

           <TextArea label="About You" value={formData.about || ''} onChange={e => setFormData({...formData, about: e.target.value})} placeholder="Tell us about yourself..." />

           <div className="h-4"></div>
           <Button onClick={handleContinue} fullWidth>Continue</Button>
           <div className="h-8"></div>
        </div>
     </div>
  );
}

function VerificationScreen({ referencePhoto, onSuccess, onFail }: { referencePhoto?: string, onSuccess: (url: string) => void, onFail: (reason: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(s => {
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(err => console.error("Camera access denied:", err));
    
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    }
  }, []);

  const captureAndVerify = async () => {
    if (!videoRef.current) return;
    vibrate(10);
    
    setIsCapturing(true);
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const selfieBase64 = canvas.toDataURL('image/jpeg');

    const result = await verifyUserPhoto(selfieBase64, referencePhoto);
    
    if (result.isReal) {
      onSuccess(selfieBase64);
    } else {
      onFail(result.reason);
    }
    setIsCapturing(false);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 p-6 justify-center max-w-md mx-auto">
       <div className="text-center mb-6">
         <h2 className="text-2xl font-bold mb-2">Verify it's You</h2>
         <p className="text-slate-400">Match your selfie with your profile photo to get the blue badge.</p>
       </div>
       
       <div className="aspect-[3/4] bg-black rounded-3xl mb-6 overflow-hidden relative border-2 border-pink-500 shadow-xl shadow-pink-500/20">
         <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
         {isCapturing && (
           <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
           </div>
         )}
         <div className="absolute bottom-4 left-0 right-0 text-center">
            <span className="px-3 py-1 bg-black/50 rounded-full text-xs text-white backdrop-blur">Position face in center</span>
         </div>
       </div>

       <Button onClick={captureAndVerify} disabled={isCapturing} fullWidth className="mb-4">
         {isCapturing ? 'Verifying...' : 'Take Selfie & Verify'}
       </Button>
       <p className="text-xs text-slate-500 text-center">
         Photos are analyzed by AI for liveness and face matching.
       </p>
    </div>
  );
}

function HomeTab({ users, onSwipe, isVip, swipesToday, isPreview = false }: { users: User[], onSwipe: (dir: 'left' | 'right') => void, isVip: boolean, swipesToday: number, isPreview?: boolean }) {
  const currentUser = users[0];

  if (!currentUser) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-fade-in">
        <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-xl border border-white/5">
          <Users size={40} className="text-slate-600" />
        </div>
        <h3 className="text-2xl font-bold mb-3">No more profiles</h3>
        <p className="text-slate-400 max-w-[250px] mx-auto leading-relaxed">Check back later for more potential matches nearby, or adjust your filters.</p>
        <button className="mt-8 px-8 py-3 bg-slate-800 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition-colors active:scale-95" onClick={() => window.location.reload()}>
           Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="h-full p-4 flex flex-col">
      {!isVip && !isPreview && (
        <div className="mb-4 flex items-center justify-between bg-slate-800/50 px-4 py-2 rounded-lg border border-white/5">
          <span className="text-xs font-semibold text-slate-400">Daily Free Swipes</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-pink-500" 
                style={{ width: `${(swipesToday / MAX_FREE_SWIPES) * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold">{MAX_FREE_SWIPES - swipesToday} left</span>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div className="relative flex-1 rounded-3xl overflow-hidden shadow-2xl bg-slate-800">
        <img 
          src={currentUser.imageUrl} 
          alt={currentUser.name} 
          className={`w-full h-full object-cover ${isPreview ? 'blur-sm scale-105' : ''} transition-all duration-500`} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-90"></div>
        
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-end gap-2 mb-2">
            <h2 className="text-3xl font-bold text-white">{currentUser.name}</h2>
            <span className="text-2xl text-slate-300 font-medium mb-1">{currentUser.age}</span>
            {currentUser.isOnline && <div className="w-3 h-3 bg-green-500 rounded-full mb-3 ml-1 border border-black"></div>}
          </div>
          
          <div className="flex items-center text-slate-300 mb-4 text-sm">
            <MapPin size={16} className="mr-1" />
            {currentUser.distance} km away • {currentUser.occupation}
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {currentUser.height && (
              <span className="px-2 py-1 bg-white/10 backdrop-blur-sm rounded-lg text-xs text-white border border-white/10 flex items-center gap-1">
                <Ruler size={10} /> {currentUser.height}cm
              </span>
            )}
            {currentUser.ethnicity && (
              <span className="px-2 py-1 bg-white/10 backdrop-blur-sm rounded-lg text-xs text-white border border-white/10 flex items-center gap-1">
                <Globe size={10} /> {currentUser.ethnicity}
              </span>
            )}
             {currentUser.bodyType && (
              <span className="px-2 py-1 bg-white/10 backdrop-blur-sm rounded-lg text-xs text-white border border-white/10 flex items-center gap-1">
                <Dumbbell size={10} /> {currentUser.bodyType}
              </span>
            )}
             {currentUser.relationshipStatus && (
              <span className="px-2 py-1 bg-white/10 backdrop-blur-sm rounded-lg text-xs text-white border border-white/10 flex items-center gap-1">
                <Heart size={10} /> {currentUser.relationshipStatus}
              </span>
            )}
          </div>

          <p className="text-slate-200 mb-6 line-clamp-2 text-sm">{currentUser.bio}</p>

          {!isPreview && (
            <div className="flex justify-center gap-6 items-center">
              <button 
                onClick={() => onSwipe('left')}
                className="w-14 h-14 rounded-full bg-slate-800/80 backdrop-blur text-red-500 border border-red-500/30 flex items-center justify-center active:scale-90 transition-transform shadow-lg shadow-black/20"
              >
                <X size={28} strokeWidth={3} />
              </button>
              <button className="w-10 h-10 rounded-full bg-slate-800/80 backdrop-blur text-blue-400 border border-blue-400/30 flex items-center justify-center active:scale-90 transition-transform">
                <Star size={20} fill="currentColor" />
              </button>
              <button 
                onClick={() => onSwipe('right')}
                className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-500 to-violet-600 text-white flex items-center justify-center active:scale-90 transition-transform shadow-lg shadow-pink-500/30"
              >
                <Heart size={28} fill="currentColor" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConnectTab({ users, currentUser, onDirectMessage }: { users: User[], currentUser: CurrentUser, onDirectMessage: (uid: string) => void }) {
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({ gender: 'All', minAge: 18, maxAge: 50 });

  const filteredUsers = users.filter(u => 
    (filters.gender === 'All' || u.gender === filters.gender) && 
    (u.age >= filters.minAge && u.age <= filters.maxAge)
  );

  return (
    <div className="p-4 h-full flex flex-col">
       <div className="flex justify-between items-center mb-4">
         <h2 className="text-xl font-bold">Discover</h2>
         <button onClick={() => setShowFilter(!showFilter)} className="p-2 bg-slate-800 rounded-full active:scale-95 transition-transform">
           <Filter size={20} />
         </button>
       </div>

       {showFilter && (
         <div className="bg-slate-800 p-4 rounded-2xl mb-4 animate-fade-in border border-white/5">
           <div className="flex justify-between mb-2">
             <h3 className="font-bold text-sm">Filters</h3>
             <button onClick={() => setShowFilter(false)}><X size={16}/></button>
           </div>
           <div className="space-y-3">
              <Select label="Gender" value={filters.gender} onChange={e => setFilters({...filters, gender: e.target.value})} options={[{label:'All',value:'All'},{label:'Male',value:'Male'},{label:'Female',value:'Female'}]} />
           </div>
         </div>
       )}

       <div className="grid grid-cols-2 gap-4 overflow-y-auto pb-20">
         {filteredUsers.map(user => (
           <div key={user.id} className="bg-slate-800 rounded-2xl overflow-hidden shadow-lg relative group active:scale-[0.98] transition-transform duration-200">
             <img src={user.imageUrl} className="w-full aspect-[3/4] object-cover" alt={user.name} />
             <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent p-3 flex flex-col justify-end">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-white">{user.name}, {user.age}</span>
                  {user.isOnline && <div className="w-2 h-2 bg-green-500 rounded-full"/>}
                </div>
                <div className="text-xs text-slate-300 flex items-center mb-2">
                  <MapPin size={10} className="mr-1"/> {user.distance} km
                </div>
                <button 
                  onClick={() => onDirectMessage(user.id)}
                  className="w-full py-2 bg-pink-500/20 hover:bg-pink-500 text-pink-500 hover:text-white rounded-xl text-xs font-bold transition-colors border border-pink-500/50"
                >
                  Direct Message
                </button>
             </div>
           </div>
         ))}
       </div>
    </div>
  )
}

function ChatInterface({ 
  userId, messages, onBack, onSend, user, readReceiptsEnabled, onDeleteMessage, onReaction, onViewProfile
}: { 
  userId: string, 
  messages: ChatMessage[], 
  onBack: () => void, 
  onSend: (text?: string, mediaType?: 'image' | 'audio', mediaUrl?: string) => void, 
  onDeleteMessage: (id: string) => void,
  onReaction: (id: string, reaction: string) => void,
  user?: User, 
  readReceiptsEnabled: boolean,
  onViewProfile: (user: User) => void
}) {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Call states
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callStatus, setCallStatus] = useState<'calling' | 'connected' | 'ended'>('calling');
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isInCall && callStatus === 'connected') {
      interval = setInterval(() => setCallDuration(p => p + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isInCall, callStatus]);

  useEffect(() => {
    if (isInCall) {
      setTimeout(() => {
        setCallStatus('connected');
        vibrate(200);
      }, 2000);
    } else {
      setCallStatus('calling');
      setCallDuration(0);
    }
  }, [isInCall]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 relative">
      {/* Call Overlay */}
      {isInCall && (
        <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
           <div className="flex flex-col items-center mb-10">
              <div className="w-32 h-32 rounded-full border-4 border-pink-500/30 p-1 mb-6 relative">
                 <img src={user?.imageUrl} className="w-full h-full rounded-full object-cover animate-pulse" alt=""/>
              </div>
              <h2 className="text-3xl font-bold mb-2">{user?.name}</h2>
              <p className="text-pink-400 font-medium">
                {callStatus === 'calling' ? 'Calling...' : formatTime(callDuration)}
              </p>
           </div>
           
           <div className="flex gap-6">
              <button onClick={() => setIsMuted(!isMuted)} className={`p-4 rounded-full ${isMuted ? 'bg-white text-slate-900' : 'bg-slate-800 text-white'}`}>
                 {isMuted ? <MicOff size={24}/> : <Mic size={24}/>}
              </button>
              <button onClick={() => setIsInCall(false)} className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/50 transform hover:scale-110 transition-all">
                 <Phone size={32} className="rotate-[135deg]"/>
              </button>
              <button onClick={() => setIsSpeakerOn(!isSpeakerOn)} className={`p-4 rounded-full ${isSpeakerOn ? 'bg-white text-slate-900' : 'bg-slate-800 text-white'}`}>
                 <Volume2 size={24}/>
              </button>
           </div>
        </div>
      )}

      {/* Message Context Menu */}
      {selectedMsgId && (
        <div className="absolute inset-0 z-40 bg-black/60 flex items-end animate-fade-in" onClick={() => setSelectedMsgId(null)}>
          <div className="w-full bg-slate-800 rounded-t-3xl p-6 pb-10" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-6">
               <h3 className="font-bold">Message Options</h3>
               <button onClick={() => setSelectedMsgId(null)}><X size={20}/></button>
             </div>
             
             <div className="flex gap-4 justify-center mb-8">
               {['❤️', '👍', '😮', '😢', '😂'].map(emoji => (
                 <button key={emoji} onClick={() => { onReaction(selectedMsgId, emoji); setSelectedMsgId(null); }} className="text-3xl hover:scale-125 transition-transform">
                   {emoji}
                 </button>
               ))}
             </div>

             {messages.find(m => m.id === selectedMsgId)?.senderId === 'me' && 
              messages.find(m => m.id === selectedMsgId)?.status !== 'read' && (
               <button 
                 onClick={() => { onDeleteMessage(selectedMsgId); setSelectedMsgId(null); }}
                 className="w-full py-4 bg-red-500/10 text-red-500 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-colors"
               >
                 <Trash2 size={18}/> Delete Message
               </button>
             )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-3 border-b border-white/5 flex items-center justify-between bg-slate-900/95 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 hover:bg-slate-800 rounded-full active:scale-90 transition-transform">
            <ChevronLeft />
          </button>
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => user && onViewProfile(user)}>
            <div className="relative">
              <img src={user?.imageUrl} className="w-10 h-10 rounded-full object-cover" alt="" />
              {user?.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></div>}
            </div>
            <div>
              <h3 className="font-bold text-sm flex items-center gap-1">
                {user?.name} 
                <Info size={12} className="text-slate-500" />
              </h3>
              <span className="text-xs text-slate-400">{user?.isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-4 text-pink-500">
           <button onClick={() => setIsInCall(true)} className="hover:text-pink-400 transition-colors bg-slate-800/50 p-2 rounded-full active:scale-95">
             <Phone size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => {
          const isMe = msg.senderId === 'me';
          return (
            <div 
              key={msg.id} 
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              {!isMe && (
                 <div onClick={() => user && onViewProfile(user)} className="cursor-pointer mr-2 self-end">
                    <img src={user?.imageUrl} className="w-8 h-8 rounded-full object-cover" alt="" />
                 </div>
              )}
              <div 
                onClick={() => { vibrate(5); setSelectedMsgId(msg.id); }}
                className={`max-w-[70%] rounded-2xl px-4 py-3 relative group cursor-pointer transition-transform active:scale-95 shadow-sm ${isMe ? 'bg-pink-600 text-white rounded-tr-sm' : 'bg-slate-800 text-slate-200 rounded-tl-sm'}`}
              >
                {msg.mediaType === 'image' && msg.mediaUrl ? (
                   <div className="mb-1">
                     <img src={msg.mediaUrl} alt="Shared" className="rounded-lg max-w-full object-cover max-h-60" />
                   </div>
                ) : msg.mediaType === 'audio' ? (
                   <div className="flex items-center gap-2 min-w-[120px]">
                     <div className="p-2 bg-black/20 rounded-full"><Play size={16} fill="white"/></div>
                     <div className="h-1 flex-1 bg-white/30 rounded-full"></div>
                     <span className="text-xs">0:05</span>
                   </div>
                ) : (
                  msg.text && <p className="text-sm leading-relaxed">{msg.text}</p>
                )}
                
                {msg.reactions.length > 0 && (
                  <div className={`absolute -bottom-3 ${isMe ? 'left-0' : 'right-0'} bg-slate-700 rounded-full px-1.5 py-0.5 text-xs shadow-sm border border-slate-600 flex gap-0.5 z-10`}>
                    {msg.reactions.map((r, i) => <span key={i}>{r}</span>)}
                  </div>
                )}

                <div className={`flex items-center gap-1 mt-1 opacity-70 text-[10px] ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  {isMe && readReceiptsEnabled && (
                    <span className="ml-0.5">
                      {msg.status === 'read' ? (
                        <CheckCheck size={14} className="text-blue-200" />
                      ) : msg.status === 'delivered' ? (
                        <CheckCheck size={14} className="text-slate-300" />
                      ) : (
                        <Check size={14} className="text-slate-300" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Input */}
      <div className="p-3 border-t border-white/5 bg-slate-900">
        <div className="flex items-center gap-2 bg-slate-800/50 p-2 rounded-full border border-slate-700">
           <button onClick={() => imageInputRef.current?.click()} className="p-2 rounded-full bg-slate-700 text-slate-300 hover:text-white transition-colors active:scale-95"><ImageIcon size={18} /></button>
           <input 
             type="file" 
             ref={imageInputRef} 
             hidden 
             accept="image/*"
             onChange={(e) => {
               const file = e.target.files?.[0];
               if (file) {
                 const reader = new FileReader();
                 reader.onload = (ev) => {
                   if (typeof ev.target?.result === 'string') {
                     onSend(undefined, 'image', ev.target.result);
                   }
                 };
                 reader.readAsDataURL(file);
                 e.target.value = '';
               }
             }}
           />
           <button 
             className={`p-2 rounded-full transition-all active:scale-95 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-700 text-slate-300'}`}
             onClick={() => {
               vibrate(10);
               if(isRecording) { onSend(undefined, 'audio'); setIsRecording(false); }
               else { setIsRecording(true); }
             }}
           >
             {isRecording ? <MicOff size={18}/> : <Mic size={18} />}
           </button>
           <input 
            type="text" 
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none ml-2"
            onKeyDown={e => {
              if(e.key === 'Enter' && inputText) {
                onSend(inputText);
                setInputText('');
              }
            }}
          />
           <button 
            onClick={() => { if(inputText) { onSend(inputText); setInputText(''); } }}
            className={`p-2 rounded-full transition-all active:scale-95 ${inputText ? 'bg-pink-500 text-white' : 'bg-slate-700 text-slate-500'}`}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ 
  user, 
  onToggleReadReceipts, 
  onSignOut, 
  onAddPhoto,
  onDeletePhoto,
  onSetMainPhoto,
  installPrompt,
  onInstallApp,
  isIOS,
  isStandalone,
  onShowIosInstall
}: { 
  user: CurrentUser, 
  onToggleReadReceipts: () => void, 
  onSignOut: () => void, 
  onAddPhoto: (url: string) => void,
  onDeletePhoto: (url: string) => void,
  onSetMainPhoto: (url: string) => void,
  installPrompt: any,
  onInstallApp: () => void,
  isIOS: boolean,
  isStandalone: boolean,
  onShowIosInstall: () => void
}) {
  const [activeModal, setActiveModal] = useState<'account' | 'notifications' | 'help' | 'privacy' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const renderModalContent = () => {
    switch(activeModal) {
      case 'account':
        return (
          <div className="space-y-4">
             <h3 className="font-bold text-lg mb-4">Account Settings</h3>
             <Input label="Email" value={user.email} disabled className="opacity-50" />
             <Button variant="outline" fullWidth>Change Password</Button>
             <div className="pt-4 border-t border-white/10">
               <button className="text-red-500 text-sm font-bold flex items-center gap-2 active:scale-95 transition-transform"><AlertTriangle size={16}/> Delete Account</button>
             </div>
          </div>
        );
      case 'notifications':
        return (
           <div className="space-y-4">
              <h3 className="font-bold text-lg mb-4">Notification Preferences</h3>
              {['New Matches', 'Messages', 'Super Likes', 'Marketing Emails'].map(item => (
                <div key={item} className="flex justify-between items-center py-2 border-b border-white/5">
                  <span>{item}</span>
                  <ToggleRight size={24} className="text-pink-500" />
                </div>
              ))}
           </div>
        );
      case 'help':
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-lg mb-4">Help & Support</h3>
            <div className="space-y-2">
              <div className="p-3 bg-slate-800 rounded-xl">
                 <div className="font-bold text-sm mb-1">How do I verify?</div>
                 <div className="text-xs text-slate-400">Go to settings and tap verification badge.</div>
              </div>
              <div className="p-3 bg-slate-800 rounded-xl">
                 <div className="font-bold text-sm mb-1">Is this free?</div>
                 <div className="text-xs text-slate-400">Basic features are free. VIP unlocks more.</div>
              </div>
            </div>
            <Button fullWidth>Contact Support</Button>
          </div>
        );
       case 'privacy':
         return (
            <div className="space-y-4">
               <h3 className="font-bold text-lg mb-4">Privacy & Security</h3>
               <div className="flex items-center justify-between p-3 bg-slate-800 rounded-xl">
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">Read Receipts</span>
                    <span className="text-xs text-slate-400">Let others know when you've read their messages</span>
                  </div>
                  <button onClick={onToggleReadReceipts}>
                    {user.readReceiptsEnabled ? <ToggleRight size={32} className="text-pink-500"/> : <ToggleLeft size={32} className="text-slate-500"/>}
                  </button>
               </div>
            </div>
         );
      default: return null;
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Header Profile */}
      <div className="relative h-64 bg-slate-800">
        {user.imageUrl ? (
          <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
            <ImageIcon size={48} />
            <span className="text-sm mt-2">No photo selected</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-6">
           <h2 className="text-3xl font-bold flex items-center gap-2">
             {user.name}, {user.age} 
             {user.isVerified && <CheckCircle2 className="text-blue-500 fill-white" />}
           </h2>
           <p className="text-slate-300">{user.location}</p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* About Section */}
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">About</h3>
          <p className="text-slate-200 text-sm leading-relaxed">{user.about || user.bio}</p>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3">
           <DetailItem icon={<Ruler size={16}/>} label="Height" value={user.height ? `${user.height}cm` : '-'} />
           <DetailItem icon={<Globe size={16}/>} label="Ethnicity" value={user.ethnicity || '-'} />
           <DetailItem icon={<Dumbbell size={16}/>} label="Body Type" value={user.bodyType || '-'} />
           <DetailItem icon={<Heart size={16}/>} label="Looking For" value={user.lookingFor?.[0] || '-'} />
        </div>

        {/* Stats */}
        <div className="flex gap-4">
          <div className="flex-1 bg-slate-800 p-4 rounded-2xl text-center border border-white/5">
             <div className="text-2xl font-bold text-pink-500">{user.matchesToday}</div>
             <div className="text-xs text-slate-400 font-bold uppercase">Matches Today</div>
          </div>
          <div className="flex-1 bg-slate-800 p-4 rounded-2xl text-center border border-white/5">
             <div className="text-2xl font-bold text-violet-500">{user.swipesToday}</div>
             <div className="text-xs text-slate-400 font-bold uppercase">Swipes Today</div>
          </div>
        </div>

        {/* My Photos Section */}
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">My Photos</h3>
          <div className="grid grid-cols-3 gap-3">
             <button 
               onClick={() => fileInputRef.current?.click()}
               className="aspect-[3/4] rounded-xl bg-slate-800 border-2 border-dashed border-slate-600 flex flex-col items-center justify-center text-slate-500 hover:text-white hover:border-pink-500 transition-colors active:scale-95"
             >
               <Upload size={24} />
               <span className="text-xs font-bold mt-1">Add</span>
             </button>
             <input 
               type="file" 
               ref={fileInputRef} 
               hidden 
               accept="image/*" 
               onChange={(e) => {
                 const file = e.target.files?.[0];
                 if (file) {
                   const reader = new FileReader();
                   reader.onload = (ev) => {
                     if (ev.target?.result && typeof ev.target.result === 'string') {
                       onAddPhoto(ev.target.result);
                     }
                   };
                   reader.readAsDataURL(file);
                   e.target.value = ''; // Reset input so same file can be selected again
                 }
               }}
             />
             
             {user.photos?.map((photo, i) => (
               <div key={i} className="relative aspect-[3/4] group rounded-xl overflow-hidden">
                 <img src={photo} className="w-full h-full object-cover" alt="User photo" />
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onSetMainPhoto(photo); }}
                      className={`p-2 rounded-full ${user.imageUrl === photo ? 'bg-pink-500 text-white' : 'bg-black/50 text-white hover:bg-pink-500'}`}
                      title="Set as Main"
                    >
                      <Star size={16} fill={user.imageUrl === photo ? "currentColor" : "none"} />
                    </button>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if(window.confirm('Delete this photo?')) onDeletePhoto(photo); 
                      }}
                      className="p-2 rounded-full bg-black/50 text-white hover:bg-red-500"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                 </div>
                 {user.imageUrl === photo && (
                   <div className="absolute top-2 right-2 bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                     Main
                   </div>
                 )}
               </div>
             ))}
          </div>
        </div>

        {/* VIP Banner */}
        {!user.isVip && (
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-orange-500/20">
             <div>
               <div className="font-bold text-white text-lg">Get VIP Access</div>
               <div className="text-orange-100 text-xs">Unlimited swipes & direct messages</div>
             </div>
             <button onClick={() => alert("Upgrade feature mock")} className="bg-white text-orange-500 px-4 py-2 rounded-xl font-bold text-sm active:scale-95 transition-transform">Upgrade</button>
          </div>
        )}

        {/* Settings List */}
        <div className="space-y-2">
           {/* Install App Button */}
           {(!isStandalone && (installPrompt || isIOS)) && (
             <button onClick={installPrompt ? onInstallApp : onShowIosInstall} className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-pink-500/20 to-violet-500/20 hover:bg-slate-800 transition-colors border border-pink-500/30 active:scale-[0.98]">
                <div className="flex items-center gap-4">
                   <div className="bg-gradient-to-tr from-pink-500 to-violet-600 p-2 rounded-lg text-white"><Download size={20}/></div>
                   <span className="font-bold text-white">Install App</span>
                </div>
                <div className="bg-pink-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">FREE</div>
             </button>
           )}
           <SettingsButton icon={<Settings/>} label="Account Settings" onClick={() => setActiveModal('account')} />
           <SettingsButton icon={<Bell/>} label="Notifications" onClick={() => setActiveModal('notifications')} />
           <SettingsButton icon={<Lock/>} label="Privacy & Security" onClick={() => setActiveModal('privacy')} />
           <SettingsButton icon={<HelpCircle/>} label="Help & Support" onClick={() => setActiveModal('help')} />
           <button onClick={onSignOut} className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-800 transition-colors text-red-500 active:scale-[0.98]">
              <div className="bg-red-500/10 p-2 rounded-lg"><LogOut size={20}/></div>
              <span className="font-semibold">Sign Out</span>
           </button>
        </div>
      </div>

      {/* Settings Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setActiveModal(null)}>
           <div className="bg-slate-900 w-full max-w-sm rounded-3xl p-6 border border-white/10" onClick={e => e.stopPropagation()}>
             {renderModalContent()}
             <button onClick={() => setActiveModal(null)} className="mt-6 w-full py-3 bg-slate-800 rounded-xl text-slate-300 font-medium active:scale-95 transition-transform">Close</button>
           </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return <div className="bg-slate-800/50 p-3 rounded-xl flex items-center gap-3"><div className="text-pink-500 bg-pink-500/10 p-2 rounded-lg">{icon}</div><div><div className="text-[10px] text-slate-500 uppercase font-bold">{label}</div><div className="text-sm font-medium text-white">{value}</div></div></div>;
}

function SettingsButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-800/50 hover:bg-slate-800 transition-colors border border-white/5 active:scale-[0.98]">
       <div className="flex items-center gap-4">
          <div className="bg-slate-700 p-2 rounded-lg text-slate-300">{icon}</div>
          <span className="font-semibold text-slate-200">{label}</span>
       </div>
       <ChevronDown size={16} className="text-slate-500 -rotate-90"/>
    </button>
  )
}

function ChatList({ matches, conversations, onSelect }: { matches: User[], conversations: User[], onSelect: (id: string) => void }) {
  return (
    <div className="h-full overflow-y-auto p-4">
       <h2 className="font-bold text-xl mb-4">Messages</h2>
       
       {/* New Matches Row */}
       <div className="mb-6">
         <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">New Matches</h3>
         <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex flex-col items-center gap-1 min-w-[64px]">
               <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500">
                  <Heart size={24}/>
               </div>
               <span className="text-xs font-medium text-slate-400">Likes</span>
            </div>
            {matches.map(user => (
              <button key={user.id} onClick={() => onSelect(user.id)} className="flex flex-col items-center gap-1 min-w-[64px] active:scale-95 transition-transform">
                 <img src={user.imageUrl} className="w-16 h-16 rounded-full object-cover border-2 border-pink-500" alt=""/>
                 <span className="text-xs font-medium">{user.name.split(' ')[0]}</span>
              </button>
            ))}
         </div>
       </div>

       {/* Conversation List */}
       <div className="space-y-2">
         {conversations.map(user => (
           <button key={user.id} onClick={() => onSelect(user.id)} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-colors border border-white/5 active:scale-[0.98]">
              <div className="relative">
                 <img src={user.imageUrl} className="w-14 h-14 rounded-full object-cover" alt=""/>
                 {user.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-800 rounded-full"/>}
              </div>
              <div className="flex-1 text-left">
                 <div className="flex justify-between items-center mb-1">
                    <h4 className="font-bold text-base">{user.name}</h4>
                    <span className="text-xs text-slate-400">10:42 AM</span>
                 </div>
                 <p className="text-sm text-slate-400 line-clamp-1">{user.bio}</p>
              </div>
           </button>
         ))}
       </div>
    </div>
  );
}

function VipPaymentModal({ onClose, onUpgrade }: { onClose: () => void, onUpgrade: () => void }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const handlePay = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onUpgrade();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 w-full max-w-sm rounded-3xl p-6 border border-white/10 relative overflow-hidden">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500"><X/></button>
        
        <div className="text-center mb-6">
           <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-orange-500/30">
              <Crown size={32} className="text-white"/>
           </div>
           <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-orange-500">VIP Access</h2>
           <p className="text-slate-400 text-sm mt-2">Unlock unlimited matches & messages</p>
        </div>

        {step === 1 ? (
           <div className="space-y-3">
              {[
                { label: '1 Month', price: '$9.99', popular: false },
                { label: '6 Months', price: '$29.99', popular: true },
                { label: '12 Months', price: '$49.99', popular: false },
              ].map((plan, i) => (
                <button key={i} className={`w-full p-4 rounded-xl border-2 flex justify-between items-center ${plan.popular ? 'border-orange-500 bg-orange-500/10' : 'border-slate-700 bg-slate-800'} active:scale-95 transition-transform`}>
                   <span className="font-bold">{plan.label}</span>
                   <span className="font-bold text-lg">{plan.price}</span>
                </button>
              ))}
              <Button variant="vip" fullWidth onClick={() => setStep(2)}>Continue</Button>
           </div>
        ) : (
           <div className="space-y-4 animate-fade-in">
              <Input label="Card Number" placeholder="0000 0000 0000 0000" icon={<CreditCard size={16}/>} />
              <div className="grid grid-cols-2 gap-4">
                 <Input label="Expiry" placeholder="MM/YY" icon={<Calendar size={16}/>} />
                 <Input label="CVC" placeholder="123" icon={<Lock size={16}/>} />
              </div>
              <Button variant="vip" fullWidth onClick={handlePay} disabled={loading}>
                 {loading ? 'Processing...' : 'Confirm Payment'}
              </Button>
           </div>
        )}
      </div>
    </div>
  )
}
