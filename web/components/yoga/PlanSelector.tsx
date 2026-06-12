"use client";

import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useYogaStore, SessionPlan } from "@/store/yogaStore";
import { api } from "@/lib/api";
import {
  normalizeYogaSessionPlan,
  normalizeYogaSessionRecord,
  type YogaSessionPlanApi,
  type YogaSessionRecordApi,
} from "@/lib/wellness";
import {
  Play,
  Flame,
  Brain,
  Compass,
  Calendar,
  Award,
  Clock,
  Sparkles,
  TrendingUp,
  ChevronRight,
  Trash2,
} from "lucide-react";

interface PlanSelectorProps {
  onStart: (plan: SessionPlan) => void;
}

// Plan styling configuration map based on ID
const PLAN_THEMES: Record<
  string,
  {
    icon: React.ComponentType<any>;
    gradient: string;
    text: string;
    border: string;
    badgeBg: string;
    badgeText: string;
    buttonBg: string;
  }
> = {
  "pcos-relief": {
    icon: Flame,
    gradient: "from-rose-50 to-pink-50/50",
    text: "text-rose-600",
    border: "hover:border-rose-200 hover:shadow-rose-100/30",
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-600 border-rose-100",
    buttonBg: "bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600",
  },
  "anxiety-relief": {
    icon: Brain,
    gradient: "from-indigo-50 to-purple-50/50",
    text: "text-indigo-600",
    border: "hover:border-indigo-200 hover:shadow-indigo-100/30",
    badgeBg: "bg-indigo-50",
    badgeText: "text-indigo-600 border-indigo-100",
    buttonBg: "bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600",
  },
  "beginner-flow": {
    icon: Compass,
    gradient: "from-emerald-50 to-teal-50/50",
    text: "text-emerald-600",
    border: "hover:border-emerald-200 hover:shadow-emerald-100/30",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-600 border-emerald-100",
    buttonBg: "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600",
  },
};

export function PlanSelector({ onStart }: PlanSelectorProps) {
  const { plans, setPlans, sessionHistory, setSessionHistory } = useYogaStore();

  useEffect(() => {
    api
      .get<YogaSessionPlanApi[]>("/yoga/sessions")
      .then((r) => setPlans(r.data.map(normalizeYogaSessionPlan)))
      .catch(() => {});

    api
      .get<YogaSessionRecordApi[]>("/yoga/history")
      .then((r) => setSessionHistory(r.data.map(normalizeYogaSessionRecord)))
      .catch(() => {});
  }, [setPlans, setSessionHistory]);

  const handleDeleteSession = async (id: string) => {
    if (!confirm("Are you sure you want to delete this yoga session from your history?")) return;
    try {
      await api.delete(`/yoga/history/${id}`);
      setSessionHistory(sessionHistory.filter((record) => record.id !== id));
    } catch (err) {
      // Silently handle error
    }
  };

  // Helper to calculate total practice time for a plan
  const getPlanDuration = (plan: SessionPlan) => {
    const totalSecs = plan.poses.reduce((acc, p) => acc + p.holdDurationSeconds, 0);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins} mins`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header and greeting */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Badge className="bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white border-0 px-2.5 py-0.5 mb-2">
            Yoga Sanctuary
          </Badge>
          <h1 className="text-3xl font-bold font-serif text-slate-800 leading-tight flex items-center gap-2">
            Practice with Aria <Sparkles className="h-5 w-5 text-indigo-500" />
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Choose a curated session to begin your deep breathing and mindful movement practice.
          </p>
        </div>
        {sessionHistory.length > 0 && (
          <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 shadow-xs">
            <div className="text-center">
              <p className="text-xs text-slate-400 font-semibold uppercase">Total Sessions</p>
              <p className="text-lg font-bold text-slate-800">{sessionHistory.length}</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Latest Score</p>
              <p className="text-lg font-bold text-indigo-600">
                {sessionHistory[0].averagePoseScore.toFixed(0)}/100
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Plan selection grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan, i) => {
          const theme = PLAN_THEMES[plan.id] || {
            icon: Sparkles,
            gradient: "from-slate-50 to-slate-100/30",
            text: "text-slate-600",
            border: "hover:border-slate-200",
            badgeBg: "bg-slate-100",
            badgeText: "text-slate-600 border-slate-200",
            buttonBg: "bg-slate-800 hover:bg-slate-900",
          };
          const PlanIcon = theme.icon;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              className="flex"
            >
              <Card className={`flex flex-col justify-between border border-slate-100 bg-white shadow-xs transition-all duration-300 rounded-2xl ${theme.border} hover:shadow-md hover:-translate-y-1 w-full overflow-hidden`}>
                <div>
                  <div className={`p-5 bg-gradient-to-b ${theme.gradient} border-b border-slate-50 flex items-start justify-between`}>
                    <div className="space-y-1">
                      <span className={`p-2 rounded-xl bg-white/90 shadow-xs inline-block ${theme.text}`}>
                        <PlanIcon className="h-5 w-5" />
                      </span>
                      <CardTitle className="text-lg font-bold text-slate-800 mt-2 leading-tight">
                        {plan.name}
                      </CardTitle>
                    </div>
                    <Badge variant="outline" className={`text-[10px] font-bold tracking-wide uppercase px-2 py-0 border ${theme.badgeText} ${theme.badgeBg}`}>
                      {plan.poses.length} Poses
                    </Badge>
                  </div>

                  <CardContent className="pt-4 pb-4 space-y-4">
                    <p className="text-xs leading-relaxed text-slate-500">
                      {plan.description}
                    </p>
                    
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Sequence Flow
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {plan.poses.map((pose, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-slate-50 border border-slate-100 text-slate-600 rounded-lg px-2 py-0.5"
                          >
                            {pose.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </div>

                <div className="p-5 pt-0 border-t border-slate-50 mt-auto bg-slate-50/20">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> Est. {getPlanDuration(plan)}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-indigo-600">
                      <Award className="h-3.5 w-3.5" /> AI Scoring
                    </span>
                  </div>
                  <Button
                    className={`w-full rounded-xl h-10 shadow-xs flex items-center justify-center gap-1.5 font-bold ${theme.buttonBg} text-white transition-all`}
                    onClick={() => onStart(plan)}
                  >
                    <Play className="h-4 w-4 fill-current" /> Start Practice
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Recent sessions log */}
      {sessionHistory.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Calendar className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wide">
              Recent Practice History
            </h2>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {sessionHistory.slice(0, 6).map((record) => (
              <Card
                key={record.id}
                className="border border-slate-100 bg-white shadow-xs hover:shadow-sm transition-all duration-200 rounded-2xl overflow-hidden relative group"
              >
                <button
                  onClick={() => handleDeleteSession(record.id)}
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-50 text-slate-400 opacity-100 md:opacity-0 group-hover:opacity-100 hover:text-rose-500 hover:bg-rose-50 transition-all duration-200 z-10 border border-slate-100/50"
                  title="Delete record"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <CardContent className="p-4 flex justify-between items-center h-full">
                  <div className="space-y-1">
                    <p className="font-semibold text-sm text-slate-800 line-clamp-1">
                      {record.planName}
                    </p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(record.completedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Badge className="bg-rose-50 text-rose-600 border-0 text-[9px] font-bold px-1.5 py-0">
                        {Math.round(record.durationSeconds / 60)}m {record.durationSeconds % 60}s
                      </Badge>
                      <Badge className="bg-amber-50 text-amber-600 border-0 text-[9px] font-bold px-1.5 py-0">
                        {record.caloriesEstimate.toFixed(0)} kcal
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-right border-l border-slate-50 pl-3">
                    <p className="text-lg font-black text-indigo-600 leading-none">
                      {record.averagePoseScore.toFixed(0)}
                      <span className="text-[10px] font-normal text-slate-400 block mt-0.5">/100 score</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
