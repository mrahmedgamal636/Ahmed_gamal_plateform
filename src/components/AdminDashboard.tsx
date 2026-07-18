import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import CryptoJS from 'crypto-js';
import { Scanner } from '@yudiel/react-qr-scanner';
import { 
  Shield, 
  Trophy, 
  Play, 
  Plus, 
  Trash2, 
  FileSignature, 
  Users, 
  Video, 
  Search, 
  Filter, 
  Settings, 
  Award, 
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
  Cpu,
  ArrowLeft,
  ChevronRight,
  QrCode,
  ScanLine,
  Check,
  Database,
  MessageCircle,
  X
} from 'lucide-react';

const SECRET_KEY = "JamalAcademy_Secret_2026";

interface AdminDashboardProps {
  onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [authorized, setAuthorized] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [loginError, setLoginError] = useState(false);

  // Nav Tabs
  const [activeTab, setActiveTab] = useState<'stats' | 'students' | 'videos' | 'quizzes' | 'results' | 'rankings' | 'scanner' | 'messages'>('stats');

  // Real Database state
  const [students, setStudents] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [inspectingResult, setInspectingResult] = useState<any | null>(null);
  const [analysisQuizId, setAnalysisQuizId] = useState<string>('');
  const [videos, setVideos] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter states
  const [searchStudent, setSearchStudent] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');

  // Scanner State
  const [scanResult, setScanResult] = useState<any>(null);

  // Edit States
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [editStudentData, setEditStudentData] = useState<any>({});
  
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [editQuestionData, setEditQuestionData] = useState<any>({});

  const handleSaveQuestionEdit = async (questionId: string) => {
    try {
      if (selectedQuiz) {
        await updateDoc(doc(db, 'quizzes', selectedQuiz.id, 'questions', questionId), {
          question_text: editQuestionData.question_text,
          choice_a: editQuestionData.choice_a,
          choice_b: editQuestionData.choice_b,
          choice_c: editQuestionData.choice_c,
          choice_d: editQuestionData.choice_d,
          correct_answer: editQuestionData.correct_answer
        });
        alert("تم تحديث السؤال بنجاح!");
        setEditingQuestion(null);
        handleOpenQuizDetails(selectedQuiz); // Refresh questions
      }
    } catch (err) {
      console.error("Error updating question", err);
      alert("حدث خطأ أثناء تحديث السؤال.");
    }
  };

  const handleScan = (result: any) => {
    if (result && result.length > 0) {
      try {
        const decrypted = CryptoJS.AES.decrypt(result[0].rawValue, SECRET_KEY).toString(CryptoJS.enc.Utf8);
        const data = JSON.parse(decrypted);
        setScanResult(data);
      } catch (err) {
        console.error("Invalid QR code", err);
      }
    }
  };

  // Video Form
  const [newVideo, setNewVideo] = useState({ title: '', className: 'الصف الأول الثانوي', url: '' });
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  // Quiz Form
  const [newQuiz, setNewQuiz] = useState({ quiz_name: '', className: 'الصف الأول الثانوي' });
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);

  // Active Quiz details state
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [newQuestion, setNewQuestion] = useState({
    question_text: '',
    choice_a: '',
    choice_b: '',
    choice_c: '',
    choice_d: '',
    correct_answer: 'A'
  });

  // Teacher AI Quiz Generator State
  const [aiTopic, setAiTopic] = useState('');
  const [aiClass, setAiClass] = useState('الصف الأول الثانوي');
  const [aiDifficulty, setAiDifficulty] = useState('Intermediate');
  const [aiNumQuestions, setAiNumQuestions] = useState(5);
  const [aiCustomText, setAiCustomText] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Rankings state
  const [rankings, setRankings] = useState<any[]>([]);
  const [rankClass, setRankClass] = useState('all');
  const [rankGroup, setRankGroup] = useState('all');

  useEffect(() => {
    if (localStorage.getItem('jamal_admin_auth') === 'true') {
      setAuthorized(true);
      fetchAdminData();
    }
  }, []);

  const handleSaveStudentEdit = async (studentId: string) => {
    try {
      await updateDoc(doc(db, 'students', studentId), {
        name: editStudentData.name,
        password: editStudentData.password,
        phone: editStudentData.phone,
        class_name: editStudentData.class_name,
        group_name: editStudentData.group_name
      });
      alert("تم تحديث بيانات الطالب بنجاح!");
      setEditingStudent(null);
      fetchAdminData();
    } catch (err) {
      console.error("Error updating student", err);
      alert("حدث خطأ أثناء التحديث.");
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUser === 'admin' && adminPass === 'Jama123') {
      localStorage.setItem('jamal_admin_auth', 'true');
      setAuthorized(true);
      setLoginError(false);
      fetchAdminData();
    } else {
      setLoginError(true);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('jamal_admin_auth');
    setAuthorized(false);
    onLogout();
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Students
      const studentSnap = await getDocs(collection(db, 'students'));
      const sList = studentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(sList);

      // 2. Fetch Quizzes
      const quizSnap = await getDocs(collection(db, 'quizzes'));
      const qList = quizSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setQuizzes(qList);

      // 3. Fetch Videos
      const videoSnap = await getDocs(collection(db, 'videos'));
      const vList = videoSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVideos(vList);

      // 4. Fetch Results
      const resultSnap = await getDocs(collection(db, 'results'));
      const rList = resultSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setResults(rList);

      const msgSnap = await getDocs(collection(db, 'messages'));
      const msgList = msgSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgList.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

    } catch (err) {
      console.error("Error loading admin datasets:", err);
    } finally {
      setLoading(false);
    }
  };

  // Student Messages Management Actions
  const handleToggleMessageSelect = (id: string) => {
    setSelectedMessageIds(prev =>
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllMessages = () => {
    if (selectedMessageIds.length === messages.length) {
      setSelectedMessageIds([]);
    } else {
      setSelectedMessageIds(messages.map(msg => msg.id));
    }
  };

  const handleDeleteSelectedMessages = async () => {
    if (selectedMessageIds.length === 0) return;
    if (!confirm(`هل أنت متأكد من رغبتك في حذف ${selectedMessageIds.length} رسالة محددة؟`)) return;
    
    try {
      setLoading(true);
      await Promise.all(
        selectedMessageIds.map(id => deleteDoc(doc(db, 'messages', id)))
      );
      setSelectedMessageIds([]);
      await fetchAdminData();
      alert("تم حذف الرسائل المحددة بنجاح!");
    } catch (err) {
      console.error("Error deleting messages:", err);
      alert("حدث خطأ أثناء محاولة حذف بعض الرسائل.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSingleMessage = async (id: string) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذه الرسالة؟")) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'messages', id));
      setSelectedMessageIds(prev => prev.filter(mid => mid !== id));
      await fetchAdminData();
      alert("تم حذف الرسالة بنجاح!");
    } catch (err) {
      console.error("Error deleting message:", err);
      alert("حدث خطأ أثناء محاولة حذف الرسالة.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStudentBan = async (studentId: string, currentBanStatus: boolean) => {
    const actionText = currentBanStatus ? "إلغاء حظر" : "حظر";
    if (!confirm(`هل أنت متأكد من رغبتك في ${actionText} هذا الطالب؟`)) return;
    
    try {
      setLoading(true);
      await updateDoc(doc(db, 'students', studentId), {
        is_banned: !currentBanStatus
      });
      alert(`تم ${currentBanStatus ? "إلغاء حظر" : "حظر"} الطالب بنجاح!`);
      await fetchAdminData();
    } catch (err) {
      console.error("Error toggling student ban status:", err);
      alert("حدث خطأ أثناء محاولة تعديل حالة الحظر.");
    } finally {
      setLoading(false);
    }
  };

  // Video Actions
  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideo.title || !newVideo.url) {
      alert("يرجى ملء كافة تفاصيل الفيديو!");
      return;
    }
    setIsUploadingVideo(true);
    try {
      const docRef = await addDoc(collection(db, 'videos'), {
        title: newVideo.title,
        class_name: newVideo.className,
        youtube_url: newVideo.url,
        createdAt: new Date().toISOString()
      });
      setVideos(prev => [...prev, {
        id: docRef.id,
        title: newVideo.title,
        class_name: newVideo.className,
        youtube_url: newVideo.url,
        createdAt: new Date().toISOString()
      }]);
      setNewVideo({ title: '', className: 'الصف الأول الثانوي', url: '' });
      alert("تم رفع المحاضرة بنجاح!");
    } catch (err) {
      console.error("Error adding video:", err);
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المحاضرة؟")) return;
    try {
      await deleteDoc(doc(db, 'videos', id));
      setVideos(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      console.error("Error deleting video:", err);
    }
  };

  // Quiz Actions
  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuiz.quiz_name) {
      alert("يرجى إدخال اسم الاختبار!");
      return;
    }
    setIsCreatingQuiz(true);
    try {
      const docRef = await addDoc(collection(db, 'quizzes'), {
        quiz_name: newQuiz.quiz_name,
        class_name: newQuiz.className,
        is_active: false,
        createdAt: new Date().toISOString()
      });
      const created = {
        id: docRef.id,
        quiz_name: newQuiz.quiz_name,
        class_name: newQuiz.className,
        is_active: false,
        createdAt: new Date().toISOString()
      };
      setQuizzes(prev => [...prev, created]);
      setNewQuiz({ quiz_name: '', className: 'الصف الأول الثانوي' });
      alert("تم إنشاء الاختبار بنجاح! يرجى إضافة الأسئلة إليه الآن.");
    } catch (err) {
      console.error("Error creating quiz:", err);
    } finally {
      setIsCreatingQuiz(false);
    }
  };

  const toggleQuizStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'quizzes', id), { is_active: !currentStatus });
      setQuizzes(prev => prev.map(q => q.id === id ? { ...q, is_active: !currentStatus } : q));
    } catch (err) {
      console.error("Error updating quiz status:", err);
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الاختبار بالكامل بجميع أسئلته؟")) return;
    try {
      await deleteDoc(doc(db, 'quizzes', id));
      setQuizzes(prev => prev.filter(q => q.id !== id));
      if (selectedQuiz?.id === id) {
        setSelectedQuiz(null);
      }
    } catch (err) {
      console.error("Error deleting quiz:", err);
    }
  };

  // Question Management within selected Quiz
  const handleOpenQuizDetails = async (quiz: any) => {
    setSelectedQuiz(quiz);
    setLoading(true);
    try {
      const qSnap = await getDocs(collection(db, 'quizzes', quiz.id, 'questions'));
      const list = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setQuizQuestions(list);
    } catch (err) {
      console.error("Error fetching questions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const { question_text, choice_a, choice_b, choice_c, choice_d, correct_answer } = newQuestion;
    if (!question_text || !choice_a || !choice_b || !choice_c || !choice_d) {
      alert("يرجى ملء كافة تفاصيل السؤال!");
      return;
    }

    try {
      const colRef = collection(db, 'quizzes', selectedQuiz.id, 'questions');
      const docRef = await addDoc(colRef, {
        question_text,
        choice_a,
        choice_b,
        choice_c,
        choice_d,
        correct_answer
      });
      setQuizQuestions(prev => [...prev, {
        id: docRef.id,
        question_text,
        choice_a,
        choice_b,
        choice_c,
        choice_d,
        correct_answer
      }]);
      setNewQuestion({
        question_text: '',
        choice_a: '',
        choice_b: '',
        choice_c: '',
        choice_d: '',
        correct_answer: 'A'
      });
    } catch (err) {
      console.error("Error adding question:", err);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm("هل تريد حذف هذا السؤال؟")) return;
    try {
      await deleteDoc(doc(db, 'quizzes', selectedQuiz.id, 'questions', qId));
      setQuizQuestions(prev => prev.filter(q => q.id !== qId));
    } catch (err) {
      console.error("Error deleting question:", err);
    }
  };

  // Teacher AI Generator
  const handleGenerateAiQuiz = async () => {
    if (!aiTopic.trim()) {
      alert("يرجى إدخال الموضوع لإنشاء الأسئلة!");
      return;
    }
    setIsGeneratingAi(true);
    try {
      const response = await fetch('/api/teacher-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_quiz',
          className: aiClass,
          difficulty: aiDifficulty,
          topic: aiTopic,
          numQuestions: aiNumQuestions,
          customText: aiCustomText
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

      if (data.questions && Array.isArray(data.questions)) {
        const batch = quizQuestions;
        const colRef = collection(db, 'quizzes', selectedQuiz.id, 'questions');

        for (const q of data.questions) {
          const docRef = await addDoc(colRef, {
            question_text: q.question_text,
            choice_a: q.choice_a,
            choice_b: q.choice_b,
            choice_c: q.choice_c,
            choice_d: q.choice_d,
            correct_answer: q.correct_answer
          });
          batch.push({
            id: docRef.id,
            question_text: q.question_text,
            choice_a: q.choice_a,
            choice_b: q.choice_b,
            choice_c: q.choice_c,
            choice_d: q.choice_d,
            correct_answer: q.correct_answer
          });
        }

        setQuizQuestions([...batch]);
        setAiTopic('');
        setAiCustomText('');
        alert(`تم توليد ${data.questions.length} أسئلة بنجاح بالذكاء الاصطناعي وإضافتها للاختبار!`);
      } else {
        throw new Error("تنسيق الاستجابة من الذكاء الاصطناعي غير صالح");
      }

    } catch (err: any) {
      console.error("Error generating AI quiz:", err);
      alert("حدث خطأ أثناء توليد الأسئلة: " + err.message);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Rankings logic
  const handleGenerateRankings = () => {
    const studentMap: { [key: string]: any } = {};

    const filteredResults = results.filter(r => {
      const classMatch = rankClass === 'all' || r.class_name === rankClass;
      const groupMatch = rankGroup === 'all' || r.group_name === rankGroup;
      return classMatch && groupMatch;
    });

    filteredResults.forEach(r => {
      if (!studentMap[r.student_code]) {
        studentMap[r.student_code] = {
          name: r.student_name,
          code: r.student_code,
          className: r.class_name,
          groupName: r.group_name,
          totalScore: 0
        };
      }
      studentMap[r.student_code].totalScore += r.score;
    });

    const sorted = Object.values(studentMap).sort((a: any, b: any) => b.totalScore - a.totalScore);
    setRankings(sorted);
  };

  // Custom filters for students and past score archives
  const filteredStudents = students.filter(s => {
    const sName = (s.name || '').toLowerCase();
    const sCode = (s.code || '').toLowerCase();
    const sPhone = (s.phone || '').toLowerCase();
    const queryMatch = sName.includes(searchStudent.toLowerCase()) || sCode.includes(searchStudent.toLowerCase()) || sPhone.includes(searchStudent.toLowerCase());
    const classMatch = filterClass === 'all' || s.class_name === filterClass;
    const groupMatch = filterGroup === 'all' || s.group_name === filterGroup;
    return queryMatch && classMatch && groupMatch;
  });

  const filteredResults = results.filter(r => {
    const sName = (r.student_name || '').toLowerCase();
    const sCode = (r.student_code || '').toLowerCase();
    const queryMatch = sName.includes(searchStudent.toLowerCase()) || sCode.includes(searchStudent.toLowerCase());
    const classMatch = filterClass === 'all' || r.class_name === filterClass;
    const groupMatch = filterGroup === 'all' || r.group_name === filterGroup;
    return queryMatch && classMatch && groupMatch;
  });

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm bg-black/80 backdrop-blur-xl border-4 border-red-600 shadow-[0_0_50px_rgba(226,54,54,0.3)] p-8 text-center rounded-2xl">
          <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-6">
            ADMIN HQ ACCESS
          </h2>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <input
              type="text"
              required
              placeholder="USERNAME"
              className="w-full bg-white/5 border-2 border-gray-700 focus:border-red-500 text-white rounded-xl p-4 text-center font-mono font-bold outline-none transition"
              value={adminUser}
              onChange={e => setAdminUser(e.target.value)}
            />

            <input
              type="password"
              required
              placeholder="SECRET PASSCODE"
              className="w-full bg-white/5 border-2 border-gray-700 focus:border-red-500 text-white rounded-xl p-4 text-center font-mono font-bold outline-none transition"
              value={adminPass}
              onChange={e => setAdminPass(e.target.value)}
            />

            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-xl text-xl transition shadow-[0_4px_15px_rgba(226,54,54,0.4)]"
            >
              ACCESS TERMINAL
            </button>
          </form>

          {loginError && (
            <p className="text-rose-500 font-bold mt-4 text-sm">
              رمز الدخول أو الاسم غير صحيح!
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      
      {/* Top Banner Control Header */}
      <nav className="border-b-4 border-red-600 bg-black/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="bg-red-600 border-2 border-white px-3 py-1 rounded shadow-md transform skew-x-[-10deg]">
                <span className="font-sans font-black text-white text-lg tracking-widest">HQ ACCESS</span>
              </div>
              <span className="font-black text-sky-400 text-sm tracking-widest hidden md:inline">
                MISSION CONTROL TERMINAL
              </span>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={fetchAdminData}
                className="p-2 text-gray-400 hover:text-white transition rounded-xl border border-gray-800"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              <button
                onClick={handleAdminLogout}
                className="bg-red-950/40 text-red-400 border border-red-900/60 hover:bg-red-600 hover:text-white px-4 py-2 rounded-xl text-sm font-black transition"
              >
                DISCONNECT TERMINAL
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed right-0 top-20 bottom-0 w-64 bg-black/80 border-l border-gray-800 backdrop-blur-xl flex-col p-6 z-30 overflow-y-auto">
        <div className="space-y-4">
          <h3 className="text-gray-500 font-black text-xs uppercase tracking-widest mb-6 border-b border-gray-800 pb-2">HQ Navigation</h3>
          {[
            { id: 'stats', label: 'لوحة التحكم', icon: Shield },
            { id: 'scanner', label: 'مسح النتائج (QR)', icon: QrCode },
            { id: 'students', label: 'الطلاب المسجلين', icon: Users },
            { id: 'quizzes', label: 'بنك الامتحانات', icon: FileSignature },
            { id: 'videos', label: 'إدارة الفيديوهات', icon: Video },
            { id: 'results', label: 'سجلات الدرجات', icon: Database },
            { id: 'rankings', label: 'لوحة الشرف', icon: Trophy },
            { id: 'messages', label: 'صندوق الرسائل', icon: MessageCircle }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSelectedQuiz(null); // Clear selected quiz detail state on navigation
                }}
                className={`w-full flex items-center gap-3 py-4 px-4 rounded-xl text-sm font-black transition ${
                  activeTab === tab.id
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Mobile Bottom Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-black/95 border-t border-gray-800 backdrop-blur-xl z-50 overflow-x-auto scrollbar-none">
        <div className="flex justify-start items-center h-20 px-4 gap-4 whitespace-nowrap min-w-max">
          {[
            { id: 'stats', label: 'لوحة التحكم', icon: Shield },
            { id: 'scanner', label: 'مسح النتائج (QR)', icon: QrCode },
            { id: 'students', label: 'الطلاب', icon: Users },
            { id: 'quizzes', label: 'الامتحانات', icon: FileSignature },
            { id: 'videos', label: 'الفيديوهات', icon: Video },
            { id: 'results', label: 'الدرجات', icon: Database },
            { id: 'rankings', label: 'الشرف', icon: Trophy },
            { id: 'messages', label: 'الرسائل', icon: MessageCircle }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSelectedQuiz(null);
                }}
                className={`flex flex-col items-center justify-center py-2 px-3 space-y-1 transition rounded-xl ${
                  activeTab === tab.id
                    ? 'text-red-500 bg-red-950/20'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-black">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 lg:pb-8 lg:pr-[18rem]">

        {/* Content Tabs Switch */}
        <div>
          {activeTab === 'stats' && (
            <div className="space-y-6">
              
              {/* Statistics Panel Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-black/60 border border-gray-800 p-6 rounded-2xl text-center relative overflow-hidden">
                  <Users className="w-8 h-8 text-sky-400 mx-auto mb-2" />
                  <span className="text-xs font-black text-gray-500 uppercase block">Total Students</span>
                  <span className="text-4xl font-black text-white mt-1 block">{students.length}</span>
                </div>

                <div className="bg-black/60 border border-gray-800 p-6 rounded-2xl text-center relative overflow-hidden">
                  <FileSignature className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                  <span className="text-xs font-black text-gray-500 uppercase block">Created Quizzes</span>
                  <span className="text-4xl font-black text-white mt-1 block">{quizzes.length}</span>
                </div>

                <div className="bg-black/60 border border-gray-800 p-6 rounded-2xl text-center relative overflow-hidden">
                  <Play className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                  <span className="text-xs font-black text-gray-500 uppercase block">Lecture Videos</span>
                  <span className="text-4xl font-black text-white mt-1 block">{videos.length}</span>
                </div>

                <div className="bg-black/60 border border-gray-800 p-6 rounded-2xl text-center relative overflow-hidden">
                  <Database className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <span className="text-xs font-black text-gray-500 uppercase block">Exam Attempts</span>
                  <span className="text-4xl font-black text-white mt-1 block">{results.length}</span>
                </div>
              </div>

              {/* Quick actions panel */}
              <div className="bg-black/60 border border-gray-800 p-6 rounded-2xl">
                <h4 className="font-sans font-black text-white text-lg tracking-wider mb-4 border-b border-gray-800 pb-3">
                  MISSION CONTROLLERS
                </h4>
                <p className="text-sm text-gray-400 font-bold leading-relaxed text-right">
                  مرحباً بك يا مستر أحمد جمال في قاعدة إدارة العمليات التعليمية. يمكنك استخدام لوحة التحكم العليا لرفع محاضرات الفيديو لصفوف معينة، إنشاء اختبارات قصيرة وإضافة الأسئلة يدوياً أو بواسطة الذكاء الاصطناعي، ومراقبة درجات أبطال الأكاديمية بدقة تامة والتحقق من لوحة الشرف لدعم مستوياتهم المتفوقة.
                </p>
              </div>

            </div>
          )}

          {activeTab === 'scanner' && (
            <div className="bg-black border border-gray-800 rounded-3xl p-8 space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 bg-red-600/20 rounded-xl">
                  <ScanLine className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-black italic tracking-tight">مسح درجات الطلاب</h2>
                  <p className="text-gray-400 text-sm mt-1">قم بمسح كود الـ QR الخاص بالطالب بعد إنهاء الامتحان في السنتر</p>
                </div>
              </div>
              
              <div className="max-w-md mx-auto aspect-square overflow-hidden rounded-2xl border-4 border-gray-800 relative bg-black">
                <Scanner 
                  onScan={handleScan}
                  components={{
                    audio: true,
                    torch: true
                  }}
                  formats={["qr_code"]}
                />
                {scanResult && (
                  <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-6 z-10 text-center">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
                      <Check className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-4">تم تسجيل النتيجة!</h3>
                    <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 w-full text-right space-y-3 mb-6">
                      <p className="text-gray-400 text-sm">الطالب: <span className="text-white font-bold block mt-1">{scanResult.student_name}</span></p>
                      <p className="text-gray-400 text-sm">الكود: <span className="text-white font-bold block mt-1">{scanResult.student_code}</span></p>
                      <p className="text-gray-400 text-sm">الصف: <span className="text-white font-bold block mt-1">{scanResult.class_name}</span></p>
                      <p className="text-gray-400 text-sm">النتيجة: <span className="text-green-500 font-black block mt-1 text-xl">{scanResult.score}</span></p>
                      <p className="text-gray-400 text-sm">الوقت: <span className="text-white font-bold block mt-1">{new Date(scanResult.timestamp).toLocaleString('ar-EG')}</span></p>
                    </div>
                    <button 
                      onClick={() => setScanResult(null)}
                      className="px-8 py-3 bg-red-600 hover:bg-red-500 rounded-xl text-white font-bold transition w-full shadow-lg"
                    >
                      مسح طالب آخر
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'students' && (
            <div className="space-y-6">
              
              {/* Search and filter UI */}
              <div className="bg-black/60 border border-gray-800 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <input
                    type="text"
                    className="w-full bg-white/5 border-2 border-gray-800 focus:border-red-500 text-white font-bold p-3 rounded-xl outline-none transition text-right"
                    placeholder="ابحث بالاسم، الكود، أو الهاتف..."
                    value={searchStudent}
                    onChange={e => setSearchStudent(e.target.value)}
                  />
                  <Search className="absolute left-4 top-3.5 text-gray-500 w-5 h-5" />
                </div>

                <select
                  className="bg-black border-2 border-gray-800 focus:border-red-500 text-white rounded-xl p-3 font-bold outline-none cursor-pointer"
                  value={filterClass}
                  onChange={e => setFilterClass(e.target.value)}
                >
                  <option value="all">كل الصفوف الدراسية</option>
                  <option value="الصف الأول الإعدادي">الصف الأول الإعدادي</option>
                  <option value="الصف الثاني الإعدادي">الصف الثاني الإعدادي</option>
                  <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
                  <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                  <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                  <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                </select>

                <select
                  className="bg-black border-2 border-gray-800 focus:border-red-500 text-white rounded-xl p-3 font-bold outline-none cursor-pointer"
                  value={filterGroup}
                  onChange={e => setFilterGroup(e.target.value)}
                >
                  <option value="all">كل المجموعات (الأيام)</option>
                  <option value="السبت">السبت</option>
                  <option value="الأحد">الأحد</option>
                  <option value="الإثنين">الإثنين</option>
                  <option value="الثلاثاء">الثلاثاء</option>
                  <option value="الأربعاء">الأربعاء</option>
                  <option value="الخميس">الخميس</option>
                  <option value="الجمعة">الجمعة</option>
                </select>
              </div>

              {/* Students directory list */}
              <div className="bg-black/60 border border-gray-800 rounded-2xl overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-950 text-gray-400 font-bold text-sm">
                      <th className="p-4">كود الطالب</th>
                      <th className="p-4">اسم الطالب</th>
                      <th className="p-4">كلمة المرور</th>
                      <th className="p-4">رقم الهاتف</th>
                      <th className="p-4">الصف</th>
                      <th className="p-4">المجموعة</th>
                      <th className="p-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-500 font-bold text-sm">
                          لا يوجد طلاب مسجلين يطابقون خيارات البحث الحالية.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((s, idx) => (
                        <tr key={s.id || idx} className="border-b border-gray-900 hover:bg-white/5 transition font-bold text-sm">
                          <td className="p-4 font-mono text-red-500">{s.code}</td>
                          {editingStudent === s.id ? (
                            <>
                              <td className="p-4"><input className="w-full bg-gray-900 border border-gray-700 text-white px-2 py-1 rounded" value={editStudentData.name} onChange={(e) => setEditStudentData({...editStudentData, name: e.target.value})} /></td>
                              <td className="p-4"><input className="w-full bg-gray-900 border border-gray-700 text-white px-2 py-1 rounded" value={editStudentData.password || ''} onChange={(e) => setEditStudentData({...editStudentData, password: e.target.value})} /></td>
                              <td className="p-4"><input className="w-full bg-gray-900 border border-gray-700 text-white px-2 py-1 rounded" value={editStudentData.phone} onChange={(e) => setEditStudentData({...editStudentData, phone: e.target.value})} /></td>
                              <td className="p-4">
                                <select className="w-full bg-gray-900 border border-gray-700 text-white px-2 py-1 rounded" value={editStudentData.class_name} onChange={(e) => setEditStudentData({...editStudentData, class_name: e.target.value})}>
                                  <option value="الصف الأول الإعدادي">الأول الإعدادي</option>
                                  <option value="الصف الثاني الإعدادي">الثاني الإعدادي</option>
                                  <option value="الصف الثالث الإعدادي">الثالث الإعدادي</option>
                                  <option value="الصف الأول الثانوي">الأول الثانوي</option>
                                  <option value="الصف الثاني الثانوي">الثاني الثانوي</option>
                                  <option value="الصف الثالث الثانوي">الثالث الثانوي</option>
                                </select>
                              </td>
                              <td className="p-4">
                                <select className="w-full bg-gray-900 border border-gray-700 text-white px-2 py-1 rounded" value={editStudentData.group_name} onChange={(e) => setEditStudentData({...editStudentData, group_name: e.target.value})}>
                                  <option value="السبت">السبت</option>
                                  <option value="الأحد">الأحد</option>
                                  <option value="الإثنين">الإثنين</option>
                                  <option value="الثلاثاء">الثلاثاء</option>
                                  <option value="الأربعاء">الأربعاء</option>
                                  <option value="الخميس">الخميس</option>
                                  <option value="الجمعة">الجمعة</option>
                                </select>
                              </td>
                              <td className="p-4 text-center">
                                <button onClick={() => handleSaveStudentEdit(s.id)} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs ml-2">حفظ</button>
                                <button onClick={() => setEditingStudent(null)} className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-xs">إلغاء</button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-4 text-white uppercase">
                                <div className="flex items-center gap-2">
                                  <span>{s.name}</span>
                                  {s.is_banned && (
                                    <span className="bg-red-950/80 border border-red-700 text-red-400 text-[10px] px-2 py-0.5 rounded-md font-black animate-pulse">
                                      محظور 🛑
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 font-mono text-cyan-400">{s.password || 'بلا كلمة مرور'}</td>
                              <td className="p-4 text-gray-400 font-mono">{s.phone}</td>
                              <td className="p-4 text-gray-300">{s.class_name}</td>
                              <td className="p-4 text-gray-300">{s.group_name}</td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-3">
                                  <button 
                                    onClick={() => {
                                      setEditingStudent(s.id);
                                      setEditStudentData(s);
                                    }} 
                                    className="text-gray-400 hover:text-white transition"
                                  >
                                    تعديل
                                  </button>
                                  <button
                                    onClick={() => handleToggleStudentBan(s.id, !!s.is_banned)}
                                    className={`text-xs px-2.5 py-1 rounded-xl border font-black transition ${
                                      s.is_banned 
                                        ? "bg-green-950/40 border-green-800 text-green-400 hover:bg-green-900/60" 
                                        : "bg-red-950/40 border-red-900 text-red-400 hover:bg-red-900/60"
                                    }`}
                                  >
                                    {s.is_banned ? "إلغاء الحظر" : "حظر"}
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {activeTab === 'videos' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Add lecture panel */}
              <div className="bg-black/60 border border-gray-800 p-6 rounded-2xl h-fit">
                <h4 className="font-sans font-black text-white text-lg tracking-wider mb-4 border-b border-gray-800 pb-3">
                  UPLOAD NEW LECTURE
                </h4>

                <form onSubmit={handleAddVideo} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">Lecture Title</label>
                    <input
                      type="text"
                      required
                      placeholder="عنوان المحاضرة بالتفصيل"
                      className="w-full bg-white/5 border-2 border-gray-800 focus:border-red-500 text-white font-bold p-3 rounded-xl outline-none"
                      value={newVideo.title}
                      onChange={e => setNewVideo(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">Target Class</label>
                    <select
                      className="w-full bg-black border-2 border-gray-800 focus:border-red-500 text-white rounded-xl p-3 font-bold outline-none cursor-pointer"
                      value={newVideo.className}
                      onChange={e => setNewVideo(prev => ({ ...prev, className: e.target.value }))}
                    >
                      <option value="الصف الأول الإعدادي">الصف الأول الإعدادي</option>
                      <option value="الصف الثاني الإعدادي">الصف الثاني الإعدادي</option>
                      <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
                      <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                      <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                      <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">YouTube Video URL</label>
                    <input
                      type="text"
                      required
                      placeholder="أدخل رابط يوتيوب (Youtube URL)"
                      className="w-full bg-white/5 border-2 border-gray-800 focus:border-red-500 text-white font-bold p-3 rounded-xl outline-none text-left"
                      dir="ltr"
                      value={newVideo.url}
                      onChange={e => setNewVideo(prev => ({ ...prev, url: e.target.value }))}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isUploadingVideo}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-xl transition"
                  >
                    {isUploadingVideo ? 'جاري الرفع...' : 'رفع المحاضرة'}
                  </button>
                </form>
              </div>

              {/* Uploaded lectures list */}
              <div className="lg:col-span-2 bg-black/60 border border-gray-800 p-6 rounded-2xl">
                <h4 className="font-sans font-black text-white text-lg tracking-wider mb-4 border-b border-gray-800 pb-3">
                  CURRENT LECTURES
                </h4>

                {videos.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 font-bold text-sm">
                    لا توجد محاضرات مرفوعة حالياً.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {videos.map(v => (
                      <div key={v.id} className="bg-white/5 border border-gray-800 p-4 rounded-xl flex items-center justify-between">
                        <div className="text-right">
                          <span className="text-md font-bold text-white block">{v.title}</span>
                          <span className="text-xs bg-red-950 text-red-400 border border-red-900/40 px-2 py-0.5 rounded inline-block mt-2 font-mono">
                            {v.class_name}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteVideo(v.id)}
                          className="text-rose-500 hover:text-rose-400 p-2 border border-rose-950/40 hover:bg-rose-950/20 rounded-xl transition"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {activeTab === 'quizzes' && (
            <div className="space-y-6">
              
              {!selectedQuiz ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Create quiz form */}
                  <div className="bg-black/60 border border-gray-800 p-6 rounded-2xl h-fit">
                    <h4 className="font-sans font-black text-white text-lg tracking-wider mb-4 border-b border-gray-800 pb-3">
                      INITIALIZE EXAM
                    </h4>

                    <form onSubmit={handleCreateQuiz} className="space-y-4">
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase mb-2">Exam Name</label>
                        <input
                          type="text"
                          required
                          placeholder="اسم الاختبار، مثل: مراجعة قواعد الوحدة الأولى"
                          className="w-full bg-white/5 border-2 border-gray-800 focus:border-red-500 text-white font-bold p-3 rounded-xl outline-none"
                          value={newQuiz.quiz_name}
                          onChange={e => setNewQuiz(prev => ({ ...prev, quiz_name: e.target.value }))}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase mb-2">Target Classroom</label>
                        <select
                          className="w-full bg-black border-2 border-gray-800 focus:border-red-500 text-white rounded-xl p-3 font-bold outline-none cursor-pointer"
                          value={newQuiz.className}
                          onChange={e => setNewQuiz(prev => ({ ...prev, className: e.target.value }))}
                        >
                          <option value="الصف الأول الإعدادي">الصف الأول الإعدادي</option>
                          <option value="الصف الثاني الإعدادي">الصف الثاني الإعدادي</option>
                          <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
                          <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                          <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                          <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={isCreatingQuiz}
                        className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-xl transition"
                      >
                        {isCreatingQuiz ? 'جاري الإنشاء...' : 'إنشاء الاختبار'}
                      </button>
                    </form>
                  </div>

                  {/* Quizzes list */}
                  <div className="lg:col-span-2 bg-black/60 border border-gray-800 p-6 rounded-2xl">
                    <h4 className="font-sans font-black text-white text-lg tracking-wider mb-4 border-b border-gray-800 pb-3">
                      QUIZ BANK
                    </h4>

                    {quizzes.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 font-bold text-sm">
                        لا توجد اختبارات منشأة بعد.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {quizzes.map(q => (
                          <div key={q.id} className="bg-white/5 border border-gray-800 p-5 rounded-2xl flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <span className={`text-xs font-black px-2 py-0.5 rounded border ${
                                  q.is_active 
                                    ? 'bg-green-950/40 text-green-400 border-green-900/60' 
                                    : 'bg-gray-900 text-gray-400 border-gray-800'
                                }`}>
                                  {q.is_active ? 'نشط ومتاح' : 'غير نشط'}
                                </span>
                                <span className="text-xs font-black text-gray-500">{q.class_name}</span>
                              </div>
                              <h5 className="text-lg font-black text-white mb-6 leading-snug">{q.quiz_name}</h5>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleOpenQuizDetails(q)}
                                className="flex-1 bg-white text-black hover:bg-gray-200 py-2.5 rounded-xl font-black transition text-center text-sm"
                              >
                                إدارة الأسئلة
                              </button>

                              <button
                                onClick={() => toggleQuizStatus(q.id, q.is_active)}
                                className={`p-2.5 rounded-xl border transition ${
                                  q.is_active 
                                    ? 'border-green-900 text-green-400 hover:bg-green-950/20' 
                                    : 'border-gray-800 text-gray-400 hover:bg-gray-800'
                                }`}
                              >
                                {q.is_active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                              </button>

                              <button
                                onClick={() => handleDeleteQuiz(q.id)}
                                className="p-2.5 rounded-xl border border-rose-900/40 text-rose-500 hover:bg-rose-950/20 transition"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* Detailed quiz view */}
                  <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-6">
                    <button
                      onClick={() => setSelectedQuiz(null)}
                      className="text-gray-400 hover:text-white flex items-center gap-2 font-black transition text-sm"
                    >
                      <ArrowLeft className="w-5 h-5" /> عودة لقائمة الاختبارات
                    </button>

                    <h4 className="text-xl md:text-2xl font-black text-white italic uppercase">
                      EXAM: {selectedQuiz.quiz_name} ({quizQuestions.length} Qs)
                    </h4>
                  </div>

                  {/* Split Layout: manual addition vs AI generator */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Teacher AI generator card */}
                    <div className="bg-gradient-to-br from-slate-950 via-black to-gray-950 border-2 border-red-600 p-6 rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.15)] relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-2xl" />

                      <div className="flex items-center gap-3 border-b border-gray-800 pb-3 mb-4">
                        <Cpu className="w-6 h-6 text-red-500 animate-pulse" />
                        <h5 className="font-sans font-black text-white text-lg tracking-wider">
                          JARVIS TEACHER AI GENERATOR
                        </h5>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-black text-gray-400 uppercase mb-2">EXAM TOPIC / SYLLABUS</label>
                          <input
                            type="text"
                            required
                            placeholder="مثال: Relative Clauses, Present Perfect, Vocabulary Unit 1"
                            className="w-full bg-white/5 border-2 border-gray-800 focus:border-red-500 text-white font-bold p-3 rounded-xl outline-none"
                            value={aiTopic}
                            onChange={e => setAiTopic(e.target.value)}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-black text-gray-400 uppercase mb-2">Difficulty</label>
                            <select
                              className="w-full bg-black border-2 border-gray-800 focus:border-red-500 text-white rounded-xl p-3 font-bold outline-none cursor-pointer"
                              value={aiDifficulty}
                              onChange={e => setAiDifficulty(e.target.value)}
                            >
                              <option value="Beginner">مبتدئ (Beginner)</option>
                              <option value="Intermediate">متوسط (Intermediate)</option>
                              <option value="Advanced">متقدم (Advanced)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-black text-gray-400 uppercase mb-2">Number of Questions</label>
                            <select
                              className="w-full bg-black border-2 border-gray-800 focus:border-red-500 text-white rounded-xl p-3 font-bold outline-none cursor-pointer"
                              value={aiNumQuestions}
                              onChange={e => setAiNumQuestions(parseInt(e.target.value))}
                            >
                              <option value={3}>3 أسئلة</option>
                              <option value={5}>5 أسئلة</option>
                              <option value={10}>10 أسئلة</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-black text-gray-400 uppercase mb-2">Bloom's Taxonomy / Custom Directives (Optional)</label>
                          <textarea
                            placeholder="مثال: ركز على أسئلة الفهم والتحليل، واجعل الإجابات محيرة جداً لتمييز الطلاب الفائقين"
                            className="w-full bg-white/5 border-2 border-gray-800 focus:border-red-500 text-white font-bold p-3 rounded-xl outline-none"
                            rows={2}
                            value={aiCustomText}
                            onChange={e => setAiCustomText(e.target.value)}
                          />
                        </div>

                        <button
                          type="button"
                          disabled={isGeneratingAi}
                          onClick={handleGenerateAiQuiz}
                          className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-black py-4 rounded-xl transition text-lg tracking-wide uppercase flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(220,38,38,0.4)]"
                        >
                          {isGeneratingAi ? (
                            <>
                              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              GENERATING WITH AI...
                            </>
                          ) : (
                            <>
                              GENERATE EXAM <Sparkles className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Manual question addition */}
                    <div className="bg-black/60 border border-gray-800 p-6 rounded-2xl h-fit">
                      <h5 className="font-sans font-black text-white text-lg tracking-wider mb-4 border-b border-gray-800 pb-3">
                        ADD QUESTION MANUALLY
                      </h5>

                      <form onSubmit={handleAddQuestion} className="space-y-4">
                        <div>
                          <label className="block text-xs font-black text-gray-400 uppercase mb-2">Question Text</label>
                          <input
                            type="text"
                            required
                            placeholder="أدخل نص السؤال باللغة الإنجليزية"
                            className="w-full bg-white/5 border-2 border-gray-800 focus:border-red-500 text-white font-bold p-3 rounded-xl outline-none text-right"
                            value={newQuestion.question_text}
                            onChange={e => setNewQuestion(prev => ({ ...prev, question_text: e.target.value }))}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <input
                            type="text"
                            required
                            placeholder="Option A"
                            className="bg-white/5 border-2 border-gray-800 focus:border-red-500 text-white font-bold p-3 rounded-xl outline-none text-right"
                            value={newQuestion.choice_a}
                            onChange={e => setNewQuestion(prev => ({ ...prev, choice_a: e.target.value }))}
                          />
                          <input
                            type="text"
                            required
                            placeholder="Option B"
                            className="bg-white/5 border-2 border-gray-800 focus:border-red-500 text-white font-bold p-3 rounded-xl outline-none text-right"
                            value={newQuestion.choice_b}
                            onChange={e => setNewQuestion(prev => ({ ...prev, choice_b: e.target.value }))}
                          />
                          <input
                            type="text"
                            required
                            placeholder="Option C"
                            className="bg-white/5 border-2 border-gray-800 focus:border-red-500 text-white font-bold p-3 rounded-xl outline-none text-right"
                            value={newQuestion.choice_c}
                            onChange={e => setNewQuestion(prev => ({ ...prev, choice_c: e.target.value }))}
                          />
                          <input
                            type="text"
                            required
                            placeholder="Option D"
                            className="bg-white/5 border-2 border-gray-800 focus:border-red-500 text-white font-bold p-3 rounded-xl outline-none text-right"
                            value={newQuestion.choice_d}
                            onChange={e => setNewQuestion(prev => ({ ...prev, choice_d: e.target.value }))}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black text-gray-400 uppercase mb-2">Correct Option</label>
                          <select
                            className="w-full bg-black border-2 border-gray-800 focus:border-red-500 text-white rounded-xl p-3 font-bold outline-none cursor-pointer"
                            value={newQuestion.correct_answer}
                            onChange={e => setNewQuestion(prev => ({ ...prev, correct_answer: e.target.value }))}
                          >
                            <option value="A">CORRECT: A</option>
                            <option value="B">CORRECT: B</option>
                            <option value="C">CORRECT: C</option>
                            <option value="D">CORRECT: D</option>
                          </select>
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-xl transition"
                        >
                          إضافة السؤال
                        </button>
                      </form>
                    </div>

                  </div>

                  {/* Questions List */}
                  <div className="bg-black/60 border border-gray-800 p-6 rounded-2xl">
                    <h4 className="font-sans font-black text-white text-lg tracking-wider mb-4 border-b border-gray-800 pb-3">
                      CURRENT EXAM QUESTIONS
                    </h4>

                    {quizQuestions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 font-bold text-sm">
                        لا توجد أسئلة مضافة في هذا الاختبار حالياً.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {quizQuestions.map((q, idx) => (
                          <div key={q.id || idx} className="bg-white/5 border border-gray-800 p-4 rounded-xl flex items-center justify-between">
                            {editingQuestion === q.id ? (
                              <div className="flex-1 text-right pl-4 space-y-2">
                                <input className="w-full bg-gray-900 border border-gray-700 text-white px-2 py-1 rounded text-sm mb-2" value={editQuestionData.question_text} onChange={(e) => setEditQuestionData({...editQuestionData, question_text: e.target.value})} />
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <input className="w-full bg-gray-900 border border-gray-700 text-white px-2 py-1 rounded" value={editQuestionData.choice_a} onChange={(e) => setEditQuestionData({...editQuestionData, choice_a: e.target.value})} placeholder="Option A" />
                                  <input className="w-full bg-gray-900 border border-gray-700 text-white px-2 py-1 rounded" value={editQuestionData.choice_b} onChange={(e) => setEditQuestionData({...editQuestionData, choice_b: e.target.value})} placeholder="Option B" />
                                  <input className="w-full bg-gray-900 border border-gray-700 text-white px-2 py-1 rounded" value={editQuestionData.choice_c} onChange={(e) => setEditQuestionData({...editQuestionData, choice_c: e.target.value})} placeholder="Option C" />
                                  <input className="w-full bg-gray-900 border border-gray-700 text-white px-2 py-1 rounded" value={editQuestionData.choice_d} onChange={(e) => setEditQuestionData({...editQuestionData, choice_d: e.target.value})} placeholder="Option D" />
                                </div>
                                <select className="w-full bg-gray-900 border border-gray-700 text-white px-2 py-1 rounded text-xs mt-2" value={editQuestionData.correct_answer} onChange={(e) => setEditQuestionData({...editQuestionData, correct_answer: e.target.value})}>
                                  <option value="A">Option A</option>
                                  <option value="B">Option B</option>
                                  <option value="C">Option C</option>
                                  <option value="D">Option D</option>
                                </select>
                                <div className="mt-2 flex gap-2">
                                  <button onClick={() => handleSaveQuestionEdit(q.id)} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs font-bold">حفظ التعديلات</button>
                                  <button onClick={() => setEditingQuestion(null)} className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-xs font-bold">إلغاء</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="text-right">
                                  <span className="text-md font-bold text-white block">
                                    {idx + 1}. {q.question_text}
                                  </span>
                                  <span className="text-xs text-green-400 font-bold block mt-2">
                                    Correct option: {q.correct_answer}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingQuestion(q.id);
                                      setEditQuestionData(q);
                                    }}
                                    className="text-gray-400 hover:text-white p-2 border border-gray-800 hover:bg-gray-800 rounded-xl transition text-xs font-bold"
                                  >
                                    تعديل
                                  </button>
                                  <button
                                    onClick={() => handleDeleteQuestion(q.id)}
                                    className="text-rose-500 hover:text-rose-400 p-2 border border-rose-950/40 hover:bg-rose-950/20 rounded-xl transition"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          )}

          {activeTab === 'results' && (
            <div className="space-y-6">
              
              {/* Common Mistakes Analysis Section */}
              <div className="bg-gradient-to-br from-gray-950 to-slate-900 border-4 border-black shadow-[6px_6px_0px_#000] p-6 rounded-2xl">
                <div className="border-b-2 border-gray-800 pb-3 mb-6 text-right flex flex-col md:flex-row-reverse justify-between items-start md:items-center gap-4">
                  <div className="text-right">
                    <h4 className="font-sans font-black text-white text-xl tracking-wider flex items-center justify-end gap-2">
                      تحليل الأخطاء الشائعة والأسئلة الأكثر صعوبة 📊
                    </h4>
                    <p className="text-xs font-bold text-gray-500 mt-1">
                      اكتشف نقاط ضعف الطلاب والأسئلة التي تسببت في أكبر عدد من الأخطاء لمعالجتها فورا
                    </p>
                  </div>
                  <div className="w-full md:w-64 text-right">
                    <label className="text-xs text-gray-400 font-bold block mb-1.5">اختر الاختبار للتحليل:</label>
                    <select
                      className="w-full bg-black border-2 border-gray-800 focus:border-red-500 text-white rounded-xl p-2.5 font-bold outline-none cursor-pointer text-sm text-right"
                      value={analysisQuizId}
                      onChange={e => setAnalysisQuizId(e.target.value)}
                    >
                      <option value="">-- اختر اختباراً لعرض التحليل --</option>
                      {quizzes.map(q => (
                        <option key={q.id} value={q.id}>{q.quiz_name} ({q.class_name})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Analytics Content */}
                {!analysisQuizId ? (
                  <div className="text-center py-8 text-gray-500 font-bold text-sm bg-black/40 border border-gray-800/60 rounded-xl">
                    💡 يرجى اختيار اختبار من القائمة أعلاه لعرض الأسئلة الأكثر خطأً للطلاب.
                  </div>
                ) : (() => {
                  const quizResults = results.filter(r => r.quiz_id === analysisQuizId);
                  if (quizResults.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500 font-bold text-sm bg-black/40 border border-gray-800/60 rounded-xl">
                        📭 لا توجد نتائج مسجلة لهذا الاختبار حتى الآن.
                      </div>
                    );
                  }

                  // Compile question statistics
                  const questionStats: {
                    [qId: string]: {
                      question_text: string;
                      correct_answer: string;
                      choice_a: string;
                      choice_b: string;
                      choice_c: string;
                      choice_d: string;
                      total_attempts: number;
                      incorrect_attempts: number;
                      answers_distribution: { [ans: string]: number };
                    }
                  } = {};

                  quizResults.forEach(r => {
                    if (r.answers && Array.isArray(r.answers)) {
                      r.answers.forEach(ans => {
                        const qId = ans.question_id || ans.question_text;
                        if (!qId) return;
                        if (!questionStats[qId]) {
                          questionStats[qId] = {
                            question_text: ans.question_text || '',
                            correct_answer: ans.correct_answer || '',
                            choice_a: ans.choice_a || '',
                            choice_b: ans.choice_b || '',
                            choice_c: ans.choice_c || '',
                            choice_d: ans.choice_d || '',
                            total_attempts: 0,
                            incorrect_attempts: 0,
                            answers_distribution: { 'A': 0, 'B': 0, 'C': 0, 'D': 0 }
                          };
                        }
                        questionStats[qId].total_attempts++;
                        if (ans.student_answer) {
                          questionStats[qId].answers_distribution[ans.student_answer] = (questionStats[qId].answers_distribution[ans.student_answer] || 0) + 1;
                        }
                        if (ans.student_answer !== ans.correct_answer) {
                          questionStats[qId].incorrect_attempts++;
                        }
                      });
                    }
                  });

                  const sortedQuestions = Object.values(questionStats)
                    .filter(q => q.total_attempts > 0)
                    .sort((a, b) => b.incorrect_attempts - a.incorrect_attempts);

                  const hasDetailedData = sortedQuestions.length > 0;

                  if (!hasDetailedData) {
                    return (
                      <div className="text-center py-8 text-gray-500 font-bold text-sm bg-black/40 border border-gray-800/60 rounded-xl">
                        ⚠️ لا توجد بيانات تفصيلية متوفرة لهذا الاختبار بعد. البيانات التفصيلية تتوفر فقط للامتحانات التي تم حلها بعد تفعيل ميزة تصحيح الأخطاء الجديدة.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                        <div className="bg-black/40 border border-gray-800 p-4 rounded-xl text-center">
                          <span className="text-xs text-gray-500 font-bold block">إجمالي أوراق الإجابة</span>
                          <span className="text-2xl font-black text-white mt-1 block">{quizResults.length}</span>
                        </div>
                        <div className="bg-black/40 border border-gray-800 p-4 rounded-xl text-center">
                          <span className="text-xs text-gray-500 font-bold block">متوسط درجات الطلاب</span>
                          <span className="text-2xl font-black text-rose-500 mt-1 block">
                            {Math.round((quizResults.reduce((acc, curr) => acc + (curr.score || 0), 0) / quizResults.length) * 10) / 10} / {quizResults[0].total_questions} PTS
                          </span>
                        </div>
                        <div className="bg-black/40 border border-gray-800 p-4 rounded-xl text-center">
                          <span className="text-xs text-gray-500 font-bold block">نسبة النجاح العامة</span>
                          <span className="text-2xl font-black text-emerald-500 mt-1 block">
                            {Math.round((quizResults.filter(r => (r.score / r.total_questions) >= 0.5).length / quizResults.length) * 100)}%
                          </span>
                        </div>
                      </div>

                      <h5 className="font-sans font-black text-white text-md tracking-wider mb-2 text-right">
                        ⚠️ ترتيب الأسئلة الأكثر خطأً للطلاب (تنازلياً):
                      </h5>

                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                        {sortedQuestions.map((q, idx) => {
                          const errorRate = Math.round((q.incorrect_attempts / q.total_attempts) * 100);
                          return (
                            <div key={idx} className="bg-black/40 border border-gray-800 rounded-xl p-4 text-right flex flex-col md:flex-row-reverse justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex flex-row-reverse items-center justify-between gap-2 border-b border-gray-800/60 pb-2 mb-2">
                                  <span className="text-sm font-black text-white">السؤال الأكثر خطأً #{idx + 1}</span>
                                  <span className="bg-red-950/60 border border-red-900/60 text-red-400 px-2.5 py-1 rounded-lg text-xs font-bold">
                                    أخطأ فيه {q.incorrect_attempts} طلاب من أصل {q.total_attempts} ({errorRate}%)
                                  </span>
                                </div>
                                <p className="text-sm font-bold text-gray-300 leading-relaxed mb-3">{q.question_text}</p>
                                
                                {/* Choices list with indicators */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                  {[
                                    { label: 'A', text: q.choice_a },
                                    { label: 'B', text: q.choice_b },
                                    { label: 'C', text: q.choice_c },
                                    { label: 'D', text: q.choice_d }
                                  ].map(choice => {
                                    const isCorrect = q.correct_answer === choice.label;
                                    const selectedCount = q.answers_distribution[choice.label] || 0;
                                    const percentage = q.total_attempts > 0 ? Math.round((selectedCount / q.total_attempts) * 100) : 0;
                                    
                                    return (
                                      <div key={choice.label} className={`p-2.5 rounded-lg border ${
                                        isCorrect 
                                          ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300' 
                                          : 'bg-black/20 border-gray-800/80 text-gray-400'
                                      } flex justify-between items-center gap-2`}>
                                        <span className="font-mono text-gray-500">({percentage}%) اختره {selectedCount}</span>
                                        <span className="font-bold flex-1 text-right pr-2">{choice.text}</span>
                                        <span className={`w-5 h-5 rounded flex items-center justify-center font-mono font-black ${
                                          isCorrect ? 'bg-emerald-500 text-black' : 'bg-gray-800 text-gray-400'
                                        }`}>{choice.label}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Search and filter UI */}
              <div className="bg-black/60 border border-gray-800 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <input
                    type="text"
                    className="w-full bg-white/5 border-2 border-gray-800 focus:border-red-500 text-white font-bold p-3 rounded-xl outline-none transition text-right"
                    placeholder="ابحث بالاسم أو الكود..."
                    value={searchStudent}
                    onChange={e => setSearchStudent(e.target.value)}
                  />
                  <Search className="absolute left-4 top-3.5 text-gray-500 w-5 h-5" />
                </div>

                <select
                  className="bg-black border-2 border-gray-800 focus:border-red-500 text-white rounded-xl p-3 font-bold outline-none cursor-pointer"
                  value={filterClass}
                  onChange={e => setFilterClass(e.target.value)}
                >
                  <option value="all">كل الصفوف الدراسية</option>
                  <option value="الصف الأول الإعدادي">الصف الأول الإعدادي</option>
                  <option value="الصف الثاني الإعدادي">الصف الثاني الإعدادي</option>
                  <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
                  <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                  <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                  <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                </select>

                <select
                  className="bg-black border-2 border-gray-800 focus:border-red-500 text-white rounded-xl p-3 font-bold outline-none cursor-pointer"
                  value={filterGroup}
                  onChange={e => setFilterGroup(e.target.value)}
                >
                  <option value="all">كل المجموعات (الأيام)</option>
                  <option value="السبت">السبت</option>
                  <option value="الأحد">الأحد</option>
                  <option value="الإثنين">الإثنين</option>
                  <option value="الثلاثاء">الثلاثاء</option>
                  <option value="الأربعاء">الأربعاء</option>
                  <option value="الخميس">الخميس</option>
                  <option value="الجمعة">الجمعة</option>
                </select>
              </div>

              {/* Score log list */}
              <div className="bg-black/60 border border-gray-800 rounded-2xl overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-950 text-gray-400 font-bold text-sm">
                      <th className="p-4">كود البطل</th>
                      <th className="p-4">الاسم</th>
                      <th className="p-4">الاختبار</th>
                      <th className="p-4">الصف والمجموعة</th>
                      <th className="p-4">الدرجة</th>
                      <th className="p-4 text-center">أخطاء الطالب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500 font-bold text-sm">
                          لا توجد سجلات درجات تطابق معايير البحث الحالية.
                        </td>
                      </tr>
                    ) : (
                      filteredResults.map((r, idx) => (
                        <tr key={r.id || idx} className="border-b border-gray-900 hover:bg-white/5 transition font-bold text-sm">
                          <td className="p-4 font-mono text-red-500">{r.student_code}</td>
                          <td className="p-4 text-white uppercase">{r.student_name}</td>
                          <td className="p-4 text-gray-300">{r.quiz_name}</td>
                          <td className="p-4 text-gray-400">
                            {r.class_name} <br />
                            <span className="text-xs text-gray-500">مجموعة: {r.group_name}</span>
                          </td>
                          <td className="p-4">
                            <span className="bg-rose-950 text-rose-400 border border-rose-900/40 px-3 py-1.5 rounded-lg font-mono">
                              {r.score} / {r.total_questions} PTS
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            {r.answers && r.answers.length > 0 ? (
                              <button
                                onClick={() => setInspectingResult(r)}
                                className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg border border-sky-500 transition cursor-pointer inline-flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                عرض الأخطاء
                              </button>
                            ) : (
                              <span className="text-xs text-gray-500 font-semibold italic">غير مسجلة تفصيلياً</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {activeTab === 'rankings' && (
            <div className="space-y-6">
              
              {/* Rankings generator form */}
              <div className="bg-black/60 border border-gray-800 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  className="bg-black border-2 border-gray-800 focus:border-red-500 text-white rounded-xl p-3 font-bold outline-none cursor-pointer"
                  value={rankClass}
                  onChange={e => setRankClass(e.target.value)}
                >
                  <option value="all">كل الصفوف الدراسية (عام)</option>
                  <option value="الصف الأول الإعدادي">الصف الأول الإعدادي</option>
                  <option value="الصف الثاني الإعدادي">الصف الثاني الإعدادي</option>
                  <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
                  <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                  <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                  <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                </select>

                <select
                  className="bg-black border-2 border-gray-800 focus:border-red-500 text-white rounded-xl p-3 font-bold outline-none cursor-pointer"
                  value={rankGroup}
                  onChange={e => setRankGroup(e.target.value)}
                >
                  <option value="all">كل المجموعات (الأيام)</option>
                  <option value="السبت">السبت</option>
                  <option value="الأحد">الأحد</option>
                  <option value="الإثنين">الإثنين</option>
                  <option value="الثلاثاء">الثلاثاء</option>
                  <option value="الأربعاء">الأربعاء</option>
                  <option value="الخميس">الخميس</option>
                  <option value="الجمعة">الجمعة</option>
                </select>

                <button
                  type="button"
                  onClick={handleGenerateRankings}
                  className="bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-xl transition text-md uppercase flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(220,38,38,0.4)]"
                >
                  GENERATE LEADERBOARD <Trophy className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                </button>
              </div>

              {/* Leaderboard Podium */}
              <div className="bg-black/60 border border-gray-800 rounded-2xl overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-950 text-gray-400 font-bold text-sm">
                      <th className="p-4 text-center">الترتيب</th>
                      <th className="p-4">كود واسم الطالب</th>
                      <th className="p-4">المرحلة الدراسية</th>
                      <th className="p-4 text-center">مجموع النقاط</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-500 font-bold text-sm">
                          يرجى اختيار الصف والمجموعة للبدء في توليد لوحة الشرف للأبطال!
                        </td>
                      </tr>
                    ) : (
                      rankings.map((r, idx) => {
                        let styleClass = "";
                        let rankIcon = `#${idx + 1}`;
                        if (idx === 0) {
                          styleClass = "bg-yellow-950/20 text-yellow-300";
                          rankIcon = "🏆 #1";
                        } else if (idx === 1) {
                          styleClass = "bg-slate-900/30 text-slate-300";
                          rankIcon = "🥈 #2";
                        } else if (idx === 2) {
                          styleClass = "bg-amber-950/20 text-amber-500";
                          rankIcon = "🥉 #3";
                        }

                        return (
                          <tr key={idx} className={`border-b border-gray-900 hover:bg-white/5 transition font-bold text-sm ${styleClass}`}>
                            <td className="p-4 text-center font-black">{rankIcon}</td>
                            <td className="p-4">
                              <span className="text-white block uppercase">{r.name}</span>
                              <span className="text-xs text-red-500 font-mono mt-0.5 block">{r.code}</span>
                            </td>
                            <td className="p-4">
                              <span className="text-gray-300 block">{r.className}</span>
                              <span className="text-xs text-gray-500 mt-0.5 block">مجموعة: {r.groupName}</span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="bg-red-600 text-white border-2 border-black px-3 py-1 font-black rounded font-mono">
                                {r.totalScore}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* Tab: Messages */}
          {activeTab === 'messages' && (
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-gray-800 pb-4">
                <h2 className="text-2xl font-black text-white italic tracking-widest uppercase flex items-center gap-2">
                  <span className="bg-rose-600 w-2 h-8 block"></span>
                  رسائل الطلاب والإنذارات الحية
                </h2>
                
                {messages.length > 0 && (
                  <div className="flex gap-2 w-full md:w-auto">
                    <button
                      onClick={handleToggleSelectAllMessages}
                      className="bg-gray-800 hover:bg-gray-750 text-white font-bold px-4 py-2 rounded-xl text-xs transition border border-gray-700 flex items-center gap-1.5"
                    >
                      {selectedMessageIds.length === messages.length ? "إلغاء تحديد الكل" : "تحديد الكل"}
                    </button>
                    {selectedMessageIds.length > 0 && (
                      <button
                        onClick={handleDeleteSelectedMessages}
                        className="bg-red-600 hover:bg-red-500 text-white font-black px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-red-600/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        حذف المحدد ({selectedMessageIds.length})
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-10 text-gray-500 font-bold">لا توجد رسائل حالياً.</div>
                ) : (
                  messages.map(msg => {
                    const isSelected = selectedMessageIds.includes(msg.id);
                    return (
                      <div
                        key={msg.id}
                        onClick={() => handleToggleMessageSelect(msg.id)}
                        className={`cursor-pointer transition duration-300 bg-black/50 border rounded-2xl p-6 flex flex-col md:flex-row gap-4 items-start relative overflow-hidden ${
                          isSelected ? 'border-rose-500 bg-rose-950/10' : 'border-gray-800 hover:border-gray-700'
                        }`}
                      >
                        {/* Selection Checkbox */}
                        <div className="flex items-center justify-center shrink-0 mt-1 md:mt-2">
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                            isSelected ? 'bg-rose-600 border-rose-500 text-white scale-110' : 'border-gray-700 bg-black/50'
                          }`}>
                            {isSelected && <Check className="w-4 h-4" />}
                          </div>
                        </div>

                        {/* Message content */}
                        <div className="flex-1 text-right w-full">
                          {msg.is_anonymous && (
                            <div className="absolute top-0 left-12 bg-gray-800 text-gray-300 text-[10px] font-black px-3 py-1 rounded-b-xl border-l border-r border-b border-gray-700">
                              مجهول
                            </div>
                          )}
                          {!msg.is_anonymous && (
                            <div className="absolute top-0 left-12 bg-sky-900/40 text-sky-300 text-[10px] font-black px-3 py-1 rounded-b-xl border-l border-r border-b border-sky-800">
                              باسم الطالب
                            </div>
                          )}

                          {/* Instant single delete button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSingleMessage(msg.id);
                            }}
                            className="absolute left-3 top-3 p-2 rounded-lg bg-gray-900/60 hover:bg-red-600/20 text-gray-500 hover:text-red-500 border border-gray-800/80 hover:border-red-900/50 transition"
                            title="حذف الرسالة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          
                          <div className="flex justify-between items-start mb-4 pr-1">
                            <div className="text-right">
                              <span className={`block font-black text-lg ${msg.is_anonymous ? 'text-gray-400' : 'text-white'}`}>
                                {msg.student_name}
                              </span>
                              {!msg.is_anonymous && (
                                <span className="text-xs text-sky-400 font-mono block mt-1">{msg.student_code} | {msg.class_name}</span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 font-bold ml-12" dir="ltr">
                              {new Date(msg.timestamp).toLocaleString('ar-EG')}
                            </span>
                          </div>
                          
                          <div className="bg-gray-850 p-4 rounded-xl border border-gray-800 text-right">
                            <p className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed font-semibold">
                              {msg.text}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Student Detailed Mistakes Modal (For Teacher) */}
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
                  className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white p-2 rounded-lg transition cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
                <div>
                  <h3 className="font-sans font-black text-white text-xl tracking-wide">
                    {inspectingResult.quiz_name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    عرض إجابات الطالب ومراجعة أخطائه بالتفصيل
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
                  <span className="text-xs text-gray-400 block mt-0.5">الكود: {inspectingResult.student_code} | الصف: {inspectingResult.class_name} | المجموعة: {inspectingResult.group_name}</span>
                </div>
              </div>

              {/* Questions List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {!inspectingResult.answers || inspectingResult.answers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 font-bold">
                    ⚠️ لم يتم العثور على سجل إجابات تفصيلي لهذا الامتحان القديم.
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
                                      إجابة الطالب
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
                  إغلاق
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
