import React, { useState, useEffect, useRef } from 'react';
import { CustomShieldedVideoPlayer } from './CustomShieldedVideoPlayer';
import { db } from '../lib/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  doc, 
  getDoc, 
  updateDoc,
  serverTimestamp, 
  orderBy,
  limit,
  onSnapshot,
  deleteDoc
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Flame, 
  Trophy, 
  Play, 
  BookOpen, 
  Send, 
  Smartphone, 
  User, 
  Users, 
  GraduationCap, 
  Award,
  Zap,
  ChevronLeft,
  X,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Cpu,
  Clock,
  Sparkles,
  Home,
  MessageCircle,
  Palette,
  Eye,
  Check
} from 'lucide-react';
import QRCode from 'qrcode';
import CryptoJS from 'crypto-js';

const SECRET_KEY = "JamalAcademy_Secret_2026";

export function checkProfanity(text: string): { isBad: boolean; matchedWord?: string } {
  if (!text) return { isBad: false };
  
  const clean = text.toLowerCase();
  
  const removeDiacritics = (str: string) => str.replace(/[\u064B-\u0652]/g, "").replace(/\u0640/g, "");
  const normArabic = (str: string) => {
    let s = removeDiacritics(str);
    s = s.replace(/[أإآٱ]/g, "ا");
    s = s.replace(/ة/g, "ه");
    s = s.replace(/ى/g, "ي");
    s = s.replace(/[ؤئ]/g, "ء");
    return s;
  };

  const normalizedWithSpaces = normArabic(clean);
  const normalizedNoSpaces = normalizedWithSpaces.replace(/\s+/g, "");

  // Base Egyptian bad words (normalized)
  const badWords = [
    "كس", "طيز", "زب", "خول", "عرص", "ديوث", "قحبه", "شرموطه", "شرموط", "شراميط",
    "متناك", "منيوك", "منيك", "تناكه", "بضين", "بضان", "اهبل", "غبي", "ابنالكلب"
  ];
  
  // Exact bad phrases to check in no-space text
  const badPhrasesNoSpaces = [
    "ابنالمتناكه", "ابنالشرموطه", "ابنالاحبه", "ابنالوسخه", "ابنالمتناكة", "ابنالشرموطة", "ابنالوسخة",
    "كسمك", "كسختك", "طيزك", "امكالساقطه", "يلعنامك", "يلعنابوك", "كسختك", "كسمينامك", "كسخاله", "كسعمه"
  ];

  for (const phrase of badPhrasesNoSpaces) {
    if (normalizedNoSpaces.includes(phrase)) {
      return { isBad: true, matchedWord: phrase };
    }
  }

  const words = normalizedWithSpaces.split(/[\s\d\p{P}\p{S}]+/u).filter(Boolean);
  
  for (const word of words) {
    for (const bad of badWords) {
      if (bad === "زب") {
        if (word === "زب" || word === "زبك" || word === "زبي" || word === "زبه" || word === "الزب" || word === "الزبك" || word === "الزبي") {
          return { isBad: true, matchedWord: "زب" };
        }
      } else if (bad === "كس") {
        if (word === "كس" || word === "كسك" || word === "كسمك" || word === "كسم" || word === "كسها" || word === "الكس" || word === "كسه" || word === "كسمك" || word === "كسمكم" || word === "كسختك") {
          return { isBad: true, matchedWord: "كس" };
        }
      } else if (bad === "طيز") {
        if (word.includes("طيز")) {
          return { isBad: true, matchedWord: "طيز" };
        }
      } else if (bad === "خول") {
        if (word === "خول" || word === "خوال" || word === "الخول" || word === "خولنه") {
          return { isBad: true, matchedWord: "خول" };
        }
      } else if (bad === "عرص") {
        if (word.includes("عرص")) {
          return { isBad: true, matchedWord: "عرص" };
        }
      } else if (bad === "شرموطه" || bad === "شرموط") {
        if (word.includes("شرموط") || word.includes("شراميط")) {
          return { isBad: true, matchedWord: "شرموطة" };
        }
      } else if (bad === "متناك" || bad === "منيوك" || bad === "منيك") {
        if (word.includes("متناك") || word.includes("منيوك") || word.includes("منيك") || word.includes("تناك")) {
          return { isBad: true, matchedWord: "متناك" };
        }
      } else if (bad === "قحبه") {
        if (word.includes("قحب")) {
          return { isBad: true, matchedWord: "قحبة" };
        }
      } else if (bad === "ديوث") {
        if (word.includes("ديوث")) {
          return { isBad: true, matchedWord: "ديوث" };
        }
      } else {
        if (word === bad || (bad.length > 3 && word.includes(bad))) {
          return { isBad: true, matchedWord: bad };
        }
      }
    }
  }

  return { isBad: false };
}

interface StudentDashboardProps {
  onLogout: () => void;
  currentTheme?: 'marvel' | 'space' | 'matrix';
  onThemeChange?: (theme: 'marvel' | 'space' | 'matrix') => void;
}

export default function StudentDashboard({ onLogout, currentTheme = 'marvel', onThemeChange }: StudentDashboardProps) {
  // Authentication & Registration state
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginForm, setLoginForm] = useState({
    name: '',
    code: '',
    phone: '',
    className: '',
    groupName: '',
    password: ''
  });
  const [loginError, setLoginError] = useState('');
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [newlyRegisteredStudent, setNewlyRegisteredStudent] = useState<any>(null);
  const [legacyStudentNeedPassword, setLegacyStudentNeedPassword] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');

  // Selected Avatar of the student (default is spiderman)
  const [selectedAvatar, setSelectedAvatar] = useState<string>('spiderman');

  // App Tabs
  const [activeTab, setActiveTab] = useState<'home' | 'missions' | 'lectures' | 'friday' | 'profile' | 'community'>('home');

  // Real data state
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [inspectingResult, setInspectingResult] = useState<any | null>(null);
  
  // Active Exam state
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: string }>({});
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);
  const [examSubmittedResult, setExamSubmittedResult] = useState<any>(null);
  const [quizTimer, setQuizTimer] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Video modal player state
  const [activeVideo, setActiveVideo] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFakeFullscreen, setIsFakeFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoPlayerRef = useRef<HTMLIFrameElement | null>(null);

  // Teacher Avatar Image error state
  const [teacherAvatarError, setTeacherAvatarError] = useState(false);

  // Chat AI state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([
    { role: 'model', content: 'أهلاً بك يا بطل! أنا F.R.I.D.A.Y. المساعد الذكي لمستر أحمد جمال. كيف يمكنني مساعدتك اليوم في تعلم اللغة الإنجليزية وصقل مهاراتك الخارقة؟' }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Community Chat state
  const [communityMessages, setCommunityMessages] = useState<any[]>([]);
  const [communityInput, setCommunityInput] = useState('');
  const [isSendingCommunityMessage, setIsSendingCommunityMessage] = useState(false);
  const communityEndRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to real-time community chat for student's grade
  useEffect(() => {
    if (!student || activeTab !== 'community') return;
    
    const className = student.className;
    
    // Subscribe to messages in this class grade
    const q = query(
      collection(db, 'grade_chats'),
      where('class_name', '==', className)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Sort client-side to avoid needing composite index
      const msgs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() as any }))
        .sort((a, b) => a.timestamp_num - b.timestamp_num);
        
      setCommunityMessages(msgs);
      
      // Auto-scroll to bottom of live chat
      setTimeout(() => {
        communityEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      // Perform hourly/2-hour automatic cleanup of old messages
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      snapshot.docs.forEach(async (docSnap) => {
        const data = docSnap.data();
        if (data.timestamp_num && data.timestamp_num < twoHoursAgo) {
          try {
            await deleteDoc(doc(db, 'grade_chats', docSnap.id));
          } catch (e) {
            console.error("Cleanup old chat error:", e);
          }
        }
      });
    }, (err) => {
      console.error("Live community chat subscription error:", err);
    });

    return () => unsubscribe();
  }, [student, activeTab]);

  // Message to Teacher state
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isAnonymousMessage, setIsAnonymousMessage] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const handleSendTeacherMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || isSendingMessage) return;
    setIsSendingMessage(true);
    try {
      await addDoc(collection(db, 'messages'), {
        text: messageText,
        student_id: student.id || 'unknown',
        student_name: isAnonymousMessage ? 'فاعل خير (مجهول)' : student.name,
        student_code: isAnonymousMessage ? 'مجهول' : student.code,
        class_name: student.className,
        timestamp: new Date().toISOString(),
        is_anonymous: isAnonymousMessage,
      });
      alert('تم إرسال رسالتك السرية بنجاح إلى القائد!');
      setShowMessageModal(false);
      setMessageText('');
      setIsAnonymousMessage(false);
    } catch (err) {
      console.error("Error sending message", err);
      alert('حدث خطأ أثناء إرسال الرسالة. حاول مرة أخرى.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleBanningStudent = async (currStudent: any, triggeredWord: string) => {
    try {
      // Find the student document and set is_banned to true
      const q = query(collection(db, 'students'), where('code', '==', currStudent.code));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const sDoc = snap.docs[0];
        await updateDoc(doc(db, 'students', sDoc.id), {
          is_banned: true
        });
      }

      // Send automated teacher message notification
      await addDoc(collection(db, 'messages'), {
        student_name: "⚠️ نظام الحماية التلقائي (الذكاء الاصطناعي)",
        student_code: "SYSTEM",
        class_name: currStudent.className,
        is_anonymous: false,
        text: `🚨 تنبيه حظر بطل: تم حظر الطالب "${currStudent.name}" (كود: ${currStudent.code}) تلقائياً ومباشرة من المنصة لمحاولته إرسال كلمة خارجة غير لائقة في شات مجتمع الطلاب.\n\nالكلمة أو المحتوى المكتشف: [ ${triggeredWord} ]\n\nنص الرسالة كاملة: "${triggeredWord}"\n\nتم اتخاذ الإجراء اللازم وإغلاق الحساب في الحال.`,
        timestamp: new Date().toISOString()
      });

      // Show alert and logout
      alert(`🚨 تم حظرك فوراً من المنصة بسبب كتابة كلمات غير لائقة أو خارجة! [ ${triggeredWord} ]\nتم إرسال بلاغ فوري ببياناتك بالكامل لمستر أحمد جمال.`);
      setStudent(null);
      localStorage.removeItem('jamal_student');
    } catch (e) {
      console.error("Error banning student:", e);
    }
  };

  const handleSendCommunityMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!communityInput.trim() || isSendingCommunityMessage) return;

    const rawText = communityInput.trim();
    setCommunityInput('');
    setIsSendingCommunityMessage(true);

    try {
      // 1. Run local Egyptian profanity filter
      const localCheck = checkProfanity(rawText);
      if (localCheck.isBad) {
        await handleBanningStudent(student, localCheck.matchedWord || rawText);
        setIsSendingCommunityMessage(false);
        return;
      }

      // 2. Perform server-side AI check for extra security (phonetic bypass, severe context etc.)
      const verifyRes = await fetch('/api/verify-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText })
      });
      if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        if (verifyData.isBad) {
          await handleBanningStudent(student, verifyData.matchedWord || rawText);
          setIsSendingCommunityMessage(false);
          return;
        }
      }

      // 3. Write message to Firestore (this guarantees live chat with no delay because of onSnapshot)
      await addDoc(collection(db, 'grade_chats'), {
        class_name: student.className,
        student_code: student.code,
        student_name: student.name,
        avatar: selectedAvatar,
        text: rawText,
        timestamp_num: Date.now(),
        createdAt: new Date().toISOString()
      });

    } catch (err: any) {
      console.error("Error sending community message:", err);
    } finally {
      setIsSendingCommunityMessage(false);
    }
  };

  // Load existing session
  useEffect(() => {
    const savedStudent = localStorage.getItem('jamal_student');
    if (savedStudent) {
      const parsed = JSON.parse(savedStudent);
      setStudent(parsed);
      setSelectedAvatar(parsed.avatar || 'spiderman');
      fetchStudentData(parsed.code, parsed.className);
    } else {
      setLoading(false);
    }
  }, []);

  // Sync scroll for chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatLoading]);

  // Handle countdown timer for exam
  useEffect(() => {
    if (activeQuiz && quizTimer > 0) {
      timerRef.current = setTimeout(() => {
        setQuizTimer(prev => {
          if (prev <= 1) {
            // Auto submit when timer runs out
            submitActiveQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeQuiz, quizTimer]);

  const fetchStudentData = async (code: string, className: string) => {
    setLoading(true);
    try {
      // Check if student is banned first
      const studentQuery = query(collection(db, 'students'), where('code', '==', code));
      const studentSnap = await getDocs(studentQuery);
      if (!studentSnap.empty) {
        const data = studentSnap.docs[0].data();
        if (data.is_banned) {
          setStudent(null);
          localStorage.removeItem('jamal_student');
          alert('🚨 تم حظر هذا الحساب من المنصة لاستخدام كلمات غير لائقة! يرجى مراجعة مستر أحمد جمال.');
          setLoading(false);
          return;
        }
      }

      // Fetch active quizzes for their class
      const qSnap = await getDocs(query(collection(db, 'quizzes'), where('class_name', '==', className), where('is_active', '==', true)));
      const qList = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setQuizzes(qList);

      // Fetch videos for their class
      const vSnap = await getDocs(query(collection(db, 'videos'), where('class_name', '==', className)));
      const vList = vSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVideos(vList);

      // Fetch student's past results
      const rSnap = await getDocs(query(collection(db, 'results'), where('student_code', '==', code)));
      const rList = rSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudentResults(rList);

      // Calculate total points
      const totalPoints = rList.reduce((acc, curr: any) => acc + (curr.score || 0), 0);
      
      // Update local storage and student state with real cumulative score
      setStudent((prev: any) => {
        const updated = { ...prev, totalScore: totalPoints };
        localStorage.setItem('jamal_student', JSON.stringify(updated));
        return updated;
      });

    } catch (err) {
      console.error("Error loading student panel:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateUniqueCode = async () => {
    // Attempt to generate a unique 4-digit code up to 5 times
    for (let i = 0; i < 5; i++) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const code = `AG-${randomNum}`;
      
      const q = query(collection(db, 'students'), where('code', '==', code));
      const snap = await getDocs(q);
      if (snap.empty) {
        return code;
      }
    }
    // Fallback
    return `AG-${Math.floor(10000 + Math.random() * 90000)}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmittingLogin(true);

    const { code, password } = loginForm;
    if (!code || !password) {
      setLoginError('يرجى إدخال الكود الفريد وكلمة المرور الخاصة بك لتسجيل الدخول!');
      setIsSubmittingLogin(false);
      return;
    }

    try {
      const formattedCode = code.trim().toUpperCase();
      const studentQuery = query(collection(db, 'students'), where('code', '==', formattedCode));
      const studentSnap = await getDocs(studentQuery);

      if (studentSnap.empty) {
        setLoginError('عذراً يا بطل! كود الطالب المدخل غير مسجل بالأكاديمية. يرجى مراجعته أو تسجيل حساب جديد.');
        setIsSubmittingLogin(false);
        return;
      }

      const studentDoc = studentSnap.docs[0];
      const data = studentDoc.data();

      if (data.is_banned) {
        setLoginError('🚨 عذراً، تم حظر هذا الحساب من المنصة نهائياً بسبب استخدام كلمات بذيئة وغير لائقة! يرجى مراجعة مستر أحمد جمال.');
        setIsSubmittingLogin(false);
        return;
      }

      // Check if student has password in database
      if (data.password) {
        if (data.password === password) {
          // Success
          const savedData = { 
            id: studentDoc.id, 
            name: data.name,
            code: data.code,
            phone: data.phone,
            className: data.class_name, 
            groupName: data.group_name,
            totalScore: data.total_score || 0,
            badges: data.badges || ['Iron Recruit'],
            avatar: data.avatar || 'spiderman'
          };
          localStorage.setItem('jamal_student', JSON.stringify(savedData));
          setStudent(savedData);
          setSelectedAvatar(savedData.avatar);
          await fetchStudentData(savedData.code, savedData.className);
        } else {
          setLoginError('كلمة المرور غير صحيحة! يرجى إعادة المحاولة أو مراجعة مستر أحمد جمال لإعادة تعيينها.');
        }
      } else {
        // Legacy student with no password. Trigger password setup upgrade.
        setLegacyStudentNeedPassword({
          id: studentDoc.id,
          ...data
        });
      }

    } catch (err: any) {
      setLoginError('خطأ أثناء الاتصال بالأكاديمية: ' + err.message);
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmittingLogin(true);

    const { name, phone, className, groupName, password } = loginForm;
    if (!name || !phone || !className || !groupName || !password) {
      setLoginError('يرجى ملء كافة تفاصيل البطل لتسجيل عضويتك بالأكاديمية!');
      setIsSubmittingLogin(false);
      return;
    }

    try {
      // Create a unique student code
      const generatedCode = await generateUniqueCode();

      const newStudentDoc = {
        name: name.trim(),
        code: generatedCode,
        phone: phone.trim(),
        password: password.trim(),
        class_name: className,
        group_name: groupName,
        total_score: 0,
        badges: ['Iron Recruit'],
        avatar: 'spiderman', // default avatar
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'students'), newStudentDoc);

      // Show the congratulatory popup modal with their newly generated credentials
      setNewlyRegisteredStudent({
        id: docRef.id,
        name: newStudentDoc.name,
        code: newStudentDoc.code,
        password: newStudentDoc.password,
        phone: newStudentDoc.phone,
        className: newStudentDoc.class_name,
        groupName: newStudentDoc.group_name,
        totalScore: 0,
        badges: ['Iron Recruit'],
        avatar: 'spiderman'
      });

    } catch (err: any) {
      setLoginError('فشل تسجيل البطل: ' + err.message);
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const handleUpgradeLegacyStudentPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) return;

    try {
      await updateDoc(doc(db, 'students', legacyStudentNeedPassword.id), {
        password: newPassword.trim()
      });

      const savedData = { 
        id: legacyStudentNeedPassword.id, 
        name: legacyStudentNeedPassword.name,
        code: legacyStudentNeedPassword.code,
        phone: legacyStudentNeedPassword.phone,
        className: legacyStudentNeedPassword.class_name, 
        groupName: legacyStudentNeedPassword.group_name,
        totalScore: legacyStudentNeedPassword.total_score || 0,
        badges: legacyStudentNeedPassword.badges || ['Iron Recruit'],
        avatar: legacyStudentNeedPassword.avatar || 'spiderman'
      };

      localStorage.setItem('jamal_student', JSON.stringify(savedData));
      setStudent(savedData);
      setSelectedAvatar(savedData.avatar);
      setLegacyStudentNeedPassword(null);
      await fetchStudentData(savedData.code, savedData.className);

    } catch (err: any) {
      alert("خطأ أثناء تعيين كلمة المرور: " + err.message);
    }
  };

  const handleSelectAvatar = async (avatarName: string) => {
    setSelectedAvatar(avatarName);
    const updatedStudent = { ...student, avatar: avatarName };
    localStorage.setItem('jamal_student', JSON.stringify(updatedStudent));
    setStudent(updatedStudent);
    
    // Save to Firestore
    try {
      if (student?.id) {
        await updateDoc(doc(db, 'students', student.id), {
          avatar: avatarName
        });
      }
    } catch (err) {
      console.error("Error saving avatar:", err);
    }
  };

  // Launch interactive mission (quiz)
  const launchExam = async (quiz: any) => {
    // Check if already completed on this device or in past results
    const alreadyCompletedDevice = localStorage.getItem('jamal_completed_quiz_' + quiz.id);
    const alreadyCompletedDb = studentResults.some(r => r.quiz_id === quiz.id);

    if (alreadyCompletedDevice || alreadyCompletedDb) {
      alert("لقد قمت بأداء هذه المهمة بالفعل مسبقاً! الأبطال ينجزون المهمة مرة واحدة لضمان الشرف والنصر.");
      return;
    }

    setLoading(true);
    try {
      // Fetch questions for this quiz
      const questionsSnap = await getDocs(collection(db, 'quizzes', quiz.id, 'questions'));
      const qList = questionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (qList.length === 0) {
        alert("لا توجد أسئلة متاحة في هذا الاختبار حالياً.");
        return;
      }

      setQuizQuestions(qList);
      setSelectedAnswers({});
      setActiveQuiz(quiz);
      setExamSubmittedResult(null);
      
      // Set timer (e.g. 5 minutes per question)
      setQuizTimer(qList.length * 5 * 60); 

    } catch (err) {
      console.error("Error fetching questions:", err);
    } finally {
      setLoading(false);
    }
  };

  const submitActiveQuiz = async () => {
    if (isSubmittingExam) return;
    setIsSubmittingExam(true);

    if (timerRef.current) clearTimeout(timerRef.current);

    let score = 0;
    quizQuestions.forEach(q => {
      if (selectedAnswers[q.id] === q.correct_answer) {
        score++;
      }
    });

    const answersList = quizQuestions.map(q => ({
      question_id: q.id,
      question_text: q.question_text,
      choice_a: q.choice_a,
      choice_b: q.choice_b,
      choice_c: q.choice_c,
      choice_d: q.choice_d,
      correct_answer: q.correct_answer,
      student_answer: selectedAnswers[q.id] || ''
    }));

    try {
      // Save result to Firestore
      const resultData = {
        student_code: student.code,
        student_name: student.name,
        phone: student.phone,
        class_name: student.className,
        group_name: student.groupName,
        quiz_id: activeQuiz.id,
        quiz_name: activeQuiz.quiz_name,
        score: score,
        total_questions: quizQuestions.length,
        submittedAt: new Date().toISOString(),
        answers: answersList
      };

      await addDoc(collection(db, 'results'), resultData);

      // Save locally to prevent re-attempts
      localStorage.setItem('jamal_completed_quiz_' + activeQuiz.id, 'true');

      // Create QR Verification code
      const qrData = {
        name: student.name,
        code: student.code,
        score: `${score}/${quizQuestions.length}`,
        quiz_id: activeQuiz.id,
        timestamp: new Date().toISOString()
      };
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(qrData), SECRET_KEY).toString();
      const qrUrl = await QRCode.toDataURL(encrypted);

      setExamSubmittedResult({
        score,
        total: quizQuestions.length,
        qrCodeUrl: qrUrl,
        code: student.code
      });

      // Update local state to show completed quiz
      setStudentResults(prev => [...prev, { ...resultData, id: 'temp-id' }]);

      // Fetch student data to update total score
      await fetchStudentData(student.code, student.className);

    } catch (err) {
      console.error("Error submitting exam:", err);
      alert("حدث خطأ أثناء حفظ النتيجة، يرجى المحاولة مرة أخرى.");
    } finally {
      setIsSubmittingExam(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/student-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMsg,
          chatHistory: chatMessages.slice(-4) // Send last 4 messages for context to save tokens
        })
      });

      let data;
      try {
        const text = await response.text();
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Server returned an invalid response (Status: ${response.status})`);
      }

      if (!response.ok || data.error) {
        throw new Error(data.error || `Server Error: ${response.status}`);
      }

      setChatMessages(prev => [...prev, { role: 'model', content: data.response }]);
    } catch (err: any) {
      const errorMessage = err.message || '';
      if (errorMessage.includes("GEMINI_API_KEY") || errorMessage.includes("missing")) {
        setChatMessages(prev => [...prev, { role: 'model', content: `⚠️ **CONFIGURATION ERROR:**\n\n${errorMessage}` }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'model', content: 'عذراً يا بطل، لقد واجهت مشكلة فنية في الاتصال بخوادم الذكاء الاصطناعي الفائقة. يرجى المحاولة مرة أخرى!' }]);
      }
    } finally {
      setIsChatLoading(false);
    }
  };

  // Helper: format timer
  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Badges logic
  const getBadgeAndDescription = (score: number) => {
    if (score >= 121) return { badge: 'Infinity Master 🌌', color: 'text-amber-400 border-amber-400', desc: 'سيد أكاديمية اللغة الخارقة بلا منازع!' };
    if (score >= 76) return { badge: 'Nanotech Mark-L 🧬', color: 'text-rose-400 border-rose-400', desc: 'صاحب دروع النانو المتطورة ومستوى فائق.' };
    if (score >= 41) return { badge: 'Thunder God ⚡', color: 'text-cyan-400 border-cyan-400', desc: 'متحكم بعواصف الكلمات وقواعد اللغويات.' };
    if (score >= 16) return { badge: 'Super Soldier 🔵', color: 'text-sky-400 border-sky-400', desc: 'جندي مخلص وحامي قلعة اللغة والدرجات.' };
    return { badge: 'Iron Recruit 🔴', color: 'text-red-500 border-red-500', desc: 'عضو مبتدئ في فرقة النخبة للتعلم.' };
  };

  const currentLevelInfo = getBadgeAndDescription(student?.totalScore || 0);

  if (loading && !student) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black">
        <div className="w-16 h-16 border-8 border-cyan-400 border-t-rose-500 rounded-full animate-spin mb-4"></div>
        <p className="text-xl font-bold tracking-widest text-sky-400 uppercase">Verifying Alliance Credentials...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
        <div className="w-full max-w-lg bg-black/95 backdrop-blur-xl border-4 border-black shadow-[10px_10px_0px_#ef4444] p-8 md:p-10 rounded-3xl relative">
          
          {/* Decorative Comic Sound Badges / Stickers */}
          <div className="absolute -top-6 -left-6 bg-yellow-400 text-black border-4 border-black font-sans font-black text-xs md:text-sm px-4 py-2 uppercase tracking-widest rounded-xl shadow-[4px_4px_0px_#000] transform -rotate-12 z-10 animate-bounce">
            POW! LEARN ENGLISH
          </div>
          <div className="absolute -bottom-6 -right-6 bg-cyan-400 text-black border-4 border-black font-sans font-black text-xs md:text-sm px-4 py-2 uppercase tracking-widest rounded-xl shadow-[4px_4px_0px_#000] transform rotate-12 z-10">
            BOOM! BE HEROIC
          </div>

          <div className="text-center mb-8">
            <div className="inline-block bg-rose-600 border-4 border-white px-5 py-2 rounded transform skew-x-[-10deg] mb-4 shadow-[0_0_20px_rgba(226,54,54,0.4)]">
              <span className="text-xs font-black text-white uppercase tracking-widest">
                MR. AHMED GAMAL ACADEMY
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter uppercase mb-2">
              HERO GATEWAY
            </h2>
            <p className="text-sm font-bold text-gray-400">
              ادخل بوابات الأكاديمية وصقل مهاراتك اللغوية الفائقة
            </p>
          </div>

          {/* Login vs Register Tabs Selector */}
          <div className="grid grid-cols-2 gap-2 bg-gray-950 border-2 border-gray-800 p-1 rounded-2xl mb-6">
            <button
              onClick={() => {
                setAuthMode('login');
                setLoginError('');
              }}
              className={`py-3 rounded-xl text-sm font-black transition uppercase ${
                authMode === 'login'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              تسجيل الدخول (أبطال الأكاديمية)
            </button>
            <button
              onClick={() => {
                setAuthMode('register');
                setLoginError('');
              }}
              className={`py-3 rounded-xl text-sm font-black transition uppercase ${
                authMode === 'register'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              تسجيل بطل جديد (انضم إلينا)
            </button>
          </div>

          {loginError && (
            <div className="bg-rose-950/50 border-2 border-rose-600 text-rose-300 p-4 rounded-xl text-center font-bold text-sm mb-6">
              {loginError}
            </div>
          )}

          {authMode === 'login' ? (
            /* LOGIN FORM */
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-black text-sky-400 uppercase tracking-wider mb-2">
                  Hero Code (كود البطل الفريد)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="مثال: AG-3849"
                    className="w-full bg-white/5 border-2 border-gray-700 focus:border-sky-500 text-white uppercase rounded-xl p-4 font-mono font-bold outline-none transition text-right"
                    value={loginForm.code}
                    onChange={e => setLoginForm(prev => ({ ...prev, code: e.target.value }))}
                  />
                  <Shield className="absolute left-4 top-4 text-gray-500 w-5 h-5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-sky-400 uppercase tracking-wider mb-2">
                  Password (كلمة المرور)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="أدخل كلمة مرور بوابتك"
                    className="w-full bg-white/5 border-2 border-gray-700 focus:border-sky-500 text-white rounded-xl p-4 font-bold outline-none transition text-right"
                    value={loginForm.password}
                    onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  />
                  <span className="absolute left-4 top-4 text-gray-500 font-bold">🔑</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingLogin}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-4 rounded-xl shadow-[0_4px_20px_rgba(226,54,54,0.4)] hover:shadow-[0_4px_25px_rgba(226,54,54,0.6)] transform hover:translate-y-[-2px] transition active:translate-y-0 text-xl tracking-wide uppercase flex justify-center items-center gap-2"
              >
                {isSubmittingLogin ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    VERIFYING ALLIANCE...
                  </>
                ) : (
                  <>
                    الدخول للتحالف <Zap className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="block text-xs font-black text-sky-400 uppercase tracking-wider mb-2">
                  Student Full Name (الاسم ثلاثي بالكامل)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="أدخل اسمك بالكامل باللغة العربية"
                    className="w-full bg-white/5 border-2 border-gray-700 focus:border-sky-500 text-white rounded-xl p-4 font-bold outline-none transition text-right"
                    value={loginForm.name}
                    onChange={e => setLoginForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <User className="absolute left-4 top-4 text-gray-500 w-5 h-5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-sky-400 uppercase tracking-wider mb-2">
                  Parent Phone Number (رقم الهاتف للتواصل)
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    placeholder="رقم هاتف ولي الأمر للتواصل والتقارير"
                    className="w-full bg-white/5 border-2 border-gray-700 focus:border-sky-500 text-white rounded-xl p-4 font-bold outline-none transition text-right"
                    value={loginForm.phone}
                    onChange={e => setLoginForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                  <Smartphone className="absolute left-4 top-4 text-gray-500 w-5 h-5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-sky-400 uppercase tracking-wider mb-2">
                  Password (كلمة المرور الخاصة بك)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="اختر كلمة مرور قوية لتأمين حسابك"
                    className="w-full bg-white/5 border-2 border-gray-700 focus:border-sky-500 text-white rounded-xl p-4 font-bold outline-none transition text-right"
                    value={loginForm.password}
                    onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  />
                  <span className="absolute left-4 top-4 text-gray-500 font-bold">🔑</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-sky-400 uppercase tracking-wider mb-2">
                    Class (الصف الدراسي)
                  </label>
                  <div className="relative">
                    <select
                      required
                      className="w-full bg-black border-2 border-gray-700 focus:border-sky-500 text-white rounded-xl p-4 font-bold outline-none transition cursor-pointer appearance-none text-right"
                      value={loginForm.className}
                      onChange={e => setLoginForm(prev => ({ ...prev, className: e.target.value }))}
                    >
                      <option value="" disabled className="text-gray-400">اختر الصف...</option>
                      <optgroup label="المرحلة الإعدادية" className="text-gray-900 bg-white">
                        <option value="الصف الأول الإعدادي">الصف الأول الإعدادي</option>
                        <option value="الصف الثاني الإعدادي">الصف الثاني الإعدادي</option>
                        <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
                      </optgroup>
                      <optgroup label="المرحلة الثانوية" className="text-gray-900 bg-white">
                        <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                        <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                        <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                      </optgroup>
                    </select>
                    <GraduationCap className="absolute left-4 top-4 text-gray-500 w-5 h-5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-sky-400 uppercase tracking-wider mb-2">
                    Group / Day (المجموعة)
                  </label>
                  <div className="relative">
                    <select
                      required
                      className="w-full bg-black border-2 border-gray-700 focus:border-sky-500 text-white rounded-xl p-4 font-bold outline-none transition cursor-pointer appearance-none text-right"
                      value={loginForm.groupName}
                      onChange={e => setLoginForm(prev => ({ ...prev, groupName: e.target.value }))}
                    >
                      <option value="" disabled className="text-gray-400">اختر اليوم...</option>
                      <option value="السبت" className="text-gray-900 bg-white">السبت</option>
                      <option value="الأحد" className="text-gray-900 bg-white">الأحد</option>
                      <option value="الإثنين" className="text-gray-900 bg-white">الإثنين</option>
                      <option value="الثلاثاء" className="text-gray-900 bg-white">الثلاثاء</option>
                      <option value="الأربعاء" className="text-gray-900 bg-white">الأربعاء</option>
                      <option value="الخميس" className="text-gray-900 bg-white">الخميس</option>
                      <option value="الجمعة" className="text-gray-900 bg-white">الجمعة</option>
                    </select>
                    <Users className="absolute left-4 top-4 text-gray-500 w-5 h-5" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingLogin}
                className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black py-4 rounded-xl shadow-[0_4px_20px_rgba(14,165,233,0.4)] hover:shadow-[0_4px_25px_rgba(14,165,233,0.6)] transform hover:translate-y-[-2px] transition active:translate-y-0 text-xl tracking-wide uppercase flex justify-center items-center gap-2"
              >
                {isSubmittingLogin ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    GENERATING CODE...
                  </>
                ) : (
                  <>
                    إنشاء حساب جديد فريد <Sparkles className="w-5 h-5 text-yellow-300" />
                  </>
                )}
              </button>
            </form>
          )}

        </div>

        {/* CELEBRATORY REGISTER SUCCESS MODAL (MARVEL ID CARD / LICENSE CARD) */}
        <AnimatePresence>
          {newlyRegisteredStudent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 overflow-y-auto bg-black/95 backdrop-blur-lg flex items-center justify-center p-4"
            >
              <div className="w-full max-w-xl bg-gradient-to-b from-gray-900 to-black border-4 border-yellow-400 shadow-[0_0_50px_rgba(234,179,8,0.4)] rounded-3xl p-6 md:p-8 relative text-center">
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-black font-sans font-black px-6 py-2 rounded-xl text-lg shadow-md border-4 border-black">
                  WELCOME TO THE INITIATIVE
                </div>

                <div className="mt-6 mb-6">
                  <div className="inline-flex p-4 rounded-full bg-yellow-400/10 border-2 border-yellow-400 text-yellow-300 mb-4 animate-bounce">
                    <Trophy className="w-12 h-12" />
                  </div>
                  <h3 className="text-3xl font-black text-white italic tracking-tight">
                    CONGRATULATIONS, AGENT!
                  </h3>
                  <p className="text-sm font-bold text-gray-400 mt-1">
                    تم إنشاء هويتك السرية الخارقة في أكاديمية مستر أحمد جمال. يرجى الاحتفاظ ببيانات البوابة التالية بعناية فائقة للدخول مستقبلاً:
                  </p>
                </div>

                {/* THE MARVEL LICENSE TICKET DISPLAY */}
                <div className="bg-yellow-400 text-black p-6 rounded-2xl border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] text-right space-y-4 mb-6 relative overflow-hidden">
                  <div className="absolute top-2 left-2 text-black opacity-15 font-sans font-black text-6xl select-none uppercase tracking-tighter">
                    AVENGERS
                  </div>
                  
                  <div className="border-b-2 border-black/20 pb-2 mb-2 flex items-center justify-between">
                    <span className="font-sans font-black text-xs uppercase tracking-wider">HERO IDENTITY LICENSE</span>
                    <span className="text-xs font-black bg-black text-yellow-400 px-2 py-0.5 rounded">LEVEL: 01</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider block text-black/50">Agent Name (الاسم)</span>
                      <span className="text-lg font-black block text-black">{newlyRegisteredStudent.name}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider block text-black/50">Unique Portal Code (كود الدخول الفريد)</span>
                        <span className="text-xl font-mono font-black block text-red-600 tracking-wider">
                          {newlyRegisteredStudent.code}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider block text-black/50">Secure Password (كلمة المرور)</span>
                        <span className="text-xl font-mono font-black block text-black tracking-wider">
                          {newlyRegisteredStudent.password}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-black/15">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider block text-black/50">Assigned Classroom (الصف)</span>
                        <span className="text-xs font-black block text-black/80">{newlyRegisteredStudent.className}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider block text-black/50">Assigned Group (المجموعة)</span>
                        <span className="text-xs font-black block text-black/80">{newlyRegisteredStudent.groupName}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-rose-950/40 border border-rose-900/60 p-4 rounded-xl mb-6 text-rose-300 text-xs font-bold leading-relaxed text-right">
                  ⚠️ **تنبيه هام جداً:** التقط لقطة شاشة (Screenshot) أو احفظ كود البطل وكلمة المرور في مكان آمن. لن تتمكن من الدخول للمحاضرات أو الاختبارات بدونهما!
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`الاسم: ${newlyRegisteredStudent.name}\nكود الدخول: ${newlyRegisteredStudent.code}\nكلمة المرور: ${newlyRegisteredStudent.password}`);
                      alert("تم نسخ بيانات الدخول بنجاح لحافظتك!");
                    }}
                    className="flex-1 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white font-black py-3 rounded-xl transition uppercase text-sm"
                  >
                    نسخ البيانات 📋
                  </button>
                  <button
                    onClick={() => {
                      // Login immediately
                      localStorage.setItem('jamal_student', JSON.stringify(newlyRegisteredStudent));
                      setStudent(newlyRegisteredStudent);
                      setSelectedAvatar('spiderman');
                      setNewlyRegisteredStudent(null);
                      setAuthMode('login');
                      fetchStudentData(newlyRegisteredStudent.code, newlyRegisteredStudent.className);
                    }}
                    className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-black border-2 border-black font-black py-3 rounded-xl shadow-md transition uppercase text-sm"
                  >
                    انطلق لبوابة التدريب 🚀
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LEGACY STUDENT SECURITY PASSWORD ASSIGNMENT UPGRADE MODAL */}
        <AnimatePresence>
          {legacyStudentNeedPassword && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 overflow-y-auto bg-black/95 backdrop-blur-lg flex items-center justify-center p-4"
            >
              <div className="w-full max-w-md bg-gradient-to-b from-gray-900 to-black border-4 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.4)] rounded-3xl p-6 md:p-8 text-center">
                <div className="inline-flex p-4 rounded-full bg-red-500/10 border-2 border-red-500 text-red-400 mb-4 animate-pulse">
                  <Shield className="w-12 h-12" />
                </div>
                
                <h3 className="text-2xl font-black text-white italic mb-2">SECURITY PROTOCOLS INITIATED</h3>
                <p className="text-sm font-bold text-gray-400 leading-relaxed mb-6">
                  مرحباً بك مجدداً يا بطل الأكاديمية العريق! نظراً لتحديث أنظمة الأمان بالأكاديمية المشفرة وتأمين بيانات الطلاب، يرجى تعيين **كلمة مرور خاصة بك** الآن لتتمكن من حماية حسابك ودرجاتك والولوج بانتظام.
                </p>

                <form onSubmit={handleUpgradeLegacyStudentPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-sky-400 uppercase tracking-wider mb-2 text-right">
                      Define Secure Password (اختر كلمة مرور حسابك)
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        placeholder="أدخل كلمة مرور قوية سهلة الحفظ"
                        className="w-full bg-white/5 border-2 border-gray-700 focus:border-red-500 text-white rounded-xl p-4 font-bold outline-none transition text-right"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                      />
                      <span className="absolute left-4 top-4 text-gray-500">🔑</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-xl shadow-lg transition uppercase text-lg"
                  >
                    حفظ كلمة المرور والدخول 🚀
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      {/* Upper Navigation Rail */}
      <nav className="border-b border-gray-800 bg-black/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="bg-rose-600 border-2 border-white px-3 py-1 rounded shadow-md transform skew-x-[-10deg]">
                <span className="font-sans font-black text-white text-lg tracking-widest">AHMED GAMAL</span>
              </div>
              <span className="hidden md:inline font-bold text-gray-400 text-sm">ENGLISH ACADEMY</span>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <span className="text-xs font-black bg-sky-950 text-sky-400 border border-sky-800 px-3 py-1.5 rounded-lg font-mono">
                {student.code}
              </span>
              <button 
                onClick={onLogout}
                className="bg-red-950/40 text-red-400 border border-red-900/60 hover:bg-red-600 hover:text-white px-4 py-2 rounded-xl text-sm font-black transition"
              >
                LOGOUT
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed right-0 top-20 bottom-0 w-64 bg-black/80 border-l border-gray-800 backdrop-blur-xl flex-col p-6 z-30">
        <div className="space-y-4">
          <h3 className="text-gray-500 font-black text-xs uppercase tracking-widest mb-6 border-b border-gray-800 pb-2">Navigation</h3>
          {[
            { id: 'home', label: 'الرئيسية', icon: Home },
            { id: 'missions', label: 'الاختبارات', icon: BookOpen },
            { id: 'lectures', label: 'المحاضرات', icon: Play },
            { id: 'friday', label: 'فرايداي AI', icon: Zap },
            { id: 'community', label: 'مجتمعنا 💬', icon: Users },
            { id: 'profile', label: 'الملف الشخصي', icon: User }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 py-4 px-4 rounded-xl text-sm font-black transition ${
                  activeTab === tab.id
                    ? 'bg-rose-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}

          <h3 className="text-gray-500 font-black text-xs uppercase tracking-widest mt-10 mb-6 border-b border-gray-800 pb-2">Theme Selection</h3>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => onThemeChange?.('marvel')} className={`p-2 rounded-xl border-2 transition ${currentTheme === 'marvel' ? 'border-rose-500 bg-rose-500/20' : 'border-gray-800 bg-black hover:bg-gray-900'}`}><Palette className="w-5 h-5 text-rose-500 mx-auto"/></button>
            <button onClick={() => onThemeChange?.('space')} className={`p-2 rounded-xl border-2 transition ${currentTheme === 'space' ? 'border-indigo-500 bg-indigo-500/20' : 'border-gray-800 bg-black hover:bg-gray-900'}`}><Sparkles className="w-5 h-5 text-indigo-500 mx-auto"/></button>
            <button onClick={() => onThemeChange?.('matrix')} className={`p-2 rounded-xl border-2 transition ${currentTheme === 'matrix' ? 'border-green-500 bg-green-500/20' : 'border-gray-800 bg-black hover:bg-gray-900'}`}><Cpu className="w-5 h-5 text-green-500 mx-auto"/></button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-black/95 border-t border-gray-800 backdrop-blur-xl z-50">
        <div className="flex justify-around items-center h-20 px-2">
          {[
            { id: 'home', label: 'الرئيسية', icon: Home },
            { id: 'missions', label: 'الاختبارات', icon: BookOpen },
            { id: 'lectures', label: 'المحاضرات', icon: Play },
            { id: 'friday', label: 'فرايداي AI', icon: Zap },
            { id: 'community', label: 'مجتمعنا', icon: Users },
            { id: 'profile', label: 'الملف', icon: User }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition ${
                  activeTab === tab.id
                    ? 'text-rose-500'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-[10px] font-black">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Container Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 lg:pb-8 lg:pr-[18rem]">
        
        {/* Active Exam Overlay Modal */}
        <AnimatePresence>
          {activeQuiz && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 overflow-y-auto bg-black/95 backdrop-blur-lg flex items-center justify-center p-4"
            >
              <div className="w-full max-w-4xl bg-gray-950 border-4 border-rose-600 shadow-[0_0_50px_rgba(226,54,54,0.3)] rounded-2xl p-6 md:p-8 relative">
                
                {/* Header of Active Exam */}
                <div className="flex justify-between items-center border-b-2 border-gray-800 pb-4 mb-6">
                  <div>
                    <span className="text-xs font-black bg-rose-600 text-white px-2 py-1 rounded">
                      ACTIVE MISSION
                    </span>
                    <h3 className="text-2xl md:text-3xl font-black text-white mt-2 italic uppercase">
                      {activeQuiz.quiz_name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3 bg-red-950/40 border border-red-900/60 text-rose-400 px-4 py-2 rounded-xl font-mono text-lg font-black">
                    <Clock className="w-5 h-5 animate-pulse" />
                    {formatTimer(quizTimer)}
                  </div>
                </div>

                {!examSubmittedResult ? (
                  <>
                    {/* Live Progress Bar */}
                    <div className="w-full bg-gray-950 h-3 border border-gray-800 rounded-full mb-8 overflow-hidden">
                      <div 
                        className="bg-rose-600 h-full transition-all duration-300"
                        style={{ width: `${(Object.keys(selectedAnswers).length / quizQuestions.length) * 100}%` }}
                      />
                    </div>

                    {/* Questions loop */}
                    <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                      {quizQuestions.map((q, idx) => (
                        <div key={q.id} className="bg-white/5 border border-gray-800 p-6 rounded-xl relative">
                          <span className="absolute top-4 left-4 font-mono font-black text-gray-600 text-lg">
                            Q{idx + 1}
                          </span>
                          <p className="font-bold text-lg md:text-xl text-white mb-6 pr-12 text-right">
                            {q.question_text}
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                              { label: 'A', text: q.choice_a },
                              { label: 'B', text: q.choice_b },
                              { label: 'C', text: q.choice_c },
                              { label: 'D', text: q.choice_d }
                            ].map(choice => (
                              <button
                                key={choice.label}
                                onClick={() => setSelectedAnswers(prev => ({ ...prev, [q.id]: choice.label }))}
                                className={`text-right p-4 rounded-xl border-2 font-bold transition flex items-center justify-between ${
                                  selectedAnswers[q.id] === choice.label
                                    ? 'bg-rose-950/30 border-rose-500 text-white'
                                    : 'bg-black/40 border-gray-800 hover:border-gray-700 text-gray-300'
                                }`}
                              >
                                <span className="text-sm font-semibold">{choice.text}</span>
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${
                                  selectedAnswers[q.id] === choice.label
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-white/5 text-gray-500'
                                }`}>
                                  {choice.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 pt-4 border-t border-gray-800 flex justify-end gap-4">
                      <button 
                        onClick={() => {
                          if (confirm("هل أنت متأكد من رغبتك في إلغاء الاختبار؟ لن يتم حفظ تقدمك.")) {
                            setActiveQuiz(null);
                          }
                        }}
                        className="bg-gray-900 border border-gray-800 hover:bg-gray-800 text-gray-400 px-6 py-3 rounded-xl font-bold transition"
                      >
                        إلغاء المهمة
                      </button>

                      <button
                        onClick={submitActiveQuiz}
                        disabled={Object.keys(selectedAnswers).length < quizQuestions.length || isSubmittingExam}
                        className="bg-rose-600 hover:bg-rose-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-black px-8 py-3 rounded-xl transition flex items-center gap-2 text-lg shadow-[0_4px_15px_rgba(226,54,54,0.4)]"
                      >
                        {isSubmittingExam ? 'جاري الإرسال...' : 'إنهاء المهمة وتسليم الإجابات'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-10">
                    <div className="inline-flex p-4 rounded-full bg-green-950/50 border-2 border-green-500 text-green-400 mb-6">
                      <Trophy className="w-16 h-16 animate-bounce" />
                    </div>

                    <h4 className="text-4xl font-black text-white italic mb-2 uppercase">
                      VICTORY ACQUIRED!
                    </h4>
                    <p className="text-lg text-gray-400 font-bold mb-6">
                      تم تسجيل وحفظ نتيجتك بنجاح في قاعدة بيانات الأكاديمية المشفرة
                    </p>

                    {/* QR and Score display */}
                    <div className="inline-block bg-white p-4 rounded-2xl mb-6 shadow-[0_0_30px_rgba(14,165,233,0.3)] border-4 border-sky-400">
                      <img src={examSubmittedResult.qrCodeUrl} alt="Verification QR" className="w-48 h-48 mx-auto" />
                      <span className="block mt-2 font-mono text-black font-black text-lg">
                        CODE: {examSubmittedResult.code}
                      </span>
                    </div>

                    <div className="text-5xl font-black text-rose-500 mb-6 font-mono">
                      {examSubmittedResult.score} / {examSubmittedResult.total} PTS
                    </div>

                    <button
                      onClick={() => {
                        setActiveQuiz(null);
                        setExamSubmittedResult(null);
                      }}
                      className="bg-sky-600 hover:bg-sky-500 text-white font-black px-10 py-4 rounded-xl transition text-lg"
                    >
                      العودة للرئيسية
                    </button>
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Shielded Video Player overlay */}
        <AnimatePresence>
          {activeVideo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-2 md:p-6"
            >
              <div className="w-full max-w-5xl">
                <CustomShieldedVideoPlayer
                  url={activeVideo.youtube_url}
                  title={activeVideo.title}
                  onClose={() => setActiveVideo(null)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Detailed Results & Corrections Modal */}
        <AnimatePresence>
          {inspectingResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-6"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-gradient-to-br from-gray-950 to-slate-900 border-4 border-black shadow-[8px_8px_0px_#000] w-full max-w-3xl max-h-[85vh] rounded-2xl flex flex-col overflow-hidden text-right"
              >
                {/* Modal Header */}
                <div className="bg-black/50 border-b border-gray-800 p-5 flex justify-between items-center">
                  <button
                    onClick={() => setInspectingResult(null)}
                    className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white p-2 rounded-lg transition"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <div>
                    <h3 className="font-sans font-black text-white text-xl tracking-wide">
                      {inspectingResult.quiz_name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      تفاصيل الإجابات ومراجعة الأخطاء لتنمية مهارتك
                    </p>
                  </div>
                </div>

                {/* Score Summary Box */}
                <div className="bg-slate-950/40 p-5 border-b border-gray-900 flex flex-col sm:flex-row-reverse sm:items-center sm:justify-between gap-4">
                  <div className="text-right">
                    <span className="text-xs text-gray-500 block">SCORE ACHIEVEMENT</span>
                    <span className="text-3xl font-mono font-black text-rose-500 block">
                      {inspectingResult.score} / {inspectingResult.total_questions} PTS
                    </span>
                    <span className="text-xs text-emerald-400 font-bold block mt-1">
                      نسبة النجاح: {Math.round((inspectingResult.score / inspectingResult.total_questions) * 100)}%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500 block">STUDENT PROFILE</span>
                    <span className="text-sm font-bold text-white block mt-0.5">البطل: {inspectingResult.student_name}</span>
                    <span className="text-xs text-gray-400 block mt-0.5">الكود: {inspectingResult.student_code}</span>
                  </div>
                </div>

                {/* Questions List */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                  {!inspectingResult.answers || inspectingResult.answers.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 font-bold">
                      ⚠️ لم يتم العثور على سجل إجابات تفصيلي لهذا الامتحان. قد يكون هذا الاختبار قد تم تقديمه قبل تفعيل ميزة حفظ الإجابات.
                    </div>
                  ) : (
                    inspectingResult.answers.map((ans: any, qIdx: number) => {
                      const isCorrect = ans.student_answer === ans.correct_answer;
                      return (
                        <div
                          key={qIdx}
                          className={`p-5 rounded-xl border-2 text-right ${
                            isCorrect 
                              ? 'bg-emerald-950/10 border-emerald-900/40 shadow-[4px_4px_0px_#064e3b]' 
                              : 'bg-rose-950/10 border-rose-900/40 shadow-[4px_4px_0px_#881337]'
                          }`}
                        >
                          <div className="flex flex-row-reverse justify-between items-start gap-3 mb-4">
                            <div className="flex-1">
                              <span className="text-xs text-gray-500 font-bold block mb-1">السؤال {qIdx + 1}</span>
                              <h4 className="text-md font-black text-white leading-relaxed">
                                {ans.question_text}
                              </h4>
                            </div>
                            <span className={`px-3 py-1 rounded-lg text-xs font-black border uppercase flex items-center gap-1 shrink-0 ${
                              isCorrect 
                                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60' 
                                : 'bg-rose-950/40 text-rose-400 border-rose-800/60'
                            }`}>
                              {isCorrect ? 'إجابة صحيحة ✓' : 'إجابة خاطئة ✗'}
                            </span>
                          </div>

                          {/* Choices */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                              { label: 'A', text: ans.choice_a },
                              { label: 'B', text: ans.choice_b },
                              { label: 'C', text: ans.choice_c },
                              { label: 'D', text: ans.choice_d }
                            ].map((choice) => {
                              const isChoiceSelected = ans.student_answer === choice.label;
                              const isChoiceCorrect = ans.correct_answer === choice.label;
                              
                              let choiceStyle = 'bg-black/30 border-gray-800 text-gray-300';
                              if (isChoiceCorrect) {
                                choiceStyle = 'bg-emerald-950/30 border-emerald-700/80 text-emerald-300';
                              } else if (isChoiceSelected) {
                                choiceStyle = 'bg-rose-950/30 border-rose-700/80 text-rose-300';
                              }

                              return (
                                <div
                                  key={choice.label}
                                  className={`p-3 rounded-lg border flex items-center justify-between gap-2 text-right ${choiceStyle}`}
                                >
                                  <div className="flex items-center gap-2">
                                    {isChoiceCorrect && (
                                      <span className="bg-emerald-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                                        الصحيحة
                                      </span>
                                    )}
                                    {isChoiceSelected && (
                                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                                        isCorrect ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white'
                                      }`}>
                                        إجابتك
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-sm font-bold flex-1 pr-2">{choice.text}</span>
                                  <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black shrink-0 font-mono ${
                                    isChoiceCorrect 
                                      ? 'bg-emerald-500 text-black' 
                                      : isChoiceSelected 
                                        ? 'bg-rose-500 text-white' 
                                        : 'bg-white/10 text-gray-400'
                                  }`}>
                                    {choice.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="bg-black/40 border-t border-gray-800 p-4 flex justify-center">
                  <button
                    onClick={() => setInspectingResult(null)}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold text-sm px-8 py-2.5 rounded-xl border-2 border-red-500 shadow-[3px_3px_0px_#000] transition cursor-pointer"
                  >
                    إغلاق المراجعة
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard layout with 2 grid columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1: Profile & Progress HUD */}
          <div className="space-y-6">
            
            {/* Hologram teacher portrait */}
            <div className="bg-gradient-to-br from-gray-900 via-black to-slate-950 border-4 border-sky-500 rounded-2xl p-6 relative overflow-hidden shadow-[0_0_30px_rgba(14,165,233,0.2)]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl" />

              <div className="text-center relative">
                <span className="text-xs font-black text-sky-400 bg-sky-950 border border-sky-800 px-3 py-1 rounded-lg uppercase tracking-widest inline-block mb-4">
                  Academy Commander
                </span>
                
                {/* Visual Avatar frame for Mr. Ahmed Gamal */}
                <div className="w-32 h-32 rounded-full border-4 border-dashed border-sky-500 mx-auto flex items-center justify-center relative p-1 mb-4 bg-sky-950/20 shadow-[0_0_20px_rgba(14,165,233,0.4)]">
                  {!teacherAvatarError ? (
                    <img
                      src="/teacher.png"
                      alt="Mr. Ahmed Gamal"
                      onError={() => setTeacherAvatarError(true)}
                      className="w-full h-full rounded-full object-cover border border-sky-500/50"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-sky-600 to-rose-600 flex items-center justify-center text-white text-4xl font-black italic">
                      AG
                    </div>
                  )}
                  <Sparkles className="absolute -top-1 -right-1 text-yellow-300 w-6 h-6 animate-bounce" />
                </div>

                <h3 className="text-2xl font-black tracking-tight text-white italic uppercase">
                  Mr. Ahmed Gamal
                </h3>
                <p className="text-sm font-bold text-gray-400 mt-1 italic">
                  "The Multiverse of English language"
                </p>

                {/* Motivational Quote */}
                <div className="mt-6 bg-white/5 border border-gray-800 p-4 rounded-xl text-center">
                  <p className="text-xs font-bold text-gray-300 leading-relaxed text-right">
                    "قوة الكلمات هي القوة الخارقة الأشد تأثيراً في الكون. ثق بنفسك يا بطل، وتدرب جيداً في أكاديميتنا لتصنع مستقبلك الخاص!"
                  </p>
                </div>
                
                <button
                  onClick={() => setShowMessageModal(true)}
                  className="mt-4 w-full flex justify-center items-center gap-2 bg-rose-600/20 border border-rose-500/50 hover:bg-rose-600/40 text-rose-300 font-bold py-3 rounded-xl transition"
                >
                  <MessageCircle className="w-4 h-4" /> إرسال رسالة للقائد
                </button>
              </div>
            </div>

            {/* Teacher Message Modal */}
            <AnimatePresence>
              {showMessageModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-gray-900 border border-gray-700 rounded-3xl p-6 w-full max-w-md shadow-2xl"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black text-white">إرسال رسالة لمستر أحمد</h3>
                      <button onClick={() => setShowMessageModal(false)} className="text-gray-400 hover:text-white">
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    <form onSubmit={handleSendTeacherMessage} className="space-y-4 text-right">
                      <textarea
                        required
                        className="w-full bg-black border border-gray-700 focus:border-rose-500 rounded-xl p-4 text-white resize-none"
                        rows={4}
                        placeholder="اكتب رسالتك هنا... (اقتراح، شكر، شكوى، مشكلة)"
                        value={messageText}
                        onChange={e => setMessageText(e.target.value)}
                      />
                      <div className="flex items-center gap-3 justify-end bg-black/50 p-3 rounded-xl border border-gray-800">
                        <label htmlFor="anonymous" className="text-sm text-gray-300 font-bold cursor-pointer select-none">إرسال بشكل مجهول (بدون اسم)</label>
                        <input
                          id="anonymous"
                          type="checkbox"
                          className="w-5 h-5 accent-rose-500 cursor-pointer"
                          checked={isAnonymousMessage}
                          onChange={e => setIsAnonymousMessage(e.target.checked)}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSendingMessage}
                        className="w-full bg-rose-600 hover:bg-rose-500 disabled:bg-gray-700 text-white font-black py-4 rounded-xl text-lg transition"
                      >
                        {isSendingMessage ? 'جاري الإرسال...' : 'إرسال الرسالة'}
                      </button>
                    </form>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Student statistics panel */}
            <div className="bg-black/60 border border-gray-800 backdrop-blur-md rounded-2xl p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <h4 className="font-sans font-black text-white text-lg tracking-wider uppercase">
                  AGENT DOSSIER
                </h4>
                <Shield className="w-5 h-5 text-sky-400" />
              </div>

              {/* Dynamic Marvel Avatar Icon Frame */}
              <div className="flex items-center gap-4 bg-white/5 border border-gray-800 p-3 rounded-2xl">
                <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-3xl shadow-lg ${
                  selectedAvatar === 'ironman' ? 'bg-red-700 text-yellow-300 border-yellow-500 shadow-[0_0_15px_#eab308]' :
                  selectedAvatar === 'captainamerica' ? 'bg-blue-600 text-white border-white shadow-[0_0_15px_#2563eb]' :
                  selectedAvatar === 'thor' ? 'bg-cyan-600 text-white border-gray-400 shadow-[0_0_15px_#06b6d4]' :
                  selectedAvatar === 'blackwidow' ? 'bg-gray-950 text-red-500 border-red-600 shadow-[0_0_15px_#ef4444]' :
                  selectedAvatar === 'hulk' ? 'bg-green-600 text-purple-300 border-purple-600 shadow-[0_0_15px_#22c55e]' :
                  selectedAvatar === 'doctorstrange' ? 'bg-amber-700 text-cyan-200 border-cyan-400 shadow-[0_0_15px_#b45309]' :
                  'bg-red-600 text-white border-blue-600 shadow-[0_0_15px_#ef4444]' // spiderman default
                }`}>
                  {selectedAvatar === 'ironman' ? '🦾' :
                   selectedAvatar === 'captainamerica' ? '🛡️' :
                   selectedAvatar === 'thor' ? '⚡' :
                   selectedAvatar === 'blackwidow' ? '🕷️' :
                   selectedAvatar === 'hulk' ? '🟢' :
                   selectedAvatar === 'doctorstrange' ? '🔮' :
                   '🕸️'}
                </div>
                <div>
                  <span className="text-xs font-black text-gray-500 block">SELECTED SUIT / HERO</span>
                  <span className="text-sm font-black text-white uppercase block">
                    {selectedAvatar === 'ironman' ? 'IRON MAN' :
                     selectedAvatar === 'captainamerica' ? 'CAPTAIN AMERICA' :
                     selectedAvatar === 'thor' ? 'THOR ODINSON' :
                     selectedAvatar === 'blackwidow' ? 'BLACK WIDOW' :
                     selectedAvatar === 'hulk' ? 'BRUCE BANNER / HULK' :
                     selectedAvatar === 'doctorstrange' ? 'DOCTOR STRANGE' :
                     'SPIDER-MAN'}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-xs font-black text-gray-500 uppercase block mb-1">Agent name</span>
                  <span className="text-lg font-bold text-white block uppercase">{student.name}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-black text-gray-500 uppercase block mb-1">Assigned group</span>
                    <span className="text-sm font-bold text-gray-300 block">{student.groupName}</span>
                  </div>
                  <div>
                    <span className="text-xs font-black text-gray-500 uppercase block mb-1">Classroom</span>
                    <span className="text-sm font-bold text-gray-300 block">{student.className}</span>
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-black text-gray-500 uppercase">Alliance Level</span>
                    <span className="text-xs font-black text-sky-400">{student.totalScore || 0} Cumulative PTS</span>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-full h-3.5 overflow-hidden p-[2px]">
                    <div 
                      className="bg-gradient-to-r from-sky-500 to-rose-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(((student.totalScore || 0) / 150) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Badges Display */}
            <div className="bg-black/60 border border-gray-800 backdrop-blur-md rounded-2xl p-6">
              <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-4">
                <h4 className="font-sans font-black text-white text-lg tracking-wider uppercase">
                  ACHIEVED BADGES
                </h4>
                <Award className="w-5 h-5 text-yellow-500" />
              </div>

              <div className="flex items-center gap-4 bg-white/5 border border-gray-800 p-4 rounded-xl">
                <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl text-rose-400 font-sans font-black text-2xl">
                  🎖️
                </div>
                <div>
                  <span className={`text-md font-black ${currentLevelInfo.color} block`}>
                    {currentLevelInfo.badge}
                  </span>
                  <span className="text-xs font-bold text-gray-400 block mt-1">
                    {currentLevelInfo.desc}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Column 2 & 3: Content area with custom Tabs */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Tab view renders */}
            <div>
              {activeTab === 'home' && (
                <div className="space-y-6">
                  
                  {/* Dashboard Welcome Banner */}
                  <div className="bg-gradient-to-r from-rose-950/40 via-sky-950/20 to-black border-2 border-rose-600 p-6 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-24 h-24 bg-rose-600/10 rounded-full blur-xl" />
                    
                    <h3 className="text-3xl font-black text-white italic tracking-tight uppercase mb-2">
                      WELCOME BACK, AGENT
                    </h3>
                    <p className="text-sm font-bold text-gray-300 max-w-xl">
                      مرحباً بك في غرفة عمليات أكاديمية مستر أحمد جمال. كافة المهام والملفات جاهزة ومؤمنة في قطاع العمليات الخاص بك.
                    </p>
                  </div>

                  {/* Dynamic statistics overview cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-black/60 border border-gray-800 p-5 rounded-2xl text-center">
                      <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                      <span className="text-xs font-black text-gray-500 uppercase block">Completed Exams</span>
                      <span className="text-3xl font-black text-white mt-1 block">
                        {studentResults.length}
                      </span>
                    </div>

                    <div className="bg-black/60 border border-gray-800 p-5 rounded-2xl text-center">
                      <BookOpen className="w-8 h-8 text-sky-400 mx-auto mb-2" />
                      <span className="text-xs font-black text-gray-500 uppercase block">Active Exams</span>
                      <span className="text-3xl font-black text-white mt-1 block">
                        {quizzes.length}
                      </span>
                    </div>

                    <div className="bg-black/60 border border-gray-800 p-5 rounded-2xl text-center">
                      <Play className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                      <span className="text-xs font-black text-gray-500 uppercase block">Training Lectures</span>
                      <span className="text-3xl font-black text-white mt-1 block">
                        {videos.length}
                      </span>
                    </div>
                  </div>

                  {/* Past attempts log */}
                  <div className="bg-black/60 border border-gray-800 rounded-2xl p-6">
                    <h4 className="font-sans font-black text-white text-lg tracking-wider mb-4 border-b border-gray-800 pb-3">
                      MISSION LOGS (HISTORY)
                    </h4>

                    {studentResults.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 font-bold text-sm">
                        لم تقم بأداء أي مهام بعد. انطلق إلى قطاع الاختبارات لإثبات قوتك!
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {studentResults.map((r: any, idx) => {
                          const submissionTime = r.submittedAt ? new Date(r.submittedAt).getTime() : 0;
                          const currentTime = new Date().getTime();
                          const thirtyMinutesInMs = 30 * 60 * 1000;
                          const timePassed = currentTime - submissionTime;
                          const isEligible = timePassed >= thirtyMinutesInMs;
                          const remainingMin = Math.ceil((thirtyMinutesInMs - timePassed) / (60 * 1000));

                          return (
                            <div key={idx} className="bg-white/5 border border-gray-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="text-right">
                                <span className="text-md font-bold text-white block">{r.quiz_name}</span>
                                <span className="text-xs text-gray-500 block mt-1">
                                  {r.submittedAt ? new Date(r.submittedAt).toLocaleString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {isEligible ? (
                                  <button
                                    onClick={() => setInspectingResult(r)}
                                    className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg border border-sky-500 transition cursor-pointer flex items-center gap-1"
                                  >
                                    <Eye className="w-3 h-3" />
                                    عرض الإجابات والتصحيح
                                  </button>
                                ) : (
                                  <span className="bg-gray-900 border border-gray-800 text-gray-400 font-bold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 animate-pulse text-yellow-500" />
                                    متاح بعد {remainingMin} د
                                  </span>
                                )}
                                <span className="bg-rose-950/40 border border-rose-900/60 text-rose-400 px-3 py-1.5 rounded-lg font-mono font-black text-xs">
                                  {r.score} / {r.total_questions} PTS
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              )}

              {activeTab === 'missions' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="font-sans font-black text-white text-2xl tracking-wider">
                      ACTIVE MISSIONS (EXAMS)
                    </h4>
                  </div>

                  {quizzes.length === 0 ? (
                    <div className="bg-black/60 border border-gray-800 p-12 rounded-2xl text-center text-gray-500 font-bold">
                      لا توجد اختبارات نشطة في الوقت الحالي لصفك الدراسي. استرخِ وتأهب للمهام القادمة!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {quizzes.map((quiz: any) => {
                        const alreadyDone = studentResults.some(r => r.quiz_id === quiz.id);
                        return (
                          <div key={quiz.id} className="bg-black/60 border border-gray-800 hover:border-sky-500 p-6 rounded-2xl transition">
                            <span className="text-xs font-black bg-sky-950 text-sky-400 border border-sky-800 px-2 py-1 rounded mb-3 inline-block">
                              EXAM PORTAL
                            </span>
                            <h5 className="text-xl font-black text-white mb-2">{quiz.quiz_name}</h5>
                            <span className="text-xs font-bold text-gray-500 block mb-6">{quiz.class_name}</span>

                            <button
                              disabled={alreadyDone}
                              onClick={() => launchExam(quiz)}
                              className={`w-full py-3.5 rounded-xl font-black transition text-center flex justify-center items-center gap-2 ${
                                alreadyDone
                                  ? 'bg-green-950/40 border border-green-900/60 text-green-400'
                                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-md'
                              }`}
                            >
                              {alreadyDone ? (
                                <>مكتملة بنجاح ✓</>
                              ) : (
                                <>LAUNCH EXAM <Zap className="w-4 h-4" /></>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'lectures' && (
                <div className="space-y-6">
                  <h4 className="font-sans font-black text-white text-2xl tracking-wider">
                    TRAINING GROUND (LECTURES)
                  </h4>

                  {videos.length === 0 ? (
                    <div className="bg-black/60 border border-gray-800 p-12 rounded-2xl text-center text-gray-500 font-bold">
                      لا توجد محاضرات تدريبية مرفوعة حالياً لصفك الدراسي.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {videos.map((video: any) => (
                        <div key={video.id} className="bg-black/60 border border-gray-800 hover:border-rose-500 p-5 rounded-2xl transition flex flex-col justify-between">
                          <div>
                            <span className="text-xs font-black bg-rose-950 text-rose-400 border border-rose-900/60 px-2.5 py-1 rounded mb-3 inline-block uppercase font-mono">
                              MISSION VIDEO
                            </span>
                            <h5 className="text-lg font-black text-white mb-4 line-clamp-2">{video.title}</h5>
                          </div>
                          <button
                            onClick={() => setActiveVideo(video)}
                            className="w-full bg-white text-black hover:bg-gray-200 py-3 rounded-xl font-black transition flex items-center justify-center gap-2"
                          >
                            <Play className="w-4 h-4 fill-black text-black" /> تشغيل المحاضرة
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'friday' && (
                <div className="bg-black/60 border border-gray-800 rounded-2xl h-[65vh] flex flex-col overflow-hidden">
                  
                  {/* Chat Assistant Header */}
                  <div className="bg-gray-950 p-4 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-sky-950/50 border border-sky-800 text-sky-400 rounded-xl">
                        <Cpu className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <span className="text-md font-black text-white block">F.R.I.D.A.Y. AI Assistant</span>
                        <span className="text-xs font-bold text-sky-400 block mt-0.5">English Language Specialist</span>
                      </div>
                    </div>
                  </div>

                  {/* Messages container */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {chatMessages.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`flex gap-3 max-w-[85%] ${
                          msg.role === 'user' ? 'mr-auto flex-row-reverse' : 'ml-auto'
                        }`}
                      >
                        <div className={`p-4 rounded-2xl font-bold leading-relaxed ${
                          msg.role === 'user' 
                            ? 'bg-rose-600 text-white rounded-tr-none text-right' 
                            : 'bg-white/5 border border-gray-800 text-gray-200 rounded-tl-none text-right'
                        }`}>
                          <p className="whitespace-pre-wrap text-sm md:text-base">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="flex gap-3 max-w-[80%] ml-auto">
                        <div className="bg-white/5 border border-gray-800 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                          <span className="w-2.5 h-2.5 bg-sky-500 rounded-full animate-bounce"></span>
                          <span className="w-2.5 h-2.5 bg-sky-500 rounded-full animate-bounce delay-150"></span>
                          <span className="w-2.5 h-2.5 bg-sky-500 rounded-full animate-bounce delay-300"></span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat input form */}
                  <form onSubmit={handleSendChatMessage} className="p-4 bg-gray-950 border-t border-gray-800 flex gap-2">
                    <input
                      type="text"
                      className="flex-1 bg-white/5 border-2 border-gray-800 focus:border-sky-500 text-white font-bold p-3 rounded-xl outline-none transition text-right"
                      placeholder="اسأل فرايداي عن القواعد، الترجمة، أو حل الواجب..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="bg-sky-600 hover:bg-sky-500 p-3 rounded-xl text-white font-black transition flex items-center justify-center shadow-lg"
                    >
                      <Send className="w-5 h-5 transform rotate-180" />
                    </button>
                  </form>

                </div>
              )}

              {activeTab === 'profile' && (
                <div className="space-y-8">
                  {/* HERO SUIT SELECTION (AVATAR) */}
                  <div className="bg-gradient-to-br from-gray-950 to-slate-900 border-4 border-black shadow-[6px_6px_0px_#000] p-6 rounded-2xl">
                    <div className="border-b-2 border-gray-800 pb-3 mb-4 text-right">
                      <h4 className="font-sans font-black text-white text-xl tracking-wider">
                        CHOOSE YOUR MARVEL SUIT (اختر مظهرك الخارق)
                      </h4>
                      <p className="text-xs font-bold text-gray-500 mt-1">
                        تغيير الشخصية يمنحك طابعاً بصرياً فريداً داخل الأكاديمية وصحيفة الإنجازات
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { id: 'spiderman', emoji: '🕸️', nameAr: 'سبايدرمان', color: 'border-red-500 hover:border-red-400 bg-red-950/20' },
                        { id: 'ironman', emoji: '🦾', nameAr: 'آيرون مان', color: 'border-yellow-500 hover:border-yellow-400 bg-yellow-950/20' },
                        { id: 'captainamerica', emoji: '🛡️', nameAr: 'كابتن أمريكا', color: 'border-blue-500 hover:border-blue-400 bg-blue-950/20' },
                        { id: 'thor', emoji: '⚡', nameAr: 'ثور أودينسون', color: 'border-cyan-500 hover:border-cyan-400 bg-cyan-950/20' },
                        { id: 'blackwidow', emoji: '🕷️', nameAr: 'الأرملة السوداء', color: 'border-rose-700 hover:border-rose-600 bg-rose-950/10' },
                        { id: 'hulk', emoji: '🟢', nameAr: 'هالك المدمر', color: 'border-green-500 hover:border-green-400 bg-green-950/20' },
                        { id: 'doctorstrange', emoji: '🔮', nameAr: 'دكتور سترينج', color: 'border-amber-600 hover:border-amber-500 bg-amber-950/20' }
                      ].map(hero => (
                        <button
                          key={hero.id}
                          onClick={() => handleSelectAvatar(hero.id)}
                          className={`p-3 rounded-xl border-2 font-black transition flex flex-col items-center gap-1.5 ${hero.color} ${
                            selectedAvatar === hero.id
                              ? 'bg-rose-600/30 border-rose-500 scale-105 shadow-lg shadow-rose-500/10'
                              : 'bg-black/40 border-gray-800 text-gray-400'
                          }`}
                        >
                          <span className="text-3xl">{hero.emoji}</span>
                          <span className="text-xs text-white mt-1">{hero.nameAr}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* PLATFORM THEME SELECTION */}
                  <div className="bg-gradient-to-br from-gray-950 to-slate-900 border-4 border-black shadow-[6px_6px_0px_#000] p-6 rounded-2xl lg:hidden">
                    <div className="border-b-2 border-gray-800 pb-3 mb-4 text-right">
                      <h4 className="font-sans font-black text-white text-xl tracking-wider">
                        PLATFORM THEME (سمة المنصة)
                      </h4>
                      <p className="text-xs font-bold text-gray-500 mt-1">
                        اختر السمة البصرية والخلفية المتحركة للمنصة
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <button onClick={() => onThemeChange?.('marvel')} className={`p-4 rounded-xl border-2 font-black transition flex flex-col justify-center items-center gap-2 ${currentTheme === 'marvel' ? 'border-rose-500 bg-rose-500/20 text-rose-500' : 'border-gray-800 bg-black hover:bg-gray-900 text-gray-500'}`}><Palette className="w-8 h-8"/>مارفل</button>
                      <button onClick={() => onThemeChange?.('space')} className={`p-4 rounded-xl border-2 font-black transition flex flex-col justify-center items-center gap-2 ${currentTheme === 'space' ? 'border-indigo-500 bg-indigo-500/20 text-indigo-500' : 'border-gray-800 bg-black hover:bg-gray-900 text-gray-500'}`}><Sparkles className="w-8 h-8"/>فضاء</button>
                      <button onClick={() => onThemeChange?.('matrix')} className={`p-4 rounded-xl border-2 font-black transition flex flex-col justify-center items-center gap-2 ${currentTheme === 'matrix' ? 'border-green-500 bg-green-500/20 text-green-500' : 'border-gray-800 bg-black hover:bg-gray-900 text-gray-500'}`}><Cpu className="w-8 h-8"/>ماتريكس</button>
                    </div>
                  </div>

                  {/* MARVEL POWER GRID & ANALYTICS */}
                  <div className="bg-gradient-to-br from-gray-950 to-slate-900 border-4 border-black shadow-[6px_6px_0px_#000] p-6 rounded-2xl">
                    <div className="border-b-2 border-gray-800 pb-3 mb-6 text-right">
                      <span className="text-xs font-black bg-cyan-950 text-cyan-400 border border-sky-800 px-3 py-1.5 rounded uppercase font-mono inline-block">
                        LEVEL 1 MULTIVERSE
                      </span>
                      <h4 className="font-sans font-black text-white text-xl tracking-wider mt-2">
                        MARVEL COMBAT STATS (مؤشرات قوتك اللغوية الستة)
                      </h4>
                      <p className="text-xs font-bold text-gray-500">
                        مستوى قتالك الأكاديمي يتم حسابه بدقة بناءً على نشاطك في الدردشة وأدائك الفعلي في الاختبارات اليومية
                      </p>
                    </div>

                    {/* Six Powers Grid */}
                    <div className="space-y-4">
                      {[
                        {
                          name: 'Grammar Strike (قوة الهجوم القواعدي)',
                          pct: Math.min(25 + (student.totalScore || 0) * 1.5, 98),
                          color: 'bg-red-600',
                          icon: '🎯'
                        },
                        {
                          name: 'Vocabulary Shield (درع المفردات والمعاني)',
                          pct: Math.min(30 + studentResults.length * 15, 95),
                          color: 'bg-yellow-500',
                          icon: '📚'
                        },
                        {
                          name: 'Response Velocity (سرعة رد فعل الإجابات)',
                          pct: studentResults.length > 0 ? 88 : 40,
                          color: 'bg-cyan-500',
                          icon: '⚡'
                        },
                        {
                          name: 'Battle Resilience (الصمود والالتزام اليومي)',
                          pct: Math.min(45 + studentResults.length * 8, 92),
                          color: 'bg-green-500',
                          icon: '🛡️'
                        },
                        {
                          name: 'Friday AI Synergy (تحالف الذكاء الاصطناعي)',
                          pct: chatMessages.length > 2 ? 90 : 50,
                          color: 'bg-purple-500',
                          icon: '🤖'
                        },
                        {
                          name: 'Total Alliance Victory (نسبة التفوق العام)',
                          pct: studentResults.length > 0 ? Math.round((studentResults.reduce((acc, r) => acc + (r.score / r.total_questions), 0) / studentResults.length) * 100) : 50,
                          color: 'bg-rose-500',
                          icon: '🏆'
                        }
                      ].map((power, idx) => (
                        <div key={idx} className="bg-black/40 border border-gray-800/80 p-3 rounded-xl">
                          <div className="flex justify-between items-center mb-1.5 text-right">
                            <span className="text-xs font-black text-gray-400 font-mono">
                              {power.pct}% POW
                            </span>
                            <span className="text-xs font-black text-gray-200 flex items-center gap-1">
                              {power.icon} {power.name}
                            </span>
                          </div>
                          <div className="w-full bg-gray-950 h-3 rounded-full overflow-hidden p-[2px] border border-gray-800">
                            <div
                              className={`${power.color} h-full rounded-full transition-all duration-700 shadow-inner`}
                              style={{ width: `${power.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PAST EXAM RESULTS SHEET */}
                  <div className="bg-gradient-to-br from-gray-950 to-slate-900 border-4 border-black shadow-[6px_6px_0px_#000] p-6 rounded-2xl">
                    <div className="border-b-2 border-gray-800 pb-3 mb-6 text-right">
                      <h4 className="font-sans font-black text-white text-xl tracking-wider">
                        MISSION ARCHIVES (سجل درجاتك ومعاركك السابقة)
                      </h4>
                      <p className="text-xs font-bold text-gray-500 mt-1">
                        جميع نتائج المهام التي سلمتها بنجاح لمستر أحمد جمال
                      </p>
                    </div>

                    {studentResults.length === 0 ? (
                      <div className="bg-black/60 border border-gray-800/80 p-8 rounded-xl text-center text-gray-500 font-bold">
                        لم تخض أي اختبارات قتالية بعد! اذهب لعلامة تبويب "الاختبارات" لتسجيل انتصارك الأول.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {studentResults.map((r) => {
                          const percentage = Math.round((r.score / r.total_questions) * 100);
                          let reaction = 'CRASH! KEEP TRAINING 💥';
                          let reactionColor = 'bg-red-950/40 text-red-400 border-red-900/60';
                          if (percentage >= 95) {
                            reaction = 'WHAM! UNSTOPPABLE FORCE 🌌';
                            reactionColor = 'bg-amber-950/40 text-amber-400 border-amber-900/60';
                          } else if (percentage >= 80) {
                            reaction = 'POW! HEROIC VICTORY ⚡';
                            reactionColor = 'bg-cyan-950/40 text-cyan-400 border-cyan-900/60';
                          } else if (percentage >= 60) {
                            reaction = 'BOOM! SOLID EFFORT 🔵';
                            reactionColor = 'bg-sky-950/40 text-sky-400 border-sky-800/60';
                          }

                          const submissionTime = r.submittedAt ? new Date(r.submittedAt).getTime() : 0;
                          const currentTime = new Date().getTime();
                          const thirtyMinutesInMs = 30 * 60 * 1000;
                          const timePassed = currentTime - submissionTime;
                          const isEligible = timePassed >= thirtyMinutesInMs;
                          const remainingMin = Math.ceil((thirtyMinutesInMs - timePassed) / (60 * 1000));

                          return (
                            <div key={r.id} className="bg-black/40 border border-gray-800/80 p-4 rounded-xl flex flex-col md:flex-row justify-between items-end md:items-center gap-4 text-right">
                              <div className="w-full md:w-auto">
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border ${reactionColor} block md:inline-block mb-2 md:mb-0`}>
                                  {reaction}
                                </span>
                                <h5 className="text-lg font-black text-white mt-1">{r.quiz_name}</h5>
                                <span className="text-xs text-gray-500 block mt-0.5">
                                  تم التسليم في: {r.submittedAt ? new Date(r.submittedAt).toLocaleString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                                {isEligible ? (
                                  <button
                                    onClick={() => setInspectingResult(r)}
                                    className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl border border-sky-500 transition cursor-pointer flex items-center gap-1.5"
                                  >
                                    <Eye className="w-4 h-4" />
                                    تصحيح الأخطاء
                                  </button>
                                ) : (
                                  <span className="bg-gray-900 border border-gray-800 text-gray-400 font-bold text-[10px] px-3 py-2 rounded-xl flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 animate-pulse text-yellow-500" />
                                    التفاصيل بعد {remainingMin} د
                                  </span>
                                )}
                                <div className="text-left">
                                  <span className="text-xs text-gray-500 block mb-1">GRADE ACHIEVED</span>
                                  <span className="text-2xl font-mono font-black text-rose-500">
                                    {r.score} / {r.total_questions} PTS
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'community' && (
                <div className="bg-gradient-to-b from-gray-950 to-slate-950 border-4 border-black shadow-[8px_8px_0px_#000] rounded-2xl flex flex-col h-[70vh] overflow-hidden">
                  {/* Header */}
                  <div className="bg-black/40 border-b border-gray-950 p-4 md:p-5 flex flex-col md:flex-row justify-between items-center gap-3">
                    <div className="text-right w-full md:w-auto">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-black text-green-400 tracking-wider">LIVE CHAT ONLINE (شات تفاعلي مباشر)</span>
                      </div>
                      <h4 className="font-sans font-black text-white text-xl md:text-2xl mt-1">
                        مجتمع {student?.className} 🛡️
                      </h4>
                      <p className="text-xs text-gray-400 mt-1">
                        تواصل، اسأل زملائك، وتبادل الملاحظات الدراسية مع أبطال دفعتك!
                      </p>
                    </div>

                    <div className="bg-rose-950/30 border border-rose-900/60 p-2.5 rounded-xl text-right max-w-sm">
                      <p className="text-[10px] md:text-xs font-bold text-rose-300 leading-relaxed">
                        ⚠️ **نظام حماية فائق القوة (AI-Shield):** الشات مراقب ذاتياً بمجسات الذكاء الاصطناعي. أي محاولة لكتابة كلمة بذيئة أو خارجة تؤدي لحظر الحساب تلقائياً وفورياً وإبلاغ مستر أحمد جمال.
                      </p>
                    </div>
                  </div>

                  {/* Message stream */}
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-950/20">
                    {communityMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-3 p-6">
                        <div className="bg-gray-900 p-4 rounded-full border border-gray-800">
                          <MessageCircle className="w-8 h-8 text-gray-500" />
                        </div>
                        <h5 className="text-gray-300 font-black text-lg">الشات نظيف تماماً! ✨</h5>
                        <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
                          كن أول من يشعل شعلة الحماس ويبدأ النقاش الدراسي مع زملائه في الدفعة بصورة راقية ومفيدة.
                        </p>
                      </div>
                    ) : (
                      communityMessages.map((msg, index) => {
                        const isMe = msg.student_code === student?.code;
                        const avatarEmoji = 
                          msg.avatar === 'spiderman' ? '🕸️' :
                          msg.avatar === 'ironman' ? '🦾' :
                          msg.avatar === 'captainamerica' ? '🛡️' :
                          msg.avatar === 'thor' ? '⚡' :
                          msg.avatar === 'blackwidow' ? '🕷️' :
                          msg.avatar === 'hulk' ? '🟢' : '👤';

                        const bubbleBg = isMe 
                          ? 'bg-rose-600 text-white border-rose-500 shadow-[2px_2px_0px_#000]' 
                          : 'bg-white/5 text-gray-100 border-gray-800 shadow-[2px_2px_0px_#000]';

                        return (
                          <div
                            key={msg.id || index}
                            className={`flex items-start gap-2.5 max-w-[85%] md:max-w-[70%] ${isMe ? 'mr-auto flex-row-reverse' : 'ml-auto'}`}
                          >
                            <div className="h-10 w-10 rounded-xl bg-black border-2 border-gray-800 flex items-center justify-center text-xl shadow-md shrink-0">
                              {avatarEmoji}
                            </div>
                            <div className="space-y-1 text-right">
                              <div className="flex items-center gap-2 justify-end">
                                <span className="text-[10px] text-gray-500 font-bold">
                                  {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                                <span className={`text-xs font-black ${isMe ? 'text-rose-400' : 'text-sky-400'}`}>
                                  {msg.student_name}
                                </span>
                              </div>
                              <div className={`p-3 rounded-2xl text-sm leading-relaxed border ${bubbleBg}`}>
                                <p className="font-sans font-bold select-text whitespace-pre-wrap">{msg.text}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={communityEndRef} />
                  </div>

                  {/* Input panel */}
                  <form onSubmit={handleSendCommunityMessage} className="p-4 bg-black border-t border-gray-900 flex gap-2">
                    <input
                      type="text"
                      className="flex-1 bg-white/5 border-2 border-gray-800 focus:border-rose-500 text-white font-bold p-3 rounded-xl outline-none transition text-right placeholder-gray-500 text-sm md:text-base"
                      placeholder="اكتب رسالة محترمة ومفيدة لزملائك في الدفعة..."
                      value={communityInput}
                      onChange={e => setCommunityInput(e.target.value)}
                      disabled={isSendingCommunityMessage}
                    />
                    <button
                      type="submit"
                      disabled={isSendingCommunityMessage || !communityInput.trim()}
                      className="bg-rose-600 hover:bg-rose-500 disabled:bg-gray-800 disabled:text-gray-500 p-3 rounded-xl text-white font-black transition flex items-center justify-center shadow-lg shrink-0"
                    >
                      {isSendingCommunityMessage ? (
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-5 h-5 transform rotate-180" />
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* GLOBAL DESIGNER AND DEVELOPER FOOTER */}
        <div className="mt-16 pt-8 border-t border-gray-900/80 flex flex-col items-center gap-4 text-center max-w-2xl mx-auto pb-6">
          <p className="text-xs md:text-sm font-black text-gray-500 uppercase tracking-widest">
            Designed & Developed by <span className="text-rose-500 font-extrabold shadow-sm">Abdelrahman Tarek</span>
          </p>
          <a
            href="https://se-abdulrahman.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-black text-white bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 transition duration-300 px-6 py-3 rounded-xl border border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:shadow-[0_0_25px_rgba(239,68,68,0.4)] transform hover:-translate-y-0.5"
          >
            <span>زيارة معرض أعمال المصمم 🎨</span>
          </a>
        </div>

      </div>
    </div>
  );
}
