import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Smartphone, Sparkles } from 'lucide-react';

export default function AppDownloadPrompt() {
  const [isWebView, setIsWebView] = useState<boolean>(true); // default to true until checked
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [checked, setChecked] = useState<boolean>(false);

  useEffect(() => {
    // 1. Detect WebView
    const ua = navigator.userAgent || '';
    
    // Android WebView detection
    const isAndroidWebView = /wv/i.test(ua) || (/Android/i.test(ua) && /Version\/[0-9.]+/i.test(ua) && !/Chrome\/[0-9.]+/i.test(ua));
    // iOS WebView detection
    const isIOSWebView = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(ua);
    
    const webViewDetected = !!(isAndroidWebView || isIOSWebView);

    setIsWebView(webViewDetected);
    setChecked(true);

    if (!webViewDetected) {
      // It's a standard web browser
      const isPopupDismissed = sessionStorage.getItem('dismissed_apk_popup') === 'true';
      if (!isPopupDismissed) {
        setShowPopup(true);
      } else {
        setShowBanner(true);
      }
    }
  }, []);

  const handleDismissPopup = () => {
    sessionStorage.setItem('dismissed_apk_popup', 'true');
    setShowPopup(false);
    setShowBanner(true);
  };

  const handleDownload = () => {
    window.location.href = 'https://github.com/mrahmedgamal636/Ahmed_gamal_plateform/releases/download/Studentportal/Ahmed.Gamal.apk';
  };

  if (!checked || isWebView) return null;

  return (
    <>
      {/* Sticky Banner at Top of Page */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 border-b-4 border-black text-black font-sans font-black flex items-center justify-between px-4 py-2.5 z-50 sticky top-0 shadow-[0_4px_15px_rgba(239,68,68,0.3)] gap-2 select-none"
            id="apk-download-banner"
          >
            <div className="flex items-center gap-3 text-right">
              <span className="bg-black text-yellow-400 border-2 border-black font-sans font-black text-[10px] px-2 py-0.5 rounded-md shadow-[2px_2px_0px_#000] uppercase tracking-wider animate-pulse hidden sm:inline-block">
                تطبيق رسمي
              </span>
              <span className="text-white text-xs sm:text-sm font-black flex items-center gap-1.5 drop-shadow-[1px_1px_0px_rgba(0,0,0,0.8)]">
                <Smartphone className="w-4 h-4 text-yellow-300" />
                استخدم التطبيق الرسمي للحصول على أفضل تجربة وسرعة مضاعفة!
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleDownload}
                className="bg-yellow-400 hover:bg-yellow-300 text-black border-2 border-black font-sans font-black text-xs px-3.5 py-1.5 rounded-xl shadow-[3px_3px_0px_#000] transition active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                تثبيت الآن
              </button>
              <button
                onClick={() => setShowBanner(false)}
                className="text-white hover:text-black hover:bg-white/20 p-1.5 rounded-xl transition cursor-pointer"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Popup Modal Window */}
      <AnimatePresence>
        {showPopup && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-gradient-to-b from-gray-900 via-gray-950 to-black border-4 border-rose-600 shadow-[0_0_50px_rgba(226,54,54,0.4),10px_10px_0px_#000] rounded-3xl p-6 md:p-8 relative text-center"
              id="apk-download-popup"
            >
              {/* Badge */}
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-black border-4 border-black font-sans font-black text-sm px-5 py-1.5 uppercase tracking-widest rounded-xl shadow-[4px_4px_0px_#000] rotate-2 z-10 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 animate-spin" />
                تحميل التطبيق
              </div>

              {/* Close Button */}
              <button
                onClick={handleDismissPopup}
                className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-800/50 hover:bg-red-600/20 border border-gray-700/50 p-2 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mt-6 space-y-6 text-right">
                <div className="flex flex-col items-center justify-center pt-4">
                  <div className="p-4 bg-rose-600/10 border-2 border-rose-500 text-rose-400 rounded-3xl mb-4 shadow-[0_0_20px_rgba(226,54,54,0.2)] animate-bounce">
                    <Smartphone className="w-12 h-12" />
                  </div>
                  <h3 className="text-2xl font-black text-white text-center tracking-tight leading-snug">
                    تطبيق المنصة الرسمي متاح الآن للأندرويد!
                  </h3>
                </div>

                <div className="bg-black/40 border-2 border-gray-800 p-4 rounded-2xl text-right space-y-3">
                  <p className="text-gray-300 text-sm leading-relaxed">
                    من أجل تجربة تعليمية متميزة وسلسة، قمنا بإطلاق تطبيق الأندرويد الرسمي لطلابنا.
                  </p>
                  <ul className="text-xs text-cyan-400 space-y-1.5 font-bold list-disc list-inside">
                    <li>سرعة فائقة واستقرار تام في تشغيل الفيديوهات.</li>
                    <li>إشعارات فورية بالامتحانات والدرجات والواجبات.</li>
                    <li>سهولة تامة في تصفح المحتوى والدردشة المباشرة.</li>
                  </ul>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleDownload}
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-4 rounded-2xl shadow-[0_4px_20px_rgba(226,54,54,0.4)] hover:shadow-[0_4px_25px_rgba(226,54,54,0.6)] border-2 border-rose-500 transform hover:-translate-y-0.5 transition active:translate-y-0 text-lg flex justify-center items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-5 h-5 animate-pulse" />
                    تحميل التطبيق الآن (APK)
                  </button>

                  <button
                    onClick={handleDismissPopup}
                    className="w-full bg-transparent hover:bg-white/5 text-gray-400 hover:text-white font-black py-3 rounded-2xl border-2 border-gray-800 transition text-sm cursor-pointer"
                  >
                    تخطي والمتابعة عبر المتصفح
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
