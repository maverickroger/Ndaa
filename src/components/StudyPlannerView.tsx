import React, { useState } from 'react';
import { SingleChapterPlan, PlanDayItem } from '../studyPlanner';
import { UserProfile, ChapterData } from '../dbUtils';
import { NDA_MATH_CHAPTERS } from '../syllabus';
import { Sparkles, Check, Lock, AlertCircle, ArrowRight, RotateCcw, Clock, Target } from 'lucide-react';

interface Props {
  plan: SingleChapterPlan | null;
  profile: UserProfile;
  chapters: ChapterData[];
  onRegenerate: (preferredChapterId?: string, shifted?: boolean) => void;
  onMarkDayDone: (dayItem: PlanDayItem) => void;
  onAdvanceChapter: (nextChapterId: string) => void;
}

export const StudyPlannerView: React.FC<Props> = ({
  plan,
  profile,
  chapters,
  onRegenerate,
  onMarkDayDone,
  onAdvanceChapter
}) => {
  const [blockedAlert, setBlockedAlert] = useState<string | null>(null);

  if (!plan) {
    return (
      <div className="bg-[#141416] border border-[#26262B] p-8 text-center font-mono select-none">
        <Sparkles size={24} className="text-[#4F8CFF] mx-auto mb-3" />
        <h3 className="text-sm uppercase tracking-wider text-[#E9E9EC]">AI Single-Chapter Syllabus Planner</h3>
        <p className="text-xs text-[#8A8A93] mt-2 mb-4">
          Calculates a zero-overload, daily step plan for your active NDA Mathematics chapter.
        </p>
        <button
          onClick={() => onRegenerate()}
          className="h-9 px-5 bg-[#0B0B0C] border border-[#26262B] hover:border-[#4F8CFF] text-xs uppercase tracking-wider font-semibold text-[#E9E9EC] transition-colors cursor-pointer"
        >
          Initialize AI Chapter Plan
        </button>
      </div>
    );
  }

  // Handle attempting to jump to a different chapter
  const handleChapterSelect = (targetChapterId: string) => {
    if (targetChapterId === plan.chapterId) return;

    const targetCanon = NDA_MATH_CHAPTERS.find(c => c.id === targetChapterId);
    if (!targetCanon) return;

    // Strict Rule: Block jumping ahead if current chapter is not finished
    if (!plan.isChapterFullyCompleted && targetCanon.order > plan.chapterOrder) {
      setBlockedAlert(`Finish ${plan.chapterName} first.`);
      setTimeout(() => setBlockedAlert(null), 4500);
      return;
    }

    setBlockedAlert(null);
    onRegenerate(targetChapterId);
  };

  const todayItem = plan.todayDayItem || plan.days[0];
  const allDaysDone = plan.days.every(d => d.completed);
  const showCompletionPrompt = plan.isChapterFullyCompleted || allDaysDone;

  return (
    <div className="space-y-6 select-none font-mono text-xs">
      {/* BLOCKED JUMP ALERT BANNER */}
      {blockedAlert && (
        <div className="bg-[#141416] border border-[#FF5F5F]/60 p-4 flex items-center justify-between gap-3 text-[#E9E9EC] animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={16} className="text-[#FF5F5F] shrink-0" />
            <span className="text-xs uppercase tracking-wider font-semibold">
              {blockedAlert}
            </span>
          </div>
          <span className="text-[10px] text-[#8A8A93] uppercase">
            Strict Single-Chapter Focus
          </span>
        </div>
      )}

      {/* PLAN HEADER: [Chapter Name] — Day X of Y */}
      <div className="bg-[#141416] border border-[#26262B] p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] text-[#8A8A93] uppercase tracking-wider mb-1">
              <span className="text-[#4F8CFF]">Chapter {plan.chapterOrder} of 27</span>
              <span>&bull;</span>
              <span>{plan.daysRemainingForExam} Days Until NDA Exam</span>
            </div>
            <h2 className="text-lg font-semibold tracking-wider uppercase text-[#E9E9EC] flex items-center gap-2">
              <span>{plan.chapterName}</span>
              <span className="text-xs font-normal text-[#8A8A93]">&mdash; Day {plan.currentDayNumber} of {plan.totalDays}</span>
            </h2>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onRegenerate(plan.chapterId, true)}
              className="h-8 px-3 bg-[#0B0B0C] hover:bg-[#1E1E22] border border-[#26262B] hover:border-[#4F8CFF] text-[10px] uppercase text-[#E9E9EC] flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Recalculate plan if behind schedule without piling up tasks"
            >
              <RotateCcw size={11} />
              <span>Shift Plan Forward</span>
            </button>
          </div>
        </div>

        {/* THIN PROGRESS BAR */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-[#8A8A93] uppercase">
            <span>Chapter Progress (Target: 100 Qs &bull; 50 PYQs &bull; Subtopics)</span>
            <span className="text-[#E9E9EC] font-semibold">{plan.progress.overallPercentage}%</span>
          </div>
          <div className="w-full bg-[#0B0B0C] h-1.5 border border-[#26262B]">
            <div
              className="bg-[#4F8CFF] h-full transition-all duration-300"
              style={{ width: `${plan.progress.overallPercentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[9px] text-[#8A8A93]">
            <span>{plan.progress.questionsSolved} / {plan.progress.questionsTarget} Questions</span>
            <span>{plan.progress.pyqsSolved} / {plan.progress.pyqsTarget} PYQs</span>
            <span>{plan.progress.subtopicsDone} / {plan.progress.subtopicsTotal} Subtopics Practiced</span>
          </div>
        </div>
      </div>

      {/* TODAY'S SUBTOPICS AND TARGETS */}
      {todayItem && !showCompletionPrompt && (
        <div className="bg-[#141416] border border-[#4F8CFF]/40 p-4 space-y-2">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider">
            <span className="text-[#4F8CFF] font-semibold flex items-center gap-1.5">
              <Target size={12} />
              Today's Focus &bull; Day {todayItem.dayIndex}
            </span>
            <span className="text-[#8A8A93]">{todayItem.hoursAllocated} Hours Allocated</span>
          </div>

          <div className="text-xs text-[#E9E9EC] font-medium">
            {todayItem.subtopicNames.join(' &bull; ')}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[10px] text-[#8A8A93] pt-1 border-t border-[#26262B]">
            <span>Practice: <strong className="text-[#E9E9EC]">{todayItem.quesTarget} Ques</strong></span>
            <span>PYQs: <strong className="text-[#E9E9EC]">{todayItem.pyqTarget} PYQs</strong></span>
            <span>Revision: <strong className="text-[#E9E9EC]">{todayItem.isRevision ? 'Yes (Consolidation)' : 'No'}</strong></span>
          </div>
        </div>
      )}

      {/* CHAPTER COMPLETE PROMPT */}
      {showCompletionPrompt && (
        <div className="bg-[#141416] border border-[#4F8CFF] p-5 space-y-3 animate-fadeIn">
          <div className="flex items-center gap-2 text-sm uppercase tracking-wider text-[#E9E9EC] font-semibold">
            <Sparkles size={16} className="text-[#4F8CFF]" />
            Chapter Complete. Start {plan.nextChapterName || 'Next Chapter'}?
          </div>
          <p className="text-xs text-[#8A8A93]">
            You have satisfied the required subtopic practice, 100 questions benchmark, and 50 PYQ target for <strong className="text-[#E9E9EC]">{plan.chapterName}</strong>. Ready to advance according to prerequisite sequence.
          </p>
          {plan.nextChapterId && (
            <button
              onClick={() => onAdvanceChapter(plan.nextChapterId!)}
              className="h-8 px-4 bg-[#0B0B0C] hover:bg-[#1E1E22] border border-[#4F8CFF] text-xs uppercase tracking-wider font-semibold text-[#E9E9EC] flex items-center gap-2 cursor-pointer transition-colors"
            >
              <span>Start {plan.nextChapterName}</span>
              <ArrowRight size={14} className="text-[#4F8CFF]" />
            </button>
          )}
        </div>
      )}

      {/* DAILY STEP PLAN LIST */}
      <div className="bg-[#141416] border border-[#26262B] overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-[#0B0B0C] border-b border-[#26262B] text-[10px] text-[#8A8A93] uppercase items-center">
          <div className="col-span-3 sm:col-span-2">
            <span>Day / Date</span>
          </div>
          <div className="col-span-4 sm:col-span-5">
            <span>Subtopic to Study</span>
          </div>
          <div className="col-span-2 text-center hidden sm:block">
            <span>Ques Target</span>
          </div>
          <div className="col-span-1 text-center hidden sm:block">
            <span>PYQs</span>
          </div>
          <div className="col-span-1 text-center hidden sm:block">
            <span>Hours</span>
          </div>
          <div className="col-span-1 text-center hidden sm:block">
            <span>Revision</span>
          </div>
          <div className="col-span-5 sm:col-span-1 text-right pr-2">
            <span>Action</span>
          </div>
        </div>

        {/* Daily Rows */}
        <div className="divide-y divide-[#26262B]/60">
          {plan.days.map((day) => {
            const isCurrentActive = day.dayIndex === plan.currentDayNumber && !day.completed;

            return (
              <div
                key={day.id}
                className={`grid grid-cols-12 gap-2 px-4 py-3 items-center transition-colors ${
                  day.completed
                    ? 'bg-[#0B0B0C]/40 opacity-60'
                    : isCurrentActive
                    ? 'bg-[#18181B]'
                    : 'hover:bg-[#18181B]/50'
                }`}
              >
                {/* Day Number and Date */}
                <div className="col-span-3 sm:col-span-2">
                  <div className="font-semibold text-xs text-[#E9E9EC]">
                    Day {day.dayIndex}
                  </div>
                  <div className="text-[10px] text-[#8A8A93]">
                    {day.dateStr}
                  </div>
                </div>

                {/* Subtopics to study */}
                <div className="col-span-4 sm:col-span-5 pr-2">
                  <div className="text-xs text-[#E9E9EC] font-medium leading-relaxed">
                    {day.subtopicNames.map((name, i) => (
                      <div key={i} className="truncate">
                        &bull; {name}
                      </div>
                    ))}
                  </div>
                  {/* Mobile compact metrics */}
                  <div className="text-[9px] text-[#8A8A93] sm:hidden mt-1">
                    {day.quesTarget} Qs &bull; {day.pyqTarget} PYQs &bull; {day.hoursAllocated} hrs &bull; Rev: {day.isRevision ? 'Yes' : 'No'}
                  </div>
                </div>

                {/* Ques Target */}
                <div className="col-span-2 text-center text-xs hidden sm:block">
                  <span className="text-[#E9E9EC] font-semibold">{day.quesTarget}</span>
                  <span className="text-[#8A8A93] text-[10px]"> Ques</span>
                </div>

                {/* PYQs Target */}
                <div className="col-span-1 text-center text-xs hidden sm:block">
                  <span className="text-[#E9E9EC] font-semibold">{day.pyqTarget}</span>
                  <span className="text-[#8A8A93] text-[10px]"> PYQs</span>
                </div>

                {/* Hours Allocated */}
                <div className="col-span-1 text-center text-xs hidden sm:block text-[#E9E9EC]">
                  {day.hoursAllocated.toFixed(1)}h
                </div>

                {/* Revision Yes/No */}
                <div className="col-span-1 text-center text-xs hidden sm:block">
                  {day.isRevision ? (
                    <span className="text-[#4F8CFF] font-semibold">Yes</span>
                  ) : (
                    <span className="text-[#8A8A93]">No</span>
                  )}
                </div>

                {/* Mark Done Button */}
                <div className="col-span-5 sm:col-span-1 text-right pr-2">
                  <button
                    onClick={() => onMarkDayDone(day)}
                    className={`h-7 px-2.5 border text-[10px] uppercase font-semibold transition-colors cursor-pointer inline-flex items-center gap-1 ${
                      day.completed
                        ? 'bg-[#0B0B0C] border-[#26262B] text-[#8A8A93] hover:text-[#E9E9EC]'
                        : 'bg-[#0B0B0C] border-[#4F8CFF] text-[#4F8CFF] hover:bg-[#4F8CFF] hover:text-[#0B0B0C]'
                    }`}
                  >
                    {day.completed ? (
                      <>
                        <Check size={12} />
                        <span>Done</span>
                      </>
                    ) : (
                      <span>Mark Done</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CHAPTER SELECTOR WITH LOCK ENFORCEMENT */}
      <div className="bg-[#141416] border border-[#26262B] p-4 space-y-2">
        <div className="flex items-center justify-between text-[10px] text-[#8A8A93] uppercase">
          <span>NDA Mathematics Chapter Lock</span>
          <span>One Chapter at a Time Rule</span>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {NDA_MATH_CHAPTERS.map(ch => {
            const userCh = chapters.find(c => c.id === ch.id || c.name.toLowerCase() === ch.name.toLowerCase());
            const isCompleted = userCh?.completed || false;
            const isCurrent = ch.id === plan.chapterId;
            const isLocked = !isCompleted && ch.order > plan.chapterOrder && !plan.isChapterFullyCompleted;

            return (
              <button
                key={ch.id}
                onClick={() => handleChapterSelect(ch.id)}
                className={`px-2 py-1 text-[10px] border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                  isCurrent
                    ? 'bg-[#0B0B0C] border-[#4F8CFF] text-[#E9E9EC] font-semibold'
                    : isCompleted
                    ? 'bg-[#0B0B0C] border-[#26262B] text-[#8A8A93] hover:text-[#E9E9EC]'
                    : isLocked
                    ? 'bg-[#0B0B0C]/50 border-[#26262B]/50 text-[#8A8A93]/50 cursor-not-allowed'
                    : 'bg-[#0B0B0C] border-[#26262B] text-[#8A8A93] hover:text-[#E9E9EC]'
                }`}
                title={isLocked ? `Locked: Finish ${plan.chapterName} first.` : ch.name}
              >
                <span>{ch.order}. {ch.name}</span>
                {isLocked && <Lock size={10} className="text-[#8A8A93]/60" />}
                {isCompleted && <Check size={10} className="text-[#4F8CFF]" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
