import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc,
  collection, 
  query, 
  where, 
  writeBatch
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from './firebase';
import { 
  NDA_MATH_CHAPTERS, 
  DEFAULT_PYQ_TARGET_PER_CHAPTER, 
  DEFAULT_MOCK_TARGET_OVERALL,
  TOTAL_MATH_CHAPTERS,
  TOTAL_PYQ_TARGET,
  MATH_CATEGORIES
} from './syllabus';

// User profile interface
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  targetYear: number;
  examDate: string; // YYYY-MM-DD
  dailyGoal: number; // Hours
  communityPublic: boolean; // Show my progress in Community setting (default OFF)
  createdAt: string;
  firstLogin?: string;
  lastLogin?: string;
  loginCount?: number;
  lastStudyDate?: string;
}

// Subtopic progress data
export interface SubtopicProgress {
  id: string;
  name: string;
  questionsPractice: number; // Target /100
  pyqsSolved: number; // Target /50
  studyHours: number;
  averageScore: number; // %
  revisionStatus: 'Not Started' | 'In Progress' | 'Revised Once' | 'Revised Twice' | 'Mastered';
  lastRevisedAt?: string;
}

// Chapter progress data
export interface ChapterData {
  id: string;
  name: string;
  section: string; // Visual category: Algebra, Trigonometry, etc.
  priority: 'HIGH' | 'Normal';
  order: number; // 1 to 27
  completed: boolean;
  pyqSolved: number;
  pyqTarget: number; // 100
  mockTests: number;
  questionsSolved: number;
  studyHours: number;
  focusTopic: string;
  averageScore: number;
  revisionStatus: 'Not Started' | 'In Progress' | 'Revised Once' | 'Revised Twice' | 'Mastered';
  lastRevisedAt: string; // YYYY-MM-DD or empty
  nextRevisionAt: string; // YYYY-MM-DD or empty
  revisionCount: number;
  needsRevision: boolean;
  lastUpdated: string;
  subtopics?: { [subtopicId: string]: SubtopicProgress };
}

// Daily study log
export interface DailyLogEntry {
  id: string;
  chapter: string;
  hours: number;
  questions: number;
  pyqs: number;
  mockTest: boolean;
  score: number;
  focus: string;
  notes: string;
  createdAt?: string;
}

export interface DailyLogDoc {
  date: string; // YYYY-MM-DD
  entries: DailyLogEntry[];
}

// NDA Mathematics Mock Test (120 Questions, 300 Marks)
export interface MockTestDoc {
  id: string;
  mockNumber: number;
  date: string; // YYYY-MM-DD
  totalQuestions: number; // default 120
  attempted: number;
  correct: number;
  wrong: number;
  skipped: number;
  score: number;
  negativeMarks: number;
  timeTaken: number; // minutes (default 150)
  accuracy: number; // %
  weakAreas: string;
  notes: string;
  createdAt?: string;
}

// Year-wise PYQ Breakdown (2018–2025)
export interface PyqByYearDoc {
  year: number; // 2018 - 2025
  totalSolved: number;
  chapterBreakdown: { [chapterId: string]: number };
}

// Spaced Repetition Revision
export interface RevisionItem {
  chapterId: string;
  chapter: string;
  lastRevisedAt: string;
  nextRevisionAt: string;
  interval: number; // days
  revisionCount: number;
  status: string;
}

// Opted-in Community Profile
export interface PublicCommunityProfile {
  uid: string;
  displayName: string;
  targetYear: number;
  completion: number;
  pyqsSolved: number;
  mockTests: number;
  questionsSolved: number;
  studyHours: number;
  averageScore: number;
  currentStreak: number;
  lastActive: string;
  categoryProgress?: { [category: string]: { completed: number; total: number; score: number } };
  publicChapterProgress?: { [chapterId: string]: { name: string; completed: boolean; pyqSolved: number; score: number; revision: string } };
  updatedAt: string;
}

// Public Community Activity Feed
export interface PublicCommunityActivity {
  id: string;
  uid: string;
  displayName: string;
  type: 'CHAPTER_COMPLETED' | 'PYQ_SOLVED' | 'MOCK_COMPLETED' | 'STUDY_SESSION' | 'REVISION_COMPLETED';
  chapter: string;
  value?: number;
  createdAt: string;
  public: boolean;
}

/**
 * 1. Initialize user database on login (seeds the exact 27 Mathematics chapters)
 */
export async function initializeUserDatabase(
  uid: string, 
  email: string, 
  name: string, 
  photoURL: string
): Promise<UserProfile> {
  const userRef = doc(db, 'users', uid);
  const pathForUser = `users/${uid}`;
  const nowIso = new Date().toISOString();
  
  try {
    const userSnap = await getDoc(userRef);
    let profile: UserProfile;
    
    if (userSnap.exists()) {
      const existingData = userSnap.data();
      const newLoginCount = (existingData.loginCount || 1) + 1;
      profile = {
        uid,
        name: existingData.name || name || "Aspirant",
        email: existingData.email || email || "",
        photoURL: existingData.photoURL || photoURL || "",
        targetYear: existingData.targetYear || (new Date().getFullYear() + 1),
        examDate: existingData.examDate || `${new Date().getFullYear() + 1}-04-15`,
        dailyGoal: existingData.dailyGoal || 4,
        communityPublic: existingData.communityPublic !== undefined ? existingData.communityPublic : false, // Default: OFF
        createdAt: existingData.createdAt || nowIso,
        firstLogin: existingData.firstLogin || nowIso,
        lastLogin: nowIso,
        loginCount: newLoginCount,
        lastStudyDate: existingData.lastStudyDate || ""
      };

      await setDoc(userRef, {
        name: profile.name,
        email: profile.email,
        photoURL: profile.photoURL,
        targetYear: profile.targetYear,
        examDate: profile.examDate,
        dailyGoal: profile.dailyGoal,
        communityPublic: profile.communityPublic,
        createdAt: profile.createdAt,
        firstLogin: profile.firstLogin,
        lastLogin: nowIso,
        loginCount: newLoginCount,
        lastStudyDate: profile.lastStudyDate || ""
      });
    } else {
      profile = {
        uid,
        name: name || "Aspirant",
        email: email || "",
        photoURL: photoURL || "",
        targetYear: new Date().getFullYear() + 1,
        examDate: `${new Date().getFullYear() + 1}-04-15`,
        dailyGoal: 4,
        communityPublic: false, // Default: OFF
        createdAt: nowIso,
        firstLogin: nowIso,
        lastLogin: nowIso,
        loginCount: 1,
        lastStudyDate: ""
      };

      await setDoc(userRef, {
        name: profile.name,
        email: profile.email,
        photoURL: profile.photoURL,
        targetYear: profile.targetYear,
        examDate: profile.examDate,
        dailyGoal: profile.dailyGoal,
        communityPublic: profile.communityPublic,
        createdAt: profile.createdAt,
        firstLogin: profile.firstLogin,
        lastLogin: profile.lastLogin,
        loginCount: profile.loginCount,
        lastStudyDate: ""
      });
    }

    // Ensure all 27 canonical chapters exist directly in users/{uid}/chapters
    await verifyAndSeedMathChapters(uid);

    return profile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathForUser);
  }
}

/**
 * Ensures the exact 27 Mathematics chapters are present and ordered 1 to 27.
 */
export async function verifyAndSeedMathChapters(uid: string): Promise<ChapterData[]> {
  const chaptersCollRef = collection(db, 'users', uid, 'chapters');
  const nowIso = new Date().toISOString();
  
  try {
    const snap = await getDocs(chaptersCollRef);
    const existingChapters = snap.docs.map(d => d.data() as ChapterData);
    const existingMap = new Map<string, ChapterData>();
    
    // Index by both ID and lowercase name
    existingChapters.forEach(c => {
      existingMap.set(c.id, c);
      existingMap.set(c.name.toLowerCase(), c);
    });

    const canonicalIds = new Set(NDA_MATH_CHAPTERS.map(c => c.id));
    const batch = writeBatch(db);
    let needsCommit = false;

    // 1. Remove any outdated non-Math or legacy duplicate chapters
    for (const c of existingChapters) {
      if (!canonicalIds.has(c.id)) {
        batch.delete(doc(db, 'users', uid, 'chapters', c.id));
        needsCommit = true;
      }
    }

    // 2. Ensure all 27 chapters exist with canonical order & category
    for (const canon of NDA_MATH_CHAPTERS) {
      const existing = existingMap.get(canon.id) || existingMap.get(canon.name.toLowerCase());
      const chRef = doc(db, 'users', uid, 'chapters', canon.id);

      if (!existing) {
        const newCh: ChapterData = {
          id: canon.id,
          name: canon.name,
          section: canon.section,
          priority: canon.priority,
          order: canon.order,
          completed: false,
          pyqSolved: 0,
          pyqTarget: DEFAULT_PYQ_TARGET_PER_CHAPTER,
          mockTests: 0,
          questionsSolved: 0,
          studyHours: 0,
          focusTopic: "",
          averageScore: 0,
          revisionStatus: "Not Started",
          lastRevisedAt: "",
          nextRevisionAt: "",
          revisionCount: 0,
          needsRevision: false,
          lastUpdated: nowIso
        };
        batch.set(chRef, newCh);
        needsCommit = true;
      } else {
        // Enforce canonical order, section, priority, name, pyqTarget
        if (
          existing.order !== canon.order ||
          existing.section !== canon.section ||
          existing.priority !== canon.priority ||
          existing.name !== canon.name ||
          existing.pyqTarget !== DEFAULT_PYQ_TARGET_PER_CHAPTER
        ) {
          batch.set(chRef, {
            order: canon.order,
            section: canon.section,
            priority: canon.priority,
            name: canon.name,
            pyqTarget: DEFAULT_PYQ_TARGET_PER_CHAPTER
          }, { merge: true });
          needsCommit = true;
        }
      }
    }

    if (needsCommit) {
      await batch.commit();
    }

    // Return fresh list in strict order 1–27
    return await getChapters(uid);
  } catch (err) {
    console.warn("verifyAndSeedMathChapters:", err);
    return getChapters(uid);
  }
}

/**
 * 2. Fetch User Profile
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      return { uid, ...snap.data() } as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * 3. Update User Profile
 */
export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  const path = `users/${uid}`;
  try {
    await setDoc(doc(db, 'users', uid), data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * 4. Fetch all 27 Mathematics chapters
 */
export async function getChapters(uid: string): Promise<ChapterData[]> {
  const path = `users/${uid}/chapters`;
  try {
    const querySnapshot = await getDocs(collection(db, 'users', uid, 'chapters'));
    const list = querySnapshot.docs.map(doc => doc.data() as ChapterData);
    
    // Sort strictly by canonical order 1–27
    return list.sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * 5. Update a specific Mathematics chapter
 */
export async function updateChapter(
  uid: string, 
  chapterId: string, 
  updatedFields: Partial<ChapterData>
): Promise<ChapterData> {
  const chPath = `users/${uid}/chapters/${chapterId}`;
  try {
    const chRef = doc(db, 'users', uid, 'chapters', chapterId);
    const snap = await getDoc(chRef);
    if (!snap.exists()) {
      throw new Error(`Chapter ${chapterId} not found`);
    }

    const currentChapter = snap.data() as ChapterData;
    const finalChapter: ChapterData = {
      ...currentChapter,
      ...updatedFields,
      lastUpdated: new Date().toISOString()
    };

    await setDoc(chRef, finalChapter);
    return finalChapter;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, chPath);
    throw error;
  }
}

/**
 * 6. Daily Study Log entries
 */
export async function addDailyLog(uid: string, dateStr: string, entry: Omit<DailyLogEntry, 'id'>): Promise<void> {
  const path = `users/${uid}/dailyLogs/${dateStr}`;
  const nowIso = new Date().toISOString();
  try {
    const logRef = doc(db, 'users', uid, 'dailyLogs', dateStr);
    const logSnap = await getDoc(logRef);
    
    const newEntry: DailyLogEntry = {
      id: Date.now().toString(),
      ...entry,
      createdAt: nowIso
    };

    if (logSnap.exists()) {
      const data = logSnap.data() as DailyLogDoc;
      await setDoc(logRef, {
        entries: [...data.entries, newEntry]
      });
    } else {
      await setDoc(logRef, {
        entries: [newEntry]
      });
    }

    await updateUserProfile(uid, { lastStudyDate: dateStr });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getDailyLogs(uid: string): Promise<DailyLogDoc[]> {
  const path = `users/${uid}/dailyLogs`;
  try {
    const querySnapshot = await getDocs(collection(db, 'users', uid, 'dailyLogs'));
    const list = querySnapshot.docs.map(doc => ({
      date: doc.id,
      entries: doc.data().entries || []
    }) as DailyLogDoc);
    return list.sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * 7. Mock Tests CRUD (NDA Mathematics 120 Questions / 300 Marks, 15 overall target)
 */
export async function addMockTest(uid: string, mock: Omit<MockTestDoc, 'id'>): Promise<MockTestDoc> {
  const id = Date.now().toString();
  const path = `users/${uid}/mockTests/${id}`;
  const nowIso = new Date().toISOString();
  const fullMock: MockTestDoc = { id, ...mock, createdAt: nowIso };
  
  try {
    await setDoc(doc(db, 'users', uid, 'mockTests', id), fullMock);
    return fullMock;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function getMockTests(uid: string): Promise<MockTestDoc[]> {
  const path = `users/${uid}/mockTests`;
  try {
    const querySnapshot = await getDocs(collection(db, 'users', uid, 'mockTests'));
    const list = querySnapshot.docs.map(doc => doc.data() as MockTestDoc);
    return list.sort((a, b) => b.mockNumber - a.mockNumber);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * 8. PYQ Breakdown by Year (2018–2025)
 */
export async function getPyqByYear(uid: string): Promise<PyqByYearDoc[]> {
  const path = `users/${uid}/pyqByYear`;
  try {
    const querySnapshot = await getDocs(collection(db, 'users', uid, 'pyqByYear'));
    return querySnapshot.docs.map(doc => ({
      year: parseInt(doc.id),
      ...doc.data()
    }) as PyqByYearDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function savePyqYearCount(
  uid: string, 
  year: number, 
  chapterId: string, 
  count: number
): Promise<void> {
  const path = `users/${uid}/pyqByYear/${year}`;
  try {
    const yrRef = doc(db, 'users', uid, 'pyqByYear', String(year));
    const snap = await getDoc(yrRef);
    
    let chapterBreakdown: { [chapterId: string]: number } = {};

    if (snap.exists()) {
      const data = snap.data();
      chapterBreakdown = data.chapterBreakdown || {};
      chapterBreakdown[chapterId] = count;
    } else {
      chapterBreakdown[chapterId] = count;
    }

    const totalSolved = Object.values(chapterBreakdown).reduce((sum, val) => sum + val, 0);

    await setDoc(yrRef, {
      year,
      totalSolved,
      chapterBreakdown
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * 9. Revision Queue
 */
export async function getRevisionQueue(uid: string): Promise<RevisionItem[]> {
  const path = `users/${uid}/revisionQueue`;
  try {
    const querySnapshot = await getDocs(collection(db, 'users', uid, 'revisionQueue'));
    return querySnapshot.docs.map(doc => ({
      chapterId: doc.id,
      ...doc.data()
    }) as RevisionItem);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveRevisionQueueItem(uid: string, item: RevisionItem): Promise<void> {
  const path = `users/${uid}/revisionQueue/${item.chapterId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'revisionQueue', item.chapterId), {
      chapter: item.chapter,
      lastRevisedAt: item.lastRevisedAt,
      nextRevisionAt: item.nextRevisionAt,
      interval: item.interval,
      revisionCount: item.revisionCount,
      status: item.status
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * 10. Community Profiles & Activity
 */
export async function fetchCommunityProfiles(): Promise<PublicCommunityProfile[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'communityProfiles'));
    return querySnapshot.docs.map(d => d.data() as PublicCommunityProfile);
  } catch (error) {
    console.warn('Could not fetch community profiles from Firestore:', error);
    return [];
  }
}

export async function fetchCommunityActivity(): Promise<PublicCommunityActivity[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'communityActivity'));
    const list = querySnapshot.docs.map(d => d.data() as PublicCommunityActivity);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.warn('Could not fetch community activity from Firestore:', error);
    return [];
  }
}

export async function syncCommunityProfile(
  uid: string,
  profile: UserProfile,
  chapters: ChapterData[],
  mockTestsCount: number
): Promise<void> {
  const commRef = doc(db, 'communityProfiles', uid);
  
  if (!profile.communityPublic) {
    try {
      await deleteDoc(commRef);
    } catch {}
    return;
  }

  const totalChapters = chapters.length || TOTAL_MATH_CHAPTERS;
  const completedChapters = chapters.filter(c => c.completed).length;
  const pyqSolved = chapters.reduce((sum, c) => sum + (c.pyqSolved || 0), 0);
  const studyHours = chapters.reduce((sum, c) => sum + (c.studyHours || 0), 0);
  const questionsSolved = chapters.reduce((sum, c) => sum + (c.questionsSolved || 0), 0);
  const scoredChs = chapters.filter(c => c.averageScore > 0);
  const averageScore = scoredChs.length > 0
    ? scoredChs.reduce((sum, c) => sum + c.averageScore, 0) / scoredChs.length
    : 0;
  const completion = totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0;

  // Build Mathematics category breakdown
  const categoryProgress: { [cat: string]: { completed: number; total: number; score: number } } = {};
  MATH_CATEGORIES.forEach(cat => {
    const catChs = chapters.filter(c => c.section === cat);
    const catCompleted = catChs.filter(c => c.completed).length;
    const catScored = catChs.filter(c => c.averageScore > 0);
    const catScore = catScored.length > 0 ? catScored.reduce((sum, c) => sum + c.averageScore, 0) / catScored.length : 0;
    
    categoryProgress[cat] = {
      completed: catCompleted,
      total: catChs.length,
      score: parseFloat(catScore.toFixed(0))
    };
  });

  // Chapter-level public mapping
  const publicChapterProgress: { [id: string]: { name: string; completed: boolean; pyqSolved: number; score: number; revision: string } } = {};
  chapters.forEach(c => {
    publicChapterProgress[c.id] = {
      name: c.name,
      completed: c.completed,
      pyqSolved: c.pyqSolved,
      score: c.averageScore,
      revision: c.revisionStatus
    };
  });

  try {
    await setDoc(commRef, {
      uid,
      displayName: profile.name,
      targetYear: profile.targetYear,
      completion: parseFloat(completion.toFixed(1)),
      pyqsSolved: pyqSolved,
      mockTests: mockTestsCount,
      questionsSolved: questionsSolved,
      studyHours: parseFloat(studyHours.toFixed(1)),
      averageScore: parseFloat(averageScore.toFixed(1)),
      currentStreak: 9, // Continuous streak
      lastActive: new Date().toISOString(),
      categoryProgress,
      publicChapterProgress,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.warn('Community profile sync deferred:', error);
  }
}

export async function addCommunityActivity(
  uid: string,
  displayName: string,
  type: 'CHAPTER_COMPLETED' | 'PYQ_SOLVED' | 'MOCK_COMPLETED' | 'STUDY_SESSION' | 'REVISION_COMPLETED',
  chapter: string,
  value?: number
): Promise<void> {
  try {
    const profile = await getUserProfile(uid);
    if (!profile || !profile.communityPublic) return; // Only post if opted in

    const activityRef = doc(collection(db, 'communityActivity'));
    await setDoc(activityRef, {
      uid,
      displayName,
      type,
      chapter,
      value: value || null,
      createdAt: new Date().toISOString(),
      public: true
    });
  } catch (err) {
    console.warn('Community activity logging deferred:', err);
  }
}
