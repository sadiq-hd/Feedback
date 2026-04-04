/* ═══════════════════════════════════════════════════
   QUESTIONS CONFIG — عدّل هنا بدون ما تلمس أي كود ثاني
   ═══════════════════════════════════════════════════
   كل سؤال يحتاج:
     id    — مفتاح فريد (بالإنجليزي بدون مسافات)
     text  — نص السؤال اللي يظهر للمستخدم
   ═══════════════════════════════════════════════════ */

const QUESTIONS = [
  {
    id:   "overall_experience",
    text: "How would you rate your overall experience at this event?"
  },
  {
    id:   "content_quality",
    text: "How satisfied are you with the quality and relevance of the content?"
  },
  {
    id:   "organization",
    text: "How well was the event organized in terms of scheduling and flow?"
  },
  {
    id:   "venue_facilities",
    text: "How would you rate the venue, facilities, and overall environment?"
  },
  {
    id:   "would_recommend",
    text: "How likely are you to recommend this event to a colleague?"
  }
];

/* ═══════════════════════════════════════════════════
   SETTINGS
   ═══════════════════════════════════════════════════ */
const CONFIG = {
  RESET_DELAY:   6,      // ثواني قبل ما يرجع للشاشة الرئيسية بعد الإرسال
  ADMIN_PIN:     "1234", // ← غيّر هذا الرقم
  ADMIN_TAPS:    7,      // عدد النقرات على الزاوية لفتح الأدمن
  AUTO_NEXT:     false,  // true = ينتقل تلقائي بعد اختيار الإيموجي (بدون زر Next)
};