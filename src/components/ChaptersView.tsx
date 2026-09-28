import React, { useState } from 'react';
import { ChapterData, UserProfile } from '../dbUtils';
import { NDA_MATH_CHAPTERS } from '../syllabus';
import { CheckSquare, Square, ChevronDown, ChevronRight, Layers, ChevronUp } from 'lucide-react';

interface Props {
  profile: UserProfile;
  chapters: ChapterData[];
  onUpdateChapter: (chapterId: string, fields: Partial<ChapterData>) => Promise<void>;
}

export const ChaptersView: React.FC<Props> = ({
  profile,
  chapters,
  onUpdateChapter
}) => {
  const [completionFilter, setCompletionFilter] = useState<'ALL' | 'COMPLETED' | 'INCOMPLETE' | 'WEAK'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedChapterIds, setExpandedChapterIds] = useState<Set<string>>(new Set());

  // Map to canonical order 1–27
  const orderedChapters = NDA_MATH_CHAPTERS.map(canon => {
    const userCh = chapters.find(c => c.id === canon.id || c.name.toLowerCase() === canon.name.toLowerCase());

    return {
      ...(userCh || {
        id: canon.id,
        name: canon.name,
        section: canon.section,
        priority: canon.priority,
        order: canon.order,
        completed: false,
        pyqSolved: 0,
        pyqTarget: 100,
        mockTests: 0,
        questionsSolved: 0,
        studyHours: 0,
        focusTopic: "",
        averageScore: 0,
        revisionStatus: "Not Started" as const,
        lastRevisedAt: "",
        nextRevisionAt: "",
        revisionCount: 0,
        needsRevision: false,
        lastUpdated: ""
      }),
      order: canon.order,
      section: canon.section,
      priority: canon.priority,
      name: canon.name
    };
  });

  // Filter chapters
  const filteredChapters = orderedChapters.filter(ch => {
    if (completionFilter === 'COMPLETED' && !ch.completed) return false;
    if (completionFilter === 'INCOMPLETE' && ch.completed) return false;
    if (completionFilter === 'WEAK') {
      const isWeak = (ch.averageScore > 0 && ch.averageScore < 50) || (ch.pyqSolved < 30) || ch.needsRevision;
      if (!isWeak) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!ch.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const toggleExpand = (chapterId: string) => {
    setExpandedChapterIds(prev => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set(filteredChapters.map(c => c.id));
    setExpandedChapterIds(allIds);
  };

  const collapseAll = () => {
    setExpandedChapterIds(new Set());
  };

  // Cycle chapter revision status
  const cycleChapterRevision = (ch: ChapterData) => {
    const cycleMap: { [k: string]: 'Not Started' | 'In Progress' | 'Revised Once' | 'Revised Twice' | 'Mastered' } = {
      'Not Started': 'In Progress',
      'In Progress': 'Revised Once',
      'Revised Once': 'Revised Twice',
      'Revised Twice': 'Mastered',
      'Mastered': 'Not Started'
    };
    const next = cycleMap[ch.revisionStatus || 'Not Started'] || 'Not Started';
    onUpdateChapter(ch.id, {
      revisionStatus: next,
      revisionCount: (ch.revisionCount || 0) + 1,
      lastRevisedAt: new Date().toISOString().split('T')[0]
    });
  };

  const completedCount = orderedChapters.filter(c => c.completed).length;
  const overallPercentage = (completedCount / orderedChapters.length) * 100;
  const totalPyqs = orderedChapters.reduce((sum, c) => sum + (c.pyqSolved || 0), 0);
  const totalHours = orderedChapters.reduce((sum, c) => sum + (c.studyHours || 0), 0);

  return (
    <div className="space-y-6 font-mono text-xs select-none">
      {/* HEADER & METRIC SUMMARY */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-wider uppercase text-[#E9E9EC] flex items-center gap-2">
            <Layers size={16} className="text-[#4F8CFF]" />
            NDA Mathematics Syllabus (1–27)
          </h2>
          <p className="text-xs text-[#8A8A93] uppercase tracking-wider mt-0.5">
            Sequential prerequisite learning order &bull; 100 PYQs target per chapter &bull; 27 Chapters total
          </p>
        </div>

        <div className="w-full md:w-64 bg-[#141416] border border-[#26262B] p-3 space-y-1.5">
          <div className="flex justify-between text-[10px] text-[#8A8A93] uppercase">
            <span>Syllabus Completion</span>
            <span className="text-[#E9E9EC] font-bold">{overallPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-[#0B0B0C] h-2 border border-[#26262B]">
            <div className="bg-[#4F8CFF] h-full transition-all duration-300" style={{ width: `${overallPercentage}%` }}></div>
          </div>
          <div className="text-[9px] text-[#8A8A93] flex justify-between">
            <span>{completedCount}/27 chapters</span>
            <span>{totalPyqs} / 2,700 PYQs</span>
            <span>{totalHours.toFixed(1)} hrs</span>
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-[#141416] border border-[#26262B] p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="w-full sm:w-48">
            <label className="block text-[10px] text-[#8A8A93] uppercase mb-1">Status</label>
            <select
              value={completionFilter}
              onChange={(e) => setCompletionFilter(e.target.value as any)}
              className="w-full h-8 bg-[#0B0B0C] border border-[#26262B] text-xs text-[#E9E9EC] px-2 outline-none focus:border-[#4F8CFF]"
            >
              <option value="ALL">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="INCOMPLETE">Incomplete</option>
              <option value="WEAK">Weak Areas (&lt;50% score or &lt;30 PYQs)</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] text-[#8A8A93] uppercase mb-1">Search Chapter</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chapter name..."
              className="w-full h-8 pl-3 pr-3 bg-[#0B0B0C] border border-[#26262B] text-xs text-[#E9E9EC] outline-none focus:border-[#4F8CFF]"
            />
          </div>
        </div>

        <div className="flex items-end gap-2 pt-2 md:pt-0">
          <button
            onClick={expandAll}
            className="h-8 px-3 bg-[#0B0B0C] hover:bg-[#1E1E22] border border-[#26262B] text-[10px] text-[#8A8A93] hover:text-[#E9E9EC] uppercase transition-colors cursor-pointer flex items-center gap-1"
          >
            <ChevronDown size={12} />
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="h-8 px-3 bg-[#0B0B0C] hover:bg-[#1E1E22] border border-[#26262B] text-[10px] text-[#8A8A93] hover:text-[#E9E9EC] uppercase transition-colors cursor-pointer flex items-center gap-1"
          >
            <ChevronUp size={12} />
            Collapse All
          </button>
        </div>
      </div>

      {/* SYLLABUS LIST ACCORDION (NO CATEGORY & NO PRIORITY COLUMNS, NO SUBTOPICS) */}
      <div className="bg-[#141416] border border-[#26262B] overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-[#0B0B0C] border-b border-[#26262B] text-[10px] text-[#8A8A93] uppercase items-center">
          <div className="col-span-1 flex items-center justify-center">
            <span>Done</span>
          </div>
          <div className="col-span-1 text-center">
            <span>#</span>
          </div>
          <div className="col-span-4">
            <span>Chapter Name</span>
          </div>
          <div className="col-span-2 text-center">
            <span>PYQs /100</span>
          </div>
          <div className="col-span-1 text-center">
            <span>Hours</span>
          </div>
          <div className="col-span-1 text-center">
            <span>Avg Score</span>
          </div>
          <div className="col-span-2 text-right pr-2">
            <span>Revision</span>
          </div>
        </div>

        {/* Chapters Accordion Rows */}
        <div className="divide-y divide-[#26262B]/60">
          {filteredChapters.map(ch => {
            const isExpanded = expandedChapterIds.has(ch.id);

            return (
              <div key={ch.id} className="transition-colors">
                {/* Chapter Main Row */}
                <div 
                  className={`grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-[#18181B] cursor-pointer transition-colors ${
                    isExpanded ? 'bg-[#18181B]/80 border-b border-[#26262B]/40' : ''
                  }`}
                  onClick={() => toggleExpand(ch.id)}
                >
                  {/* Done Checkbox */}
                  <div 
                    className="col-span-1 flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateChapter(ch.id, { completed: !ch.completed });
                    }}
                  >
                    <button
                      className="text-[#4F8CFF] hover:text-[#E9E9EC] transition-colors cursor-pointer"
                      title={ch.completed ? 'Mark incomplete' : 'Mark completed'}
                    >
                      {ch.completed ? (
                        <CheckSquare size={16} strokeWidth={1.5} />
                      ) : (
                        <Square size={16} strokeWidth={1.5} />
                      )}
                    </button>
                  </div>

                  {/* Order Number */}
                  <div className="col-span-1 text-center text-[#8A8A93] font-mono text-[11px]">
                    {ch.order}
                  </div>

                  {/* Chapter Name */}
                  <div className="col-span-4 flex items-center gap-2">
                    <span className="text-[#8A8A93]">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                    <span className={`font-medium ${ch.completed ? 'text-[#8A8A93] line-through' : 'text-[#E9E9EC]'}`}>
                      {ch.name}
                    </span>
                  </div>

                  {/* PYQs Solved / 100 */}
                  <div className="col-span-2 text-center text-xs">
                    <span className={ch.pyqSolved >= 100 ? 'text-[#4F8CFF] font-semibold' : 'text-[#E9E9EC]'}>
                      {ch.pyqSolved || 0}
                    </span>
                    <span className="text-[#8A8A93]"> / 100</span>
                  </div>

                  {/* Study Hours */}
                  <div className="col-span-1 text-center text-xs text-[#E9E9EC]">
                    {(ch.studyHours || 0).toFixed(1)}
                  </div>

                  {/* Average Score */}
                  <div className="col-span-1 text-center text-xs">
                    {ch.averageScore > 0 ? (
                      <span className={ch.averageScore < 50 ? 'text-[#8A8A93]' : 'text-[#4F8CFF]'}>
                        {ch.averageScore}%
                      </span>
                    ) : (
                      <span className="text-[#8A8A93]">-</span>
                    )}
                  </div>

                  {/* Chapter Revision Status */}
                  <div 
                    className="col-span-2 flex items-center justify-end gap-2 pr-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[10px] text-[#8A8A93] truncate hidden sm:inline">
                      {ch.revisionStatus || 'Not Started'}
                    </span>
                    <button
                      onClick={() => cycleChapterRevision(ch)}
                      className="h-6 px-2 bg-[#0B0B0C] hover:bg-[#1E1E22] border border-[#26262B] text-[9px] text-[#E9E9EC] uppercase cursor-pointer transition-colors"
                      title="Cycle Chapter Revision"
                    >
                      Cycle
                    </button>
                  </div>
                </div>

                {/* EXPANDED METRICS ROW (REPLACING SUBTOPICS) */}
                {isExpanded && (
                  <div className="bg-[#0B0B0C] border-t border-[#26262B]/60 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
                    {/* 1. Ques Practice /100 */}
                    <div className="flex items-center gap-2">
                      <span className="text-[#8A8A93] text-[11px] uppercase tracking-wider">Ques Practice</span>
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="999"
                          value={ch.questionsSolved === 0 ? '' : ch.questionsSolved}
                          placeholder="0"
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            onUpdateChapter(ch.id, { questionsSolved: isNaN(v) ? 0 : Math.max(0, v) });
                          }}
                          className="w-16 h-7 text-center bg-[#141416] border border-[#26262B] text-xs text-[#E9E9EC] focus:border-[#4F8CFF] outline-none"
                        />
                        <span className="text-[#8A8A93] text-[11px]">/ 100</span>
                      </div>
                    </div>

                    {/* 2. PYQs /50 */}
                    <div className="flex items-center gap-2">
                      <span className="text-[#8A8A93] text-[11px] uppercase tracking-wider">PYQs</span>
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="999"
                          value={ch.pyqSolved === 0 ? '' : ch.pyqSolved}
                          placeholder="0"
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            onUpdateChapter(ch.id, { pyqSolved: isNaN(v) ? 0 : Math.max(0, v) });
                          }}
                          className="w-16 h-7 text-center bg-[#141416] border border-[#26262B] text-xs text-[#E9E9EC] focus:border-[#4F8CFF] outline-none"
                        />
                        <span className="text-[#8A8A93] text-[11px]">/ 50</span>
                      </div>
                    </div>

                    {/* 3. Average */}
                    <div className="flex items-center gap-2">
                      <span className="text-[#8A8A93] text-[11px] uppercase tracking-wider">Average</span>
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={ch.averageScore === 0 ? '' : ch.averageScore}
                          placeholder="0"
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            onUpdateChapter(ch.id, { averageScore: isNaN(v) ? 0 : Math.min(100, Math.max(0, v)) });
                          }}
                          className="w-16 h-7 text-center bg-[#141416] border border-[#26262B] text-xs text-[#E9E9EC] focus:border-[#4F8CFF] outline-none"
                        />
                        <span className="text-[#8A8A93] text-[11px]">%</span>
                      </div>
                    </div>

                    {/* 4. Cycle Revision */}
                    <div className="flex items-center gap-2">
                      <span className="text-[#8A8A93] text-[11px] uppercase tracking-wider">Cycle Revision</span>
                      <button
                        onClick={() => cycleChapterRevision(ch)}
                        className="h-7 px-3 bg-[#141416] hover:bg-[#1E1E22] border border-[#26262B] text-xs text-[#E9E9EC] uppercase cursor-pointer transition-colors inline-flex items-center gap-1.5"
                      >
                        <span>{ch.revisionStatus || 'Not Started'}</span>
                        <span className="text-[#8A8A93] text-[10px]">↻</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredChapters.length === 0 && (
            <div className="p-8 text-center text-[#8A8A93] text-xs">
              No mathematics chapters matching current search query.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
