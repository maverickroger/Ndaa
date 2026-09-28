import React, { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  User 
} from 'firebase/auth';
import { auth } from './firebase';
import { 
  initializeUserDatabase, 
  getUserProfile, 
  updateUserProfile, 
  getChapters, 
  updateChapter, 
  addDailyLog, 
  getDailyLogs, 
  addMockTest, 
  getMockTests, 
  getPyqByYear, 
  savePyqYearCount, 
  getRevisionQueue, 
  saveRevisionQueueItem, 
  fetchCommunityProfiles,
  fetchCommunityActivity,
  syncCommunityProfile,
  addCommunityActivity,
  UserProfile, 
  ChapterData, 
  DailyLogDoc, 
  MockTestDoc, 
  PyqByYearDoc, 
  RevisionItem, 
  PublicCommunityProfile,
  PublicCommunityActivity
} from './dbUtils';
import { 
  NDA_MATH_CHAPTERS, 
  MATH_CATEGORIES, 
  DEFAULT_PYQ_TARGET_PER_CHAPTER, 
  DEFAULT_MOCK_TARGET_OVERALL,
  TOTAL_MATH_CHAPTERS, 
  TOTAL_PYQ_TARGET 
} from './syllabus';
import { 
  generateSingleChapterPlan, 
  SingleChapterPlan, 
  PlanDayItem 
} from './studyPlanner';
import { ChaptersView } from './components/ChaptersView';
import { StudyPlannerView } from './components/StudyPlannerView';
import { CommunityView } from './components/CommunityView';
import { 
  Layers, 
  CheckSquare, 
  Clock, 
  TrendingUp, 
  Inbox, 
  RefreshCw, 
  BarChart3, 
  Settings, 
  LogOut, 
  Sparkles,
  ChevronRight,
  Users
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chapters' | 'planner' | 'study_log' | 'mocks' | 'pyq' | 'revision' | 'reports' | 'community' | 'profile'>('dashboard');

  // Database state
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLogDoc[]>([]);
  const [mockTests, setMockTests] = useState<MockTestDoc[]>([]);
  const [pyqYears, setPyqYears] = useState<PyqByYearDoc[]>([]);
  const [revisionQueue, setRevisionQueue] = useState<RevisionItem[]>([]);
  const [studyPlan, setStudyPlan] = useState<SingleChapterPlan | null>(null);
  
  // Community data
  const [publicProfiles, setPublicProfiles] = useState<PublicCommunityProfile[]>([]);
  const [activities, setActivities] = useState<PublicCommunityActivity[]>([]);

  // UI feedback
  const [globalLoading, setGlobalLoading] = useState(false);
  const [operationMsg, setOperationMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'error') => {
    setOperationMsg({ text, type });
    setTimeout(() => {
      setOperationMsg(null);
    }, 4000);
  };

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    setGlobalLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        const uProfile = await initializeUserDatabase(
          result.user.uid,
          result.user.email || "",
          result.user.displayName || "Aspirant",
          result.user.photoURL || ""
        );
        setProfile(uProfile);
        showFeedback("Welcome to NDA Mathematics Chapter Tracker.", "success");
      }
    } catch (error: any) {
      if (
        error?.code === 'auth/popup-closed-by-user' ||
        error?.code === 'auth/user-cancelled' ||
        error?.code === 'auth/cancelled-popup-request'
      ) {
        return;
      }
      console.error(error);
      showFeedback("Authentication could not be completed. Please try again.", "error");
    } finally {
      setGlobalLoading(false);
    }
  };

  // Sign Out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setProfile(null);
      setChapters([]);
      setDailyLogs([]);
      setMockTests([]);
      setPyqYears([]);
      setRevisionQueue([]);
      setStudyPlan(null);
      setPublicProfiles([]);
      setActivities([]);
      showFeedback("Signed out successfully.", "success");
    } catch (error) {
      console.error(error);
    }
  };

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: any) => {
      if (user) {
        setCurrentUser(user);
        try {
          const freshProfile = await initializeUserDatabase(
            user.uid,
            user.email || "",
            user.displayName || "Aspirant",
            user.photoURL || ""
          );
          setProfile(freshProfile);
          await loadUserData(user.uid, freshProfile);
        } catch (e) {
          console.error("Failed to load user profile", e);
        }
      } else {
        setCurrentUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch all user state from Firestore
  const loadUserData = async (uid: string, currentProfile?: UserProfile) => {
    try {
      setGlobalLoading(true);
      const fetchedChapters = await getChapters(uid);
      setChapters(fetchedChapters);

      const fetchedPyqs = await getPyqByYear(uid);
      setPyqYears(fetchedPyqs);

      let loadedMocks: MockTestDoc[] = [];
      let loadedLogs: DailyLogDoc[] = [];
      let loadedRevs: RevisionItem[] = [];

      try {
        loadedLogs = await getDailyLogs(uid);
        setDailyLogs(loadedLogs);
      } catch (e) {
        console.warn("Error loading daily logs", e);
      }

      try {
        loadedMocks = await getMockTests(uid);
        setMockTests(loadedMocks);
      } catch (e) {
        console.warn("Error loading mock tests", e);
      }

      try {
        loadedRevs = await getRevisionQueue(uid);
        setRevisionQueue(loadedRevs);
      } catch (e) {
        console.warn("Error loading revision queue", e);
      }

      const activeProf = currentProfile || profile;
      if (activeProf) {
        // Sync public community stats in Firestore
        await syncCommunityProfile(uid, activeProf, fetchedChapters, loadedMocks.length);
      }

      // Fetch community profiles and activity stream
      try {
        const board = await fetchCommunityProfiles();
        setPublicProfiles(board);
        const activeFeed = await fetchCommunityActivity();
        setActivities(activeFeed);
      } catch (e) {
        console.warn("Error loading community statistics", e);
      }

      // Generate AI Single-Chapter Smart Plan
      if (activeProf) {
        const plan = generateSingleChapterPlan(
          activeProf,
          fetchedChapters,
          loadedMocks,
          loadedRevs
        );
        setStudyPlan(plan);
      }

    } catch (e) {
      console.error("Error loading user dataset", e);
    } finally {
      setGlobalLoading(false);
    }
  };

  // Chapter update handler
  const handleUpdateChapter = async (chapterId: string, fields: Partial<ChapterData>) => {
    if (!profile) return;
    try {
      setGlobalLoading(true);
      const updated = await updateChapter(profile.uid, chapterId, fields);
      
      setChapters(prev => prev.map(c => c.id === chapterId ? updated : c));

      // Register public community activity logs
      if (fields.completed === true) {
        await addCommunityActivity(profile.uid, profile.name, 'CHAPTER_COMPLETED', updated.name);
      } else if (fields.revisionStatus && fields.revisionStatus !== 'Not Started') {
        await addCommunityActivity(profile.uid, profile.name, 'REVISION_COMPLETED', updated.name);
      }

      // Refresh community view records
      await loadUserData(profile.uid, profile);
      showFeedback(`${updated.name} updated.`, "success");
    } catch (e) {
      console.error(e);
      showFeedback("Failed to update chapter", "error");
    } finally {
      setGlobalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0C] text-[#E9E9EC] flex items-center justify-center font-sans select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border border-[#26262B] border-t-[#4F8CFF] animate-spin"></div>
          <p className="text-[#8A8A93] text-xs uppercase tracking-widest font-mono">Loading NDA Mathematics Engine</p>
        </div>
      </div>
    );
  }

  // Guest / Login Screen
  if (!currentUser || !profile) {
    return (
      <div className="min-h-screen bg-[#0B0B0C] text-[#E9E9EC] flex items-center justify-center p-6 font-sans select-none">
        <div className="max-w-md w-full border border-[#26262B] bg-[#141416] p-8">
          <div className="space-y-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-[#0B0B0C] border border-[#26262B] text-[#4F8CFF]">
              <Layers size={22} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-medium uppercase tracking-wider text-[#E9E9EC]">NDA Mathematics Tracker</h1>
              <p className="text-xs text-[#8A8A93] mt-2 leading-relaxed font-mono">
                27-Chapter prerequisite learning order &bull; 100 PYQs per chapter &bull; 15 Mock Tests target.
              </p>
            </div>

            <div className="border-t border-[#26262B] my-6"></div>

            <button
              onClick={handleGoogleSignIn}
              disabled={globalLoading}
              className="w-full h-11 bg-[#0B0B0C] hover:bg-[#1C1C1E] border border-[#26262B] hover:border-[#4F8CFF] text-[#E9E9EC] transition-colors text-sm font-medium uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer font-mono"
            >
              {globalLoading ? (
                <span className="w-4 h-4 border border-[#26262B] border-t-[#4F8CFF] animate-spin"></span>
              ) : (
                <>Sign In with Google</>
              )}
            </button>

            <div className="text-[11px] text-[#8A8A93] leading-relaxed font-mono">
              Compare study progress with opted-in aspirants &bull; Data privacy default: OFF.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Core metrics calculation
  const totalChaptersCount = TOTAL_MATH_CHAPTERS; // 27
  const completedChaptersCount = chapters.filter(c => c.completed).length;
  const overallCompletionPercentage = totalChaptersCount > 0 ? (completedChaptersCount / totalChaptersCount) * 100 : 0;
  const totalStudyHours = chapters.reduce((sum, c) => sum + (c.studyHours || 0), 0);
  const totalPyqsSolved = chapters.reduce((sum, c) => sum + (c.pyqSolved || 0), 0);
  const totalMockTestsCount = mockTests.length;
  const scoredChapters = chapters.filter(c => c.averageScore > 0);
  const generalAverageScore = scoredChapters.length > 0 ? scoredChapters.reduce((sum, c) => sum + c.averageScore, 0) / scoredChapters.length : 0;

  const targetExamDate = new Date(profile.examDate || '2027-04-15');
  const todayDate = new Date();
  const daysToExam = Math.max(0, Math.ceil((targetExamDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)));

  // Aggregate Community Indicators
  const aggStudyHours = publicProfiles.reduce((sum, p) => sum + p.studyHours, 0);
  const aggPyqsSolved = publicProfiles.reduce((sum, p) => sum + p.pyqsSolved, 0);
  const aggMocksCount = publicProfiles.reduce((sum, p) => sum + p.mockTests, 0);

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-[#E9E9EC] flex flex-col md:flex-row font-sans selection:bg-[#4F8CFF]/20 selection:text-[#E9E9EC]">
      
      {/* Toast Notification */}
      {operationMsg && (
        <div className={`fixed top-4 right-4 z-50 border px-4 py-3 font-mono text-xs max-w-sm flex items-center justify-between transition-opacity duration-150 ${
          operationMsg.type === 'success' ? 'bg-[#141416] border-[#4F8CFF] text-[#E9E9EC]' : 'bg-[#1D1014] border-[#FF5F5F] text-[#FF9E9E]'
        }`}>
          <span>{operationMsg.text}</span>
        </div>
      )}

      {/* FIXED LEFT SIDEBAR (Desktop) */}
      <aside className="hidden md:flex flex-col w-[220px] bg-[#141416] border-r border-[#26262B] p-5 h-screen sticky top-0 justify-between select-none">
        <div className="space-y-6">
          <div>
            <h1 className="text-sm font-semibold tracking-widest uppercase text-[#E9E9EC]">NDA MATHS</h1>
            <p className="text-[10px] text-[#8A8A93] tracking-widest mt-0.5 uppercase">Chapter Tracker</p>
          </div>

          <div className="border-t border-[#26262B]"></div>

          <nav className="flex flex-col gap-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Layers },
              { id: 'chapters', label: 'Syllabus', icon: CheckSquare },
              { id: 'planner', label: 'Study Planner', icon: Sparkles },
              { id: 'study_log', label: 'Study Log', icon: Clock },
              { id: 'mocks', label: 'Mock Tests', icon: TrendingUp },
              { id: 'pyq', label: 'PYQ Matrix', icon: Inbox },
              { id: 'revision', label: 'Revision', icon: RefreshCw },
              { id: 'reports', label: 'Reports', icon: BarChart3 },
              { id: 'community', label: 'Community', icon: Users },
              { id: 'profile', label: 'Profile', icon: Settings },
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer text-left ${
                    isActive 
                      ? 'bg-[#0B0B0C] border-l-2 border-[#4F8CFF] text-[#E9E9EC]' 
                      : 'text-[#8A8A93] hover:text-[#E9E9EC] hover:bg-[#0B0B0C]/40'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-[#4F8CFF]' : 'text-[#8A8A93]'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3">
          <div className="border-t border-[#26262B] pt-4"></div>
          
          <div className="flex items-center gap-3">
            {profile.photoURL ? (
              <img src={profile.photoURL} alt="" className="w-8 h-8 rounded-none border border-[#26262B]" />
            ) : (
              <div className="w-8 h-8 bg-[#0B0B0C] border border-[#26262B] flex items-center justify-center text-xs font-mono">A</div>
            )}
            <div className="truncate flex-1">
              <div className="text-xs font-medium truncate text-[#E9E9EC]">{profile.name}</div>
              <div className="text-[10px] text-[#8A8A93] truncate uppercase font-mono">
                Logins: {profile.loginCount || 1}
              </div>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full h-8 bg-[#0B0B0C] border border-[#26262B] hover:border-[#FF5F5F] hover:text-[#FF9E9E] transition-colors text-[10px] font-medium uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer font-mono"
          >
            <LogOut size={12} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <header className="md:hidden bg-[#141416] border-b border-[#26262B] px-4 py-3 flex items-center justify-between select-none">
        <div>
          <h1 className="text-xs font-semibold tracking-wider uppercase text-[#E9E9EC]">NDA Mathematics</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSignOut} className="p-1 text-[#8A8A93] hover:text-[#FF5F5F]">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-6xl mx-auto w-full pb-20 md:pb-8">
        
        {/* COUNTDOWN */}
        <section className="bg-[#141416] border border-[#26262B] p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
          <div>
            <div className="text-xs text-[#8A8A93] uppercase tracking-widest font-mono">Exam countdown</div>
            <div className="text-3xl font-light tracking-tight text-[#E9E9EC] mt-1 font-mono">
              Exam in <span className="text-[#4F8CFF] font-medium">{daysToExam}</span> days
            </div>
            <div className="text-[11px] text-[#8A8A93] mt-1 uppercase tracking-wider font-mono">
              Target Date: {profile.examDate} &bull; Exam Year {profile.targetYear}
            </div>
          </div>
          
          <div className="flex items-center gap-3 border-l-0 md:border-l border-[#26262B] pl-0 md:pl-6 pt-3 md:pt-0 font-mono text-xs text-[#8A8A93]">
            <div className="flex flex-col">
              <span className="uppercase tracking-wider">Candidate Visibility</span>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${profile.communityPublic ? 'bg-green-500' : 'bg-[#8A8A93]'}`}></span>
                <span className="text-xs text-[#E9E9EC]">
                  {profile.communityPublic ? 'Public in Community' : 'Private (Default OFF)'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* TAB: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* NUMERICAL STATS */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 font-mono select-none">
              {[
                { label: 'Completion', val: `${overallCompletionPercentage.toFixed(1)}%`, desc: `${completedChaptersCount}/27 chapters` },
                { label: 'Study Hours', val: `${totalStudyHours.toFixed(1)}h`, desc: `Goal: ${profile.dailyGoal}h/day` },
                { label: 'PYQs Solved', val: totalPyqsSolved, desc: `Target: 100 / ch` },
                { label: 'Mock Tests', val: `${totalMockTestsCount} / 15`, desc: `120 Qs / 300 pts` },
                { label: 'Average Score', val: generalAverageScore > 0 ? `${generalAverageScore.toFixed(0)}%` : '-', desc: `Chapter sets` },
                { label: 'Current Streak', val: `9 days`, desc: `Continuous logs` },
              ].map((stat, i) => (
                <div key={i} className="bg-[#141416] border border-[#26262B] p-4 text-left">
                  <div className="text-[10px] text-[#8A8A93] uppercase tracking-wider">{stat.label}</div>
                  <div className="text-xl font-medium tracking-tight text-[#E9E9EC] mt-2">{stat.val}</div>
                  <div className="text-[10px] text-[#8A8A93] mt-1 truncate">{stat.desc}</div>
                </div>
              ))}
            </div>

            {/* AI SINGLE CHAPTER FOCUS WIDGET */}
            {studyPlan && (
              <div className="bg-[#141416] border border-[#26262B] p-5 select-none font-mono">
                <div className="flex items-center justify-between pb-3 border-b border-[#26262B]">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-[#4F8CFF]" />
                    <h3 className="text-xs font-semibold tracking-wider uppercase text-[#E9E9EC]">
                      Active Locked Chapter: {studyPlan.chapterName} (Day {studyPlan.currentDayNumber} of {studyPlan.totalDays})
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('planner')}
                    className="text-[10px] text-[#4F8CFF] hover:text-[#E9E9EC] uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open AI Planner</span>
                    <ChevronRight size={12} />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-[#0B0B0C] border border-[#26262B] p-3 space-y-1">
                    <div className="text-[10px] text-[#8A8A93] uppercase">Today's Focus Subtopics</div>
                    <div className="text-xs text-[#E9E9EC] font-medium truncate">
                      {studyPlan.todayDayItem?.subtopicNames.join(', ') || studyPlan.chapterName}
                    </div>
                  </div>

                  <div className="bg-[#0B0B0C] border border-[#26262B] p-3 space-y-1">
                    <div className="text-[10px] text-[#8A8A93] uppercase">Daily Targets</div>
                    <div className="text-xs text-[#E9E9EC] font-medium">
                      {studyPlan.todayDayItem?.quesTarget || 20} Questions &bull; {studyPlan.todayDayItem?.pyqTarget || 10} PYQs
                    </div>
                  </div>

                  <div className="bg-[#0B0B0C] border border-[#26262B] p-3 space-y-1">
                    <div className="text-[10px] text-[#8A8A93] uppercase">Chapter Mastery</div>
                    <div className="text-xs text-[#4F8CFF] font-medium">
                      {studyPlan.progress.overallPercentage}% (Strict Single-Chapter Focus)
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* QUICK STUDY LOGGER */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-[#141416] border border-[#26262B] p-5">
                <h3 className="text-xs font-semibold tracking-wider uppercase text-[#E9E9EC]">Quick Mathematics Study Logger</h3>
                <p className="text-[11px] text-[#8A8A93] mt-1 uppercase tracking-wider">Commit study hours to cloud database &amp; Community Activity feed</p>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const formData = new FormData(form);
                  const chId = formData.get('chapter') as string;
                  const hours = parseFloat(formData.get('hours') as string || '0');
                  const qs = parseInt(formData.get('questions') as string || '0');
                  const pyqs = parseInt(formData.get('pyqs') as string || '0');
                  const score = parseFloat(formData.get('score') as string || '0');
                  const focus = formData.get('focus') as string;
                  const notes = formData.get('notes') as string;

                  if (!chId) {
                    showFeedback("Please select a Chapter", "error");
                    return;
                  }

                  try {
                    setGlobalLoading(true);
                    const dateStr = new Date().toISOString().split('T')[0];
                    const ch = chapters.find(c => c.id === chId);

                    if (!ch) return;

                    await addDailyLog(profile.uid, dateStr, {
                      chapter: ch.name,
                      hours,
                      questions: qs,
                      pyqs,
                      mockTest: false,
                      score,
                      focus,
                      notes
                    });

                    await updateChapter(profile.uid, chId, {
                      studyHours: (ch.studyHours || 0) + hours,
                      questionsSolved: (ch.questionsSolved || 0) + qs,
                      pyqSolved: (ch.pyqSolved || 0) + pyqs,
                      focusTopic: focus || ch.focusTopic,
                      averageScore: score > 0 ? (ch.averageScore > 0 ? (ch.averageScore + score)/2 : score) : ch.averageScore
                    });

                    // Log public Community activities
                    await addCommunityActivity(profile.uid, profile.name, 'STUDY_SESSION', ch.name, hours);
                    if (pyqs > 0) {
                      await addCommunityActivity(profile.uid, profile.name, 'PYQ_SOLVED', ch.name, pyqs);
                    }

                    await loadUserData(profile.uid, profile);
                    showFeedback("Study session logged.", "success");
                    form.reset();
                  } catch (err) {
                    console.error(err);
                    showFeedback("Failed to save session.", "error");
                  } finally {
                    setGlobalLoading(false);
                  }
                }} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] text-[#8A8A93] uppercase mb-1">Mathematics Chapter (1–27)</label>
                    <select name="chapter" className="w-full h-8 bg-[#0B0B0C] border border-[#26262B] text-xs text-[#E9E9EC] px-2 outline-none" required>
                      <option value="">Select Chapter</option>
                      {NDA_MATH_CHAPTERS.map(ch => (
                        <option key={ch.id} value={ch.id}>
                          #{ch.order} {ch.name} &mdash; [{ch.section}] {ch.priority === 'HIGH' ? '(🔵 HIGH)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#8A8A93] uppercase mb-1">Study Hours</label>
                    <input name="hours" type="number" step="0.5" placeholder="e.g. 2.0" className="w-full h-8 bg-[#0B0B0C] border border-[#26262B] text-xs text-[#E9E9EC] px-3 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#8A8A93] uppercase mb-1">PYQs Solved (Target 100)</label>
                    <input name="pyqs" type="number" placeholder="e.g. 20" className="w-full h-8 bg-[#0B0B0C] border border-[#26262B] text-xs text-[#E9E9EC] px-3 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#8A8A93] uppercase mb-1">Practice Questions</label>
                    <input name="questions" type="number" placeholder="e.g. 35" className="w-full h-8 bg-[#0B0B0C] border border-[#26262B] text-xs text-[#E9E9EC] px-3 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#8A8A93] uppercase mb-1">Accuracy Score %</label>
                    <input name="score" type="number" placeholder="e.g. 75" className="w-full h-8 bg-[#0B0B0C] border border-[#26262B] text-xs text-[#E9E9EC] px-3 outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] text-[#8A8A93] uppercase mb-1">Focus Concept / Formula</label>
                    <input name="focus" type="text" placeholder="e.g. De Moivre's theorem, roots of unity" className="w-full h-8 bg-[#0B0B0C] border border-[#26262B] text-xs text-[#E9E9EC] px-3 outline-none" />
                  </div>
                  <button type="submit" disabled={globalLoading} className="md:col-span-2 w-full h-9 bg-[#0B0B0C] hover:bg-[#1C1C1E] border border-[#26262B] hover:border-[#4F8CFF] text-xs uppercase tracking-widest font-semibold text-[#E9E9EC] cursor-pointer">
                    Commit Daily Log
                  </button>
                </form>
              </div>

              {/* TARGET MILESTONES */}
              <div className="space-y-6 select-none">
                <div className="bg-[#141416] border border-[#26262B] p-5 font-mono text-xs">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#E9E9EC]">Targets &amp; Milestones</h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="flex justify-between text-[#8A8A93] text-[10px]">
                        <span>PYQs Target (100 per chapter)</span>
                        <span>{totalPyqsSolved} / {TOTAL_PYQ_TARGET}</span>
                      </div>
                      <div className="w-full bg-[#0B0B0C] h-1.5 border border-[#26262B] mt-1">
                        <div className="bg-[#4F8CFF] h-full" style={{ width: `${Math.min(100, (totalPyqsSolved / TOTAL_PYQ_TARGET) * 100)}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[#8A8A93] text-[10px]">
                        <span>Mock Tests Target</span>
                        <span>{totalMockTestsCount} / {DEFAULT_MOCK_TARGET_OVERALL}</span>
                      </div>
                      <div className="w-full bg-[#0B0B0C] h-1.5 border border-[#26262B] mt-1">
                        <div className="bg-[#4F8CFF] h-full" style={{ width: `${Math.min(100, (totalMockTestsCount / DEFAULT_MOCK_TARGET_OVERALL) * 100)}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[#8A8A93] text-[10px]">
                        <span>Mathematics Chapters Completed</span>
                        <span>{completedChaptersCount} / {TOTAL_MATH_CHAPTERS}</span>
                      </div>
                      <div className="w-full bg-[#0B0B0C] h-1.5 border border-[#26262B] mt-1">
                        <div className="bg-[#4F8CFF] h-full" style={{ width: `${overallCompletionPercentage}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: SYLLABUS MISSION CONTROL */}
        {activeTab === 'chapters' && (
          <ChaptersView
            profile={profile}
            chapters={chapters}
            onUpdateChapter={handleUpdateChapter}
          />
        )}

        {/* TAB: PERSONALIZED STUDY PLANNER */}
        {activeTab === 'planner' && (
          <StudyPlannerView
            plan={studyPlan}
            profile={profile}
            chapters={chapters}
            onRegenerate={(preferredChapterId, shifted) => {
              if (!profile) return;
              const freshPlan = generateSingleChapterPlan(
                profile,
                chapters,
                mockTests,
                revisionQueue,
                preferredChapterId,
                shifted ? undefined : studyPlan?.days
              );
              setStudyPlan(freshPlan);
              showFeedback(shifted ? "Plan shifted forward without piling backlog." : "AI single-chapter study plan initialized.", "success");
            }}
            onMarkDayDone={async (dayItem) => {
              if (!profile || !studyPlan) return;
              try {
                setGlobalLoading(true);
                const nextCompleted = !dayItem.completed;
                const updatedDays = studyPlan.days.map(d => d.id === dayItem.id ? { ...d, completed: nextCompleted } : d);

                const currentCh = chapters.find(c => c.id === studyPlan.chapterId);
                if (currentCh) {
                  const addQs = nextCompleted ? dayItem.quesTarget : -dayItem.quesTarget;
                  const addPyqs = nextCompleted ? dayItem.pyqTarget : -dayItem.pyqTarget;
                  const addHours = nextCompleted ? dayItem.hoursAllocated : -dayItem.hoursAllocated;

                  const newQs = Math.max(0, (currentCh.questionsSolved || 0) + addQs);
                  const newPyqs = Math.max(0, (currentCh.pyqSolved || 0) + addPyqs);
                  const newHours = Math.max(0, (currentCh.studyHours || 0) + addHours);

                  // Update subtopics practice
                  const currentSubtopics = { ...(currentCh.subtopics || {}) };
                  dayItem.subtopicIds.forEach(subId => {
                    const existing = currentSubtopics[subId] || {
                      id: subId,
                      name: subId,
                      questionsPractice: 0,
                      pyqsSolved: 0,
                      studyHours: 0,
                      averageScore: 0,
                      revisionStatus: 'Not Started'
                    };
                    currentSubtopics[subId] = {
                      ...existing,
                      questionsPractice: Math.max(0, (existing.questionsPractice || 0) + (nextCompleted ? Math.round(dayItem.quesTarget / Math.max(1, dayItem.subtopicIds.length)) : -Math.round(dayItem.quesTarget / Math.max(1, dayItem.subtopicIds.length)))),
                      pyqsSolved: Math.max(0, (existing.pyqsSolved || 0) + (nextCompleted ? Math.round(dayItem.pyqTarget / Math.max(1, dayItem.subtopicIds.length)) : -Math.round(dayItem.pyqTarget / Math.max(1, dayItem.subtopicIds.length)))),
                      revisionStatus: dayItem.isRevision && nextCompleted ? 'Mastered' : existing.revisionStatus
                    };
                  });

                  const isCompleteNow = newQs >= 100 && newPyqs >= 50 && updatedDays.every(d => d.completed);

                  const updatedChapter = await updateChapter(profile.uid, currentCh.id, {
                    questionsSolved: newQs,
                    pyqSolved: newPyqs,
                    studyHours: newHours,
                    subtopics: currentSubtopics,
                    completed: isCompleteNow || currentCh.completed,
                    revisionStatus: dayItem.isRevision && nextCompleted ? 'Revised Once' : currentCh.revisionStatus
                  });

                  const freshChapters = chapters.map(c => c.id === currentCh.id ? updatedChapter : c);
                  setChapters(freshChapters);

                  if (nextCompleted) {
                    await addDailyLog(profile.uid, new Date().toISOString().split('T')[0], {
                      chapter: currentCh.name,
                      hours: dayItem.hoursAllocated,
                      questions: dayItem.quesTarget,
                      pyqs: dayItem.pyqTarget,
                      mockTest: false,
                      score: 0,
                      focus: dayItem.subtopicNames.join(', '),
                      notes: `Day ${dayItem.dayIndex} completed via AI Plan`
                    });

                    await addCommunityActivity(profile.uid, profile.name, 'STUDY_SESSION', currentCh.name, dayItem.hoursAllocated);
                    if (dayItem.pyqTarget > 0) {
                      await addCommunityActivity(profile.uid, profile.name, 'PYQ_SOLVED', currentCh.name, dayItem.pyqTarget);
                    }
                  }

                  const refreshedPlan = generateSingleChapterPlan(
                    profile,
                    freshChapters,
                    mockTests,
                    revisionQueue,
                    studyPlan.chapterId,
                    updatedDays
                  );
                  setStudyPlan(refreshedPlan);
                  showFeedback(nextCompleted ? `Day ${dayItem.dayIndex} completed.` : `Day ${dayItem.dayIndex} marked pending.`, "success");
                }
              } catch (e) {
                console.error(e);
                showFeedback("Failed to update plan progress", "error");
              } finally {
                setGlobalLoading(false);
              }
            }}
            onAdvanceChapter={async (nextChapterId) => {
              if (!profile || !studyPlan) return;
              try {
                setGlobalLoading(true);
                const currentCh = chapters.find(c => c.id === studyPlan.chapterId);
                let freshChapters = [...chapters];
                if (currentCh && !currentCh.completed) {
                  const completedCh = await updateChapter(profile.uid, currentCh.id, {
                    completed: true,
                    revisionStatus: 'Mastered'
                  });
                  freshChapters = chapters.map(c => c.id === currentCh.id ? completedCh : c);
                  setChapters(freshChapters);
                  await addCommunityActivity(profile.uid, profile.name, 'CHAPTER_COMPLETED', currentCh.name);
                }

                const newPlan = generateSingleChapterPlan(
                  profile,
                  freshChapters,
                  mockTests,
                  revisionQueue,
                  nextChapterId
                );
                setStudyPlan(newPlan);
                showFeedback(`Advanced to Chapter ${newPlan.chapterOrder}: ${newPlan.chapterName}`, "success");
              } catch (e) {
                console.error(e);
                showFeedback("Failed to advance to next chapter", "error");
              } finally {
                setGlobalLoading(false);
              }
            }}
          />
        )}

        {/* TAB: STUDY LOG */}
        {activeTab === 'study_log' && (
          <div className="space-y-6 font-mono text-xs select-none">
            <h2 className="text-base font-semibold uppercase tracking-wider text-[#E9E9EC]">Study Log Ledger</h2>
            <div className="bg-[#141416] border border-[#26262B] p-5 space-y-4">
              {dailyLogs.length === 0 ? (
                <p className="text-xs text-[#8A8A93] py-8 text-center">No study logs committed yet.</p>
              ) : (
                dailyLogs.map((log, idx) => (
                  <div key={idx} className="border border-[#26262B] bg-[#0B0B0C] p-3 space-y-2">
                    <div className="text-xs font-semibold text-[#E9E9EC] flex justify-between">
                      <span>{log.date}</span>
                      <span className="text-[10px] text-[#8A8A93]">{log.entries.length} sessions</span>
                    </div>
                    {log.entries.map((e, eIdx) => (
                      <div key={eIdx} className="border-l border-[#4F8CFF] pl-2 text-[11px] text-[#8A8A93]">
                        <span className="text-[#E9E9EC]">{e.chapter}</span>: {e.hours} hrs ({e.questions} questions, {e.pyqs} pyqs)
                        {e.focus && <div className="text-[10px] text-[#8A8A93]">Focus: {e.focus}</div>}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB: MOCK TESTS */}
        {activeTab === 'mocks' && (
          <div className="space-y-6 font-mono text-xs select-none">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold uppercase tracking-wider text-[#E9E9EC]">Mathematics Mock Tests (120 Qs / 300 Marks)</h2>
              <span className="text-xs text-[#8A8A93]">Overall Target: 15 Mock Tests</span>
            </div>
            
            {/* Log mock test form */}
            <div className="bg-[#141416] border border-[#26262B] p-5 mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#E9E9EC] mb-4">Log Completed Mock Test</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const formData = new FormData(form);
                const mockNo = parseInt(formData.get('mockNumber') as string || '1');
                const tQs = parseInt(formData.get('totalQuestions') as string || '120');
                const att = parseInt(formData.get('attempted') as string || '0');
                const corr = parseInt(formData.get('correct') as string || '0');
                const wrg = parseInt(formData.get('wrong') as string || '0');
                const skp = parseInt(formData.get('skipped') as string || '0');
                const scr = parseFloat(formData.get('score') as string || '0');
                const neg = parseFloat(formData.get('negativeMarks') as string || '0');
                const mins = parseInt(formData.get('timeTaken') as string || '150');
                const weak = formData.get('weakAreas') as string;
                const notes = formData.get('notes') as string;

                try {
                  setGlobalLoading(true);
                  const accuracyVal = att > 0 ? parseFloat(((corr / att) * 100).toFixed(1)) : 0;

                  await addMockTest(profile.uid, {
                    mockNumber: mockNo,
                    date: new Date().toISOString().split('T')[0],
                    totalQuestions: tQs,
                    attempted: att,
                    correct: corr,
                    wrong: wrg,
                    skipped: skp,
                    score: scr,
                    negativeMarks: neg,
                    timeTaken: mins,
                    accuracy: accuracyVal,
                    weakAreas: weak,
                    notes: notes
                  });

                  // Add public community activity
                  await addCommunityActivity(profile.uid, profile.name, 'MOCK_COMPLETED', `Mathematics Mock #${mockNo}`);

                  await loadUserData(profile.uid, profile);
                  showFeedback("Mock test logged.", "success");
                  form.reset();
                } catch (err) {
                  showFeedback("Failed to save mock test.", "error");
                } finally {
                  setGlobalLoading(false);
                }
              }} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] text-[#8A8A93] uppercase mb-1">Mock No. (1–15)</label>
                  <input name="mockNumber" type="number" defaultValue={mockTests.length + 1} className="w-full h-8 bg-[#0B0B0C] border border-[#26262B] text-xs text-[#E9E9EC] px-3 outline-none" required />
                </div>
                <div>
                  <label className="block text-[10px] text-[#8A8A93] uppercase mb-1">Total Questions</label>
                  <input name="totalQuestions" type="number" defaultValue="120" className="w-full h-8 bg-[#0B0B0C] border border-[#26262B] text-xs text-[#E9E9EC] px-3 outline-none" required />
                </div>
                <div>
                  <label className="block text-[10px] text-[#8A8A93] uppercase mb-1">Attempted</label>
                  <input name="attempted" type="number" className="w-full h-8 bg-[#0B0B0C] border border-[#26262B] text-xs text-[#E9E9EC] px-3 outline-none" required />
                </div>
                <div>
                  <label className="block text-[10px] text-[#8A8A93] uppercase mb-1">Correct (+2.5 ea)</label>
                  <input name="correct" type="number" className="w-full h-8 bg-[#0B0B0C] border border-[#26262B] text-xs text-[#E9E9EC] px-3 outline-none" required />
                </div>
                <div>
                  <label className="block text-[10px] text-[#8A8A93] uppercase mb-1">Wrong (-0.83 ea)</label>
                  <input name="wrong" type="number" className="w-full h-8 bg-[#0B0B0C] border border-[#26262B] text-xs text-[#E9E9EC] px-3 outline-none" required />
                </div>
                <div>
                  <label className="block text-[10px] text-[#8A8A93] uppercase mb-1">Skipped</label>
                  <input name="skipped" type="number" className="w-full h-8 bg-[#0B0B0C] border border-[#26262B] text-xs text-[#E9E9EC] px-3 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-[#8A8A93] uppercase mb-1">Time Taken (mins)</label>
                  <input name="timeTaken" type="number" defaultValue="150" className="w-full h-8 bg-[#0B0B0C] border border-[#26262B] text-xs text-[#E9E9EC] px-3 outline-none" required />
                </div>
                <div>
                  <label className="block text-[10px] text-[#8A8A93] uppercase mb-1">Net Score (out of 300)</label>
                  <input name="score" type="number" step="0.1" placeholder="e.g. 185" className="w-full h-8 bg-[#0B0B0C] border border-[#26262B] text-xs text-[#E9E9EC] px-3 outline-none" required />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-[10px] text-[#8A8A93] uppercase mb-1">Weak Chapters / Notes</label>
                  <input name="weakAreas" type="text" placeholder="e.g. Integral calculus substitutions, 3D geometry plane equations" className="w-full h-8 bg-[#0B0B0C] border border-[#26262B] text-xs text-[#E9E9EC] px-3 outline-none" />
                </div>
                <button type="submit" disabled={globalLoading} className="md:col-span-4 w-full h-9 bg-[#0B0B0C] hover:bg-[#1C1C1E] border border-[#26262B] hover:border-[#4F8CFF] text-xs uppercase tracking-widest font-semibold text-[#E9E9EC] cursor-pointer">
                  Log Mathematics Mock Test Result
                </button>
              </form>
            </div>

            <div className="bg-[#141416] border border-[#26262B] p-5 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#26262B] text-[10px] text-[#8A8A93] uppercase">
                    <th className="py-2">Mock</th>
                    <th className="py-2 text-center">Attempted</th>
                    <th className="py-2 text-center">Correct</th>
                    <th className="py-2 text-center">Wrong</th>
                    <th className="py-2 text-center">Net Score</th>
                    <th className="py-2 text-center">Accuracy</th>
                    <th className="py-2 text-center">Time</th>
                    <th className="py-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#26262B]/50">
                  {mockTests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#8A8A93] italic">No mock tests attempted yet. Target: 15 mock tests overall.</td>
                    </tr>
                  ) : (
                    mockTests.map((m, idx) => (
                      <tr key={idx} className="hover:bg-[#0B0B0C]/40">
                        <td className="py-2 text-[#E9E9EC] font-semibold">Mock #{m.mockNumber}</td>
                        <td className="py-2 text-center">{m.attempted}/120</td>
                        <td className="py-2 text-center text-green-400">{m.correct}</td>
                        <td className="py-2 text-center text-red-400">{m.wrong}</td>
                        <td className="py-2 text-center text-[#4F8CFF] font-semibold">{m.score} / 300</td>
                        <td className="py-2 text-center">{m.accuracy}%</td>
                        <td className="py-2 text-center text-[#8A8A93]">{m.timeTaken}m</td>
                        <td className="py-2 text-[#8A8A93]">{m.date}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: PYQ MATRIX */}
        {activeTab === 'pyq' && (
          <div className="space-y-6 font-mono text-xs select-none">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold uppercase tracking-wider text-[#E9E9EC]">Mathematics PYQ Matrix (2018–2025)</h2>
              <span className="text-xs text-[#8A8A93]">Target: 100 PYQs per chapter (2,700 total)</span>
            </div>

            <div className="bg-[#141416] border border-[#26262B] p-4 space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-center border border-[#26262B] text-xs">
                  <thead>
                    <tr className="bg-[#0B0B0C] border-b border-[#26262B] text-[10px] text-[#8A8A93]">
                      <th className="p-2 border-r border-[#26262B] text-left min-w-[220px]">Chapter (1–27)</th>
                      <th className="p-2 border-r border-[#26262B] text-center w-24">Solved / 100</th>
                      {[2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025].map(y => (
                        <th key={y} className="p-2 border-r border-[#26262B] w-14">{y}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {NDA_MATH_CHAPTERS.map(canon => {
                      const userCh = chapters.find(c => c.id === canon.id || c.name.toLowerCase() === canon.name.toLowerCase());
                      const solvedTotal = userCh?.pyqSolved || 0;

                      return (
                        <tr key={canon.id} className="border-b border-[#26262B] hover:bg-[#0B0B0C]/40">
                          <td className="p-2 border-r border-[#26262B] text-left text-[#E9E9EC]">
                            <span className="text-[#8A8A93] mr-2 font-mono">#{canon.order}</span>
                            <span className="font-medium">{canon.name}</span>
                            <span className="text-[10px] text-[#8A8A93] ml-2 font-normal">[{canon.section}]</span>
                          </td>
                          <td className="p-2 border-r border-[#26262B] text-center font-semibold">
                            <span className={solvedTotal >= 100 ? 'text-[#4F8CFF]' : 'text-[#E9E9EC]'}>
                              {solvedTotal}
                            </span>
                            <span className="text-[#8A8A93] text-[10px]"> / 100</span>
                          </td>
                          {[2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025].map(y => {
                            const match = pyqYears.find(py => py.year === y);
                            const count = match?.chapterBreakdown?.[canon.id] || 0;
                            return (
                              <td key={y} className={`p-2 border-r border-[#26262B] ${count > 0 ? 'bg-[#4F8CFF]/15 text-[#4F8CFF] font-semibold' : 'text-[#8A8A93]'}`}>
                                <input 
                                  type="number" 
                                  defaultValue={count || ""}
                                  placeholder="0"
                                  onBlur={async (e) => {
                                    const val = parseInt(e.target.value || "0");
                                    if (val !== count) {
                                      try {
                                        setGlobalLoading(true);
                                        await savePyqYearCount(profile.uid, y, canon.id, val);
                                        
                                        const diff = val - count;
                                        await updateChapter(profile.uid, canon.id, {
                                          pyqSolved: Math.max(0, solvedTotal + diff)
                                        });

                                        if (val > 0) {
                                          await addCommunityActivity(profile.uid, profile.name, 'PYQ_SOLVED', canon.name, val);
                                        }
                                        await loadUserData(profile.uid, profile);
                                        showFeedback(`PYQ count saved for ${y}.`, "success");
                                      } catch (err) {
                                        showFeedback("Failed to update PYQ matrix.", "error");
                                      } finally {
                                        setGlobalLoading(false);
                                      }
                                    }
                                  }}
                                  className="w-10 bg-transparent text-center outline-none border-0 text-xs font-mono p-0 cursor-pointer focus:bg-[#0B0B0C]"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: REVISION */}
        {activeTab === 'revision' && (
          <div className="space-y-6 font-mono text-xs select-none">
            <h2 className="text-base font-semibold uppercase tracking-wider text-[#E9E9EC]">Mathematics Spaced Revision Queue</h2>
            <div className="bg-[#141416] border border-[#26262B] p-5 space-y-3">
              {revisionQueue.length === 0 ? (
                <div className="text-[#8A8A93] py-8 text-center">No active revision queue items. Chapters with low scores (&lt;50%) or due intervals appear here automatically.</div>
              ) : (
                revisionQueue.map((rev, idx) => (
                  <div key={idx} className="border border-[#26262B] bg-[#0B0B0C] p-3 flex justify-between items-center">
                    <div>
                      <div className="text-xs font-semibold text-[#E9E9EC]">{rev.chapter}</div>
                      <div className="text-[#8A8A93] text-[10px] mt-0.5">
                        Cycle: {rev.status || 'Active'} &bull; Intervals: {rev.interval} days &bull; Revised {rev.revisionCount} times
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        const updatedRev = {
                          ...rev,
                          lastRevisedAt: new Date().toISOString().split('T')[0],
                          revisionCount: rev.revisionCount + 1,
                          interval: rev.interval * 2,
                          status: 'Revised'
                        };
                        await saveRevisionQueueItem(profile.uid, updatedRev);
                        await addCommunityActivity(profile.uid, profile.name, 'REVISION_COMPLETED', rev.chapter);
                        await loadUserData(profile.uid, profile);
                        showFeedback("Revision updated.", "success");
                      }}
                      className="h-7 px-3 bg-[#141416] border border-[#26262B] hover:border-[#4F8CFF] text-[10px] uppercase cursor-pointer"
                    >
                      Mark Done
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB: REPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-6 font-mono text-xs select-none">
            <h2 className="text-base font-semibold uppercase tracking-wider text-[#E9E9EC]">Mathematics Category Reports</h2>
            <div className="bg-[#141416] border border-[#26262B] p-5 space-y-4">
              {MATH_CATEGORIES.map(cat => {
                const catChs = chapters.filter(c => c.section === cat);
                const completed = catChs.filter(c => c.completed).length;
                const total = catChs.length;
                const pct = total > 0 ? (completed / total) * 100 : 0;
                const catPyqs = catChs.reduce((sum, c) => sum + (c.pyqSolved || 0), 0);
                const catHours = catChs.reduce((sum, c) => sum + (c.studyHours || 0), 0);

                return (
                  <div key={cat} className="space-y-1.5 border border-[#26262B]/60 bg-[#0B0B0C] p-3">
                    <div className="flex justify-between items-center text-[#E9E9EC]">
                      <span className="font-semibold">{cat}</span>
                      <span className="text-[#8A8A93] text-[10px]">
                        {completed}/{total} chapters ({pct.toFixed(0)}%) &bull; {catPyqs} PYQs &bull; {catHours.toFixed(1)} hrs
                      </span>
                    </div>
                    <div className="w-full bg-[#141416] h-1.5 border border-[#26262B]">
                      <div className="bg-[#4F8CFF] h-full" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB: COMMUNITY */}
        {activeTab === 'community' && (
          <CommunityView
            profile={profile}
            chapters={chapters}
            publicProfiles={publicProfiles}
            totalActiveCount={publicProfiles.length}
          />
        )}

        {/* TAB: PROFILE & SETTINGS */}
        {activeTab === 'profile' && (
          <div className="space-y-6 font-mono text-xs select-none">
            <h2 className="text-base font-semibold uppercase tracking-wider text-[#E9E9EC]">Profile &amp; Settings</h2>
            <div className="bg-[#141416] border border-[#26262B] p-5 space-y-4">
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get('name') as string;
                const examDate = formData.get('examDate') as string;
                const dailyGoal = parseFloat(formData.get('dailyGoal') as string || '4');
                const commPrivacy = formData.get('privacy') === 'true';

                try {
                  setGlobalLoading(true);
                  const updated: UserProfile = { 
                    ...profile, 
                    name, 
                    examDate, 
                    dailyGoal, 
                    communityPublic: commPrivacy 
                  };
                  
                  await updateUserProfile(profile.uid, { 
                    name, 
                    examDate, 
                    dailyGoal, 
                    communityPublic: commPrivacy 
                  });
                  
                  setProfile(updated);
                  await syncCommunityProfile(profile.uid, updated, chapters, mockTests.length);
                  showFeedback("Settings saved successfully.", "success");
                  await loadUserData(profile.uid, updated);
                } catch (err) {
                  showFeedback("Failed to update profile settings", "error");
                } finally {
                  setGlobalLoading(false);
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-[#8A8A93] uppercase mb-1">Name</label>
                  <input name="name" defaultValue={profile.name} className="w-full h-8 bg-[#0B0B0C] border border-[#26262B] px-3 outline-none text-xs text-[#E9E9EC]" required />
                </div>
                <div>
                  <label className="block text-[10px] text-[#8A8A93] uppercase mb-1">Target Exam Date</label>
                  <input name="examDate" type="date" defaultValue={profile.examDate} className="w-full h-8 bg-[#0B0B0C] border border-[#26262B] px-3 outline-none text-xs text-[#E9E9EC]" required />
                </div>
                <div>
                  <label className="block text-[10px] text-[#8A8A93] uppercase mb-1">Daily Study Goal (Hours)</label>
                  <input name="dailyGoal" type="number" step="0.5" defaultValue={profile.dailyGoal} className="w-full h-8 bg-[#0B0B0C] border border-[#26262B] px-3 outline-none text-xs text-[#E9E9EC]" required />
                </div>
                <div>
                  <label className="block text-[10px] text-[#8A8A93] uppercase mb-1">Show my progress in Community</label>
                  <select name="privacy" defaultValue={String(profile.communityPublic)} className="w-full h-8 bg-[#0B0B0C] border border-[#26262B] px-2 outline-none text-xs text-[#E9E9EC]">
                    <option value="false">OFF (Private Candidate - Opt Out)</option>
                    <option value="true">ON (Public Candidate - Show Progress Stats)</option>
                  </select>
                </div>
                <div className="pt-2 border-t border-[#26262B] text-[10px] text-[#8A8A93] space-y-1">
                  <div>First Login: {profile.firstLogin || profile.createdAt}</div>
                  <div>Last Login: {profile.lastLogin || profile.createdAt}</div>
                  <div>Total Logins Recorded: {profile.loginCount || 1}</div>
                </div>
                <button type="submit" disabled={globalLoading} className="w-full h-9 bg-[#0B0B0C] hover:bg-[#1C1C1E] border border-[#26262B] hover:border-[#4F8CFF] text-xs uppercase font-semibold text-[#E9E9EC] cursor-pointer">
                  Save Changes
                </button>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-[#141416] border-t border-[#26262B] flex items-center justify-around z-40 px-2 select-none">
        {[
          { id: 'dashboard', label: 'Home', icon: Layers },
          { id: 'chapters', label: 'Syllabus', icon: CheckSquare },
          { id: 'planner', label: 'Plan', icon: Sparkles },
          { id: 'mocks', label: 'Mocks', icon: TrendingUp },
          { id: 'community', label: 'Community', icon: Users },
        ].map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                isActive ? 'text-[#4F8CFF]' : 'text-[#8A8A93]'
              }`}
            >
              <Icon size={16} />
              <span className="text-[9px] uppercase tracking-wider font-mono">{item.label}</span>
            </button>
          );
        })}
      </nav>

    </div>
  );
}
