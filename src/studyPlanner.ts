import { ChapterData, MockTestDoc, RevisionItem, UserProfile } from './dbUtils';
import { NDA_MATH_CHAPTERS, MathChapter, MathSubtopicDef } from './syllabus';

export interface PlanDayItem {
  id: string;
  dayIndex: number; // 1, 2, 3...
  dateStr: string; // YYYY-MM-DD
  displayDate: string; // "Day 1 (Mon, Sep 28)"
  subtopicIds: string[];
  subtopicNames: string[];
  quesTarget: number; // Daily question target
  pyqTarget: number; // Daily PYQ target
  hoursAllocated: number; // <= 6 hrs
  isRevision: boolean;
  completed: boolean;
  isToday: boolean;
  isMissed?: boolean;
}

export interface SingleChapterPlan {
  chapterId: string;
  chapterName: string;
  chapterOrder: number;
  totalDays: number;
  currentDayNumber: number; // 1-based active day
  daysRemainingForExam: number;
  dailyHourGoal: number; // Capped at max 6 hours
  isChapterFullyCompleted: boolean;
  canAdvanceToNext: boolean;
  nextChapterId?: string;
  nextChapterName?: string;
  todayDayItem?: PlanDayItem;
  days: PlanDayItem[];
  progress: {
    questionsTarget: number;
    questionsSolved: number;
    pyqsTarget: number;
    pyqsSolved: number;
    subtopicsTotal: number;
    subtopicsDone: number;
    studyHoursDone: number;
    overallPercentage: number;
  };
  generatedAt: string;
  aiGuidance: string;
}

/**
 * Validates whether a chapter is 100% complete:
 * 1. Questions >= 100
 * 2. PYQs >= 50
 * 3. Subtopics completed (or chapter marked completed)
 * 4. Revision started or completed
 */
export function isChapterComplete(ch: ChapterData): boolean {
  if (ch.completed) return true;

  const totalQs = ch.questionsSolved || 0;
  const totalPyqs = ch.pyqSolved || 0;
  const targetQs = 100;
  const targetPyqs = 50;
  const revisionStarted = ch.revisionStatus && ch.revisionStatus !== 'Not Started';

  return totalQs >= targetQs && totalPyqs >= targetPyqs && Boolean(revisionStarted);
}

/**
 * Finds the currently active locked chapter adhering to the "One Chapter at a Time" rule.
 */
export function getActiveLockedChapter(
  chapters: ChapterData[],
  preferredChapterId?: string
): { activeChapter: ChapterData; activeDef: MathChapter; isLockedFromJump: boolean; blockedChapterName?: string } {
  // Sort canonical chapters 1 to 27
  const sortedChapters = [...NDA_MATH_CHAPTERS].sort((a, b) => a.order - b.order);

  // Find the first uncompleted chapter in canonical 1-27 sequence
  let firstIncompleteIndex = 0;
  for (let i = 0; i < sortedChapters.length; i++) {
    const canon = sortedChapters[i];
    const userCh = chapters.find(c => c.id === canon.id || c.name.toLowerCase() === canon.name.toLowerCase());
    const complete = userCh ? isChapterComplete(userCh) : false;
    if (!complete) {
      firstIncompleteIndex = i;
      break;
    }
  }

  const defaultActiveCanon = sortedChapters[firstIncompleteIndex] || sortedChapters[0];
  const defaultUserCh = chapters.find(c => c.id === defaultActiveCanon.id || c.name.toLowerCase() === defaultActiveCanon.name.toLowerCase()) || {
    id: defaultActiveCanon.id,
    name: defaultActiveCanon.name,
    section: defaultActiveCanon.section,
    priority: defaultActiveCanon.priority,
    order: defaultActiveCanon.order,
    completed: false,
    pyqSolved: 0,
    pyqTarget: 100,
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
    lastUpdated: new Date().toISOString()
  };

  // If user explicitly requests a chapter
  if (preferredChapterId && preferredChapterId !== defaultActiveCanon.id) {
    const requestedCanon = sortedChapters.find(c => c.id === preferredChapterId);
    if (requestedCanon) {
      // If requested chapter is ahead of the first incomplete chapter, block jump!
      if (requestedCanon.order > defaultActiveCanon.order) {
        return {
          activeChapter: defaultUserCh,
          activeDef: defaultActiveCanon,
          isLockedFromJump: true,
          blockedChapterName: requestedCanon.name
        };
      }
    }
  }

  return {
    activeChapter: defaultUserCh,
    activeDef: defaultActiveCanon,
    isLockedFromJump: false
  };
}

/**
 * AI Single-Chapter Smart Syllabus Planner
 * Generates an individualized daily breakdown for ONE locked chapter.
 */
export function generateSingleChapterPlan(
  profile: UserProfile,
  chapters: ChapterData[],
  mockTests: MockTestDoc[],
  revisionQueue: RevisionItem[],
  preferredChapterId?: string,
  existingDaysState?: PlanDayItem[]
): SingleChapterPlan {
  const { activeChapter, activeDef } = getActiveLockedChapter(chapters, preferredChapterId);

  // Exam date calculations
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const examDateObj = profile.examDate ? new Date(profile.examDate) : new Date(today.getFullYear() + 1, 3, 15);
  const diffTime = examDateObj.getTime() - today.getTime();
  const daysRemainingForExam = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  // Daily hour goal (AI enforces max 6 hours of math per day)
  const userDailyGoal = profile.dailyGoal || 3;
  const cappedDailyHours = Math.min(6, Math.max(1, userDailyGoal));

  // Current chapter metrics
  const targetQuestions = 100;
  const targetPyqs = 50; // AI Plan target per chapter
  const currentQs = activeChapter.questionsSolved || 0;
  const currentPyqs = activeChapter.pyqSolved || 0;
  const subtopicsList = activeDef.subtopics || [];
  const subtopicsMap = activeChapter.subtopics || {};

  // Check subtopic completion
  let subtopicsDoneCount = 0;
  subtopicsList.forEach(s => {
    const sub = subtopicsMap[s.id];
    if (sub && (sub.questionsPractice >= 20 || sub.pyqsSolved >= 10 || sub.revisionStatus === 'Mastered')) {
      subtopicsDoneCount++;
    }
  });

  const isCompleted = isChapterComplete(activeChapter);

  // Determine next chapter
  const currentOrder = activeDef.order;
  const nextCanon = NDA_MATH_CHAPTERS.find(c => c.order === currentOrder + 1);

  // Group subtopics: strictly NEVER more than 3 subtopics per day
  // Ideal: 1 to 2 subtopics per day for depth
  const subtopicGroups: MathSubtopicDef[][] = [];
  const maxSubtopicsPerDay = Math.min(3, Math.max(1, Math.round(cappedDailyHours / 1.5)));

  for (let i = 0; i < subtopicsList.length; i += maxSubtopicsPerDay) {
    subtopicGroups.push(subtopicsList.slice(i, i + maxSubtopicsPerDay));
  }

  // Days needed for concept coverage + 1 final consolidation & revision day
  const conceptDaysCount = Math.max(1, subtopicGroups.length);
  const totalDays = conceptDaysCount + 1; // Subtopic days + 1 dedicated Revision / High-intensity PYQ day

  // Daily targets distribution
  // 100 questions and 50 PYQs split across days
  const baseQuesPerDay = Math.floor(targetQuestions / totalDays);
  const remQues = targetQuestions % totalDays;

  const basePyqsPerDay = Math.floor(targetPyqs / totalDays);
  const remPyqs = targetPyqs % totalDays;

  const days: PlanDayItem[] = [];

  for (let d = 0; d < totalDays; d++) {
    const dayNumber = d + 1;
    const planDate = new Date(today);
    planDate.setDate(today.getDate() + d);
    const dateStr = planDate.toISOString().split('T')[0];

    const isLastDay = d === totalDays - 1;
    const isRevision = isLastDay;

    const group = !isLastDay && subtopicGroups[d] ? subtopicGroups[d] : [];
    const subtopicIds = isLastDay
      ? subtopicsList.map(s => s.id)
      : group.map(s => s.id);
    const subtopicNames = isLastDay
      ? [`Full Chapter Revision & PYQ Marathon: ${activeDef.name}`]
      : group.map(s => s.name);

    // Question & PYQ distribution
    const quesTarget = baseQuesPerDay + (d < remQues ? 1 : 0);
    const pyqTarget = basePyqsPerDay + (d < remPyqs ? 1 : 0);

    // Check if previously marked completed in existing plan state
    const existingDay = existingDaysState?.find(ed => ed.dayIndex === dayNumber && ed.dateStr === dateStr);
    const completed = existingDay?.completed || (isCompleted && d < totalDays);

    const isToday = d === 0;

    const dayName = planDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const displayDate = isToday ? `Today (${dayName})` : `Day ${dayNumber} (${dayName})`;

    days.push({
      id: `plan_day_${activeDef.id}_${dayNumber}`,
      dayIndex: dayNumber,
      dateStr,
      displayDate,
      subtopicIds,
      subtopicNames,
      quesTarget,
      pyqTarget,
      hoursAllocated: cappedDailyHours,
      isRevision,
      completed,
      isToday
    });
  }

  // Active current day index
  const firstIncompleteDayIndex = days.findIndex(d => !d.completed);
  const currentDayNumber = firstIncompleteDayIndex === -1 ? totalDays : firstIncompleteDayIndex + 1;
  const todayDayItem = days[Math.min(firstIncompleteDayIndex >= 0 ? firstIncompleteDayIndex : 0, days.length - 1)];

  // Progress percentage
  const qPct = Math.min(100, (currentQs / targetQuestions) * 100);
  const pPct = Math.min(100, (currentPyqs / targetPyqs) * 100);
  const sPct = subtopicsList.length > 0 ? (subtopicsDoneCount / subtopicsList.length) * 100 : 0;
  const overallPercentage = Math.round((qPct * 0.4) + (pPct * 0.4) + (sPct * 0.2));

  // AI Guidance message
  let aiGuidance = `Locked on Chapter ${activeDef.order}/27: ${activeDef.name}. Complete all daily subtopics and PYQ targets before advancing.`;
  if (isCompleted) {
    aiGuidance = `Target reached for ${activeDef.name}! Chapter complete. Ready to unlock ${nextCanon ? nextCanon.name : 'all chapters'}.`;
  } else if (currentPyqs < 20) {
    aiGuidance = `Focus on depth. Solve ${targetPyqs - currentPyqs} more PYQs to reach chapter mastery.`;
  }

  return {
    chapterId: activeDef.id,
    chapterName: activeDef.name,
    chapterOrder: activeDef.order,
    totalDays,
    currentDayNumber,
    daysRemainingForExam,
    dailyHourGoal: cappedDailyHours,
    isChapterFullyCompleted: isCompleted,
    canAdvanceToNext: isCompleted && Boolean(nextCanon),
    nextChapterId: nextCanon?.id,
    nextChapterName: nextCanon?.name,
    todayDayItem,
    days,
    progress: {
      questionsTarget: targetQuestions,
      questionsSolved: currentQs,
      pyqsTarget: targetPyqs,
      pyqsSolved: currentPyqs,
      subtopicsTotal: subtopicsList.length,
      subtopicsDone: subtopicsDoneCount,
      studyHoursDone: activeChapter.studyHours || 0,
      overallPercentage
    },
    generatedAt: new Date().toISOString(),
    aiGuidance
  };
}
