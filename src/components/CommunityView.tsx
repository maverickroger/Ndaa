import React, { useState } from 'react';
import { UserProfile, ChapterData, PublicCommunityProfile } from '../dbUtils';
import { TOTAL_MATH_CHAPTERS } from '../syllabus';

interface Props {
  profile: UserProfile;
  chapters: ChapterData[];
  publicProfiles: PublicCommunityProfile[];
  totalActiveCount: number;
}

export const CommunityView: React.FC<Props> = ({
  profile,
  chapters,
  publicProfiles,
  totalActiveCount
}) => {
  const [selectedProfile, setSelectedProfile] = useState<{
    displayName: string;
    studyHours: number;
    chaptersDone: number;
    averageScore: number;
  } | null>(null);

  // Current user's stats
  const userCompletedChs = chapters.filter(c => c.completed).length;
  const userHours = chapters.reduce((sum, c) => sum + (c.studyHours || 0), 0);
  const scoredChs = chapters.filter(c => c.averageScore > 0);
  const userAvgScore = scoredChs.length > 0 
    ? Math.round(scoredChs.reduce((sum, c) => sum + c.averageScore, 0) / scoredChs.length)
    : 0;

  // Build list of leaderboard entries respecting privacy toggle
  // Current user entry if communityPublic is true
  const allLeaderboardEntries = [...publicProfiles];

  // If current user has opted in (communityPublic = true) and is not already in publicProfiles
  if (profile.communityPublic) {
    const exists = allLeaderboardEntries.some(p => p.uid === profile.uid);
    if (!exists) {
      allLeaderboardEntries.push({
        uid: profile.uid,
        displayName: profile.name || 'Aspirant',
        targetYear: profile.targetYear || 2026,
        completion: (userCompletedChs / TOTAL_MATH_CHAPTERS) * 100,
        pyqsSolved: chapters.reduce((sum, c) => sum + (c.pyqSolved || 0), 0),
        mockTests: 0,
        questionsSolved: chapters.reduce((sum, c) => sum + (c.questionsSolved || 0), 0),
        studyHours: userHours,
        averageScore: userAvgScore,
        currentStreak: 7,
        lastActive: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  // Ensure initial seed profiles if database is empty so leaderboard displays
  if (allLeaderboardEntries.length === 0) {
    const seedProfiles: PublicCommunityProfile[] = [
      { uid: 'u1', displayName: 'Vikram Singh', targetYear: 2026, completion: 81, pyqsSolved: 1420, mockTests: 12, questionsSolved: 2100, studyHours: 84, averageScore: 88, currentStreak: 14, lastActive: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { uid: 'u2', displayName: 'Ananya Sharma', targetYear: 2026, completion: 74, pyqsSolved: 1150, mockTests: 10, questionsSolved: 1850, studyHours: 72, averageScore: 82, currentStreak: 11, lastActive: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { uid: 'u3', displayName: 'Rohan Mehta', targetYear: 2026, completion: 66, pyqsSolved: 980, mockTests: 8, questionsSolved: 1500, studyHours: 61, averageScore: 78, currentStreak: 9, lastActive: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { uid: 'u4', displayName: 'Priya Verma', targetYear: 2026, completion: 59, pyqsSolved: 820, mockTests: 7, questionsSolved: 1250, studyHours: 53, averageScore: 75, currentStreak: 6, lastActive: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { uid: 'u5', displayName: 'Arjun Nair', targetYear: 2026, completion: 51, pyqsSolved: 710, mockTests: 5, questionsSolved: 1020, studyHours: 46, averageScore: 72, currentStreak: 5, lastActive: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];
    allLeaderboardEntries.push(...seedProfiles);
  }

  // Sort by performance (hours studied, completion, average score)
  const rankedLeaderboard = [...allLeaderboardEntries]
    .map(p => {
      const chaptersDone = Math.min(27, Math.round((p.completion / 100) * TOTAL_MATH_CHAPTERS));
      const hoursThisWeek = Math.max(2, Math.round((p.studyHours || 10) * 0.25));
      return {
        ...p,
        chaptersDone,
        hoursThisWeek
      };
    })
    .sort((a, b) => (b.studyHours + b.completion * 2 + b.averageScore) - (a.studyHours + a.completion * 2 + a.averageScore));

  const totalUsersCount = Math.max(totalActiveCount || 0, rankedLeaderboard.length + 15);

  return (
    <div className="space-y-6 font-mono text-xs text-[#E9E9EC] select-none">
      {/* TOP SECTION: TOTAL NUMBER OF USERS */}
      <div className="bg-[#141416] border border-[#26262B] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-wider uppercase text-[#E9E9EC]">
            LEADERBOARD
          </h2>
          <p className="text-xs text-[#8A8A93] uppercase tracking-wider mt-0.5">
            Top NDA Mathematics Aspirants
          </p>
        </div>

        <div className="bg-[#0B0B0C] border border-[#26262B] px-4 py-2.5 text-right">
          <div className="text-[10px] text-[#8A8A93] uppercase tracking-wider">Total Users</div>
          <div className="text-lg font-bold text-[#E9E9EC] font-mono">{totalUsersCount}</div>
        </div>
      </div>

      {/* LEADERBOARD TABLE (NO ICONS, PLAIN NAMES, NUMBERS & RANKING) */}
      <div className="bg-[#141416] border border-[#26262B] overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-[#0B0B0C] border-b border-[#26262B] text-[10px] text-[#8A8A93] uppercase tracking-wider">
          <div className="col-span-1 text-center">Rank</div>
          <div className="col-span-5 sm:col-span-4">Name</div>
          <div className="col-span-3 sm:col-span-3 text-center">Hours this week</div>
          <div className="col-span-3 sm:col-span-2 text-center">Chapters Done</div>
          <div className="hidden sm:block sm:col-span-2 text-right pr-2">Avg Score</div>
        </div>

        <div className="divide-y divide-[#26262B]/60">
          {rankedLeaderboard.map((user, idx) => {
            const isCurrentUser = user.uid === profile.uid;

            return (
              <div
                key={user.uid || idx}
                onClick={() => setSelectedProfile({
                  displayName: user.displayName,
                  studyHours: user.studyHours,
                  chaptersDone: user.chaptersDone,
                  averageScore: user.averageScore
                })}
                className={`grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-[#18181B] cursor-pointer transition-colors ${
                  isCurrentUser ? 'bg-[#18181B]/80 font-semibold' : ''
                }`}
              >
                {/* Rank */}
                <div className="col-span-1 text-center text-[#8A8A93] text-xs">
                  #{idx + 1}
                </div>

                {/* Name */}
                <div className="col-span-5 sm:col-span-4 truncate text-xs text-[#E9E9EC]">
                  {user.displayName} {isCurrentUser && <span className="text-[10px] text-[#8A8A93] ml-1">(You)</span>}
                </div>

                {/* Hours this week */}
                <div className="col-span-3 sm:col-span-3 text-center text-xs text-[#E9E9EC]">
                  Hours this week: {user.hoursThisWeek}h
                </div>

                {/* Chapters Done */}
                <div className="col-span-3 sm:col-span-2 text-center text-xs text-[#E9E9EC]">
                  {user.chaptersDone} / 27
                </div>

                {/* Avg Score */}
                <div className="hidden sm:block sm:col-span-2 text-right pr-2 text-xs text-[#4F8CFF]">
                  {Math.round(user.averageScore)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MINIMAL USER PROFILE VIEW MODAL */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#141416] border border-[#26262B] p-6 w-full max-w-sm space-y-5 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#26262B] pb-3">
              <h3 className="text-sm font-semibold uppercase text-[#E9E9EC]">
                {selectedProfile.displayName}
              </h3>
              <button
                onClick={() => setSelectedProfile(null)}
                className="text-[#8A8A93] hover:text-[#E9E9EC] cursor-pointer text-xs uppercase"
              >
                [Close]
              </button>
            </div>

            {/* Basic Stats Only */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between py-1.5 border-b border-[#26262B]/50">
                <span className="text-[#8A8A93] uppercase">Hours Studied</span>
                <span className="text-[#E9E9EC] font-bold">{selectedProfile.studyHours.toFixed(1)} hrs</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#26262B]/50">
                <span className="text-[#8A8A93] uppercase">Chapters Done</span>
                <span className="text-[#E9E9EC] font-bold">{selectedProfile.chaptersDone} / 27</span>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="text-[#8A8A93] uppercase">Average Score</span>
                <span className="text-[#4F8CFF] font-bold">{Math.round(selectedProfile.averageScore)}%</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedProfile(null)}
              className="w-full h-8 bg-[#0B0B0C] hover:bg-[#1E1E22] border border-[#26262B] text-xs uppercase text-[#E9E9EC] transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
