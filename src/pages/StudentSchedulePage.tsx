import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar, Clock, RefreshCw, Settings, CheckCircle2, Circle,
  Sunrise, Moon, Coffee, BookOpen, Dumbbell, Utensils, Trophy,
  Music, BookMarked, Smile, Car, Sun, Sunset, Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/DashboardLayout";
import ScheduleSettings from "@/components/schedule/ScheduleSettings";
import OnboardingWizard from "@/components/schedule/OnboardingWizard";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const typeConfig: any = {
  routine: { color: "bg-sky-100 border-sky-500 text-sky-700", icon: Sunrise },
  prayer: { color: "bg-teal-100 border-teal-500 text-teal-700", icon: Moon },
  study: { color: "bg-blue-100 border-blue-500 text-blue-700", icon: BookOpen },
  college: { color: "bg-purple-100 border-purple-500 text-purple-700", icon: BookMarked },
  gym: { color: "bg-amber-100 border-amber-500 text-amber-700", icon: Dumbbell },
  meal: { color: "bg-green-100 border-green-500 text-green-700", icon: Utensils },
  play: { color: "bg-rose-100 border-rose-500 text-rose-700", icon: Trophy },
  eca: { color: "bg-indigo-100 border-indigo-500 text-indigo-700", icon: Music },
  break: { color: "bg-yellow-100 border-yellow-300 text-yellow-700", icon: Coffee },
  sleep: { color: "bg-gray-100 border-gray-500 text-gray-700", icon: Moon },
  free: { color: "bg-pink-100 border-pink-300 text-pink-700", icon: Smile },
};

const getIcon = (type: string, iconKey?: string) => {
  const config = typeConfig[type] || typeConfig.routine;
  const IconComponent = config.icon;
  return <IconComponent className="h-5 w-5" />;
};

const StudentSchedulePage = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  const [schedule, setSchedule] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentView, setCurrentView] = useState<'today' | 'week'>('today');
  const [selectedDay, setSelectedDay] = useState(0); // 0=Mon, 6=Sun
  const [realTime, setRealTime] = useState(new Date());
  const timelineRef = useRef<HTMLDivElement>(null);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayAbbr = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Update real-time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setRealTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch settings and schedule on mount
  useEffect(() => {
    fetchSettings();
    fetchSchedule();
  }, []);

  // Auto-scroll to current time
  useEffect(() => {
    if (timelineRef.current && schedule?.slots) {
      setTimeout(() => {
        const currentEl = timelineRef.current?.querySelector('.is-current');
        if (currentEl) {
          currentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, [schedule]);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/schedule/settings`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setSettings(data.data);
        // Check if first-time user
        if (!data.data.city || data.data.city === 'Kochi') {
          setShowOnboarding(true);
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/schedule/today`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setSchedule(data.data);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    try {
      setRegenerating(true);
      const res = await fetch(`${API_BASE}/api/schedule/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setSchedule(data.data);
      }
    } catch (error) {
      console.error('Error regenerating schedule:', error);
    } finally {
      setRegenerating(false);
    }
  };

  const handleSlotToggle = async (index: number) => {
    if (!schedule) return;
    
    const updatedSlots = [...schedule.slots];
    updatedSlots[index] = {
      ...updatedSlots[index],
      user_completed: !updatedSlots[index].user_completed,
      completed: !updatedSlots[index].user_completed
    };
    
    try {
      await fetch(`${API_BASE}/api/schedule/slot/${index}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ completed: !updatedSlots[index].user_completed })
      });
      
      setSchedule({ ...schedule, slots: updatedSlots });
    } catch (error) {
      console.error('Error updating slot:', error);
    }
  };

  const handleSettingsSave = () => {
    setShowSettings(false);
    fetchSettings();
    fetchSchedule();
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    fetchSettings();
    fetchSchedule();
  };

  const getCurrentTimePosition = () => {
    if (!schedule?.slots) return null;
    
    const now = realTime;
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const firstSlotTime = schedule.slots[0]?.time;
    const lastSlotTime = schedule.slots[schedule.slots.length - 1]?.time;
    
    if (currentTime < firstSlotTime || currentTime > lastSlotTime) return null;
    
    return currentTime;
  };

  const isSlotPast = (slotTime: string) => {
    const now = realTime;
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    return slotTime < currentTime;
  };

  const isSlotCurrent = (slotTime: string, duration: number) => {
    const now = realTime;
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const [slotHour, slotMin] = slotTime.split(':').map(Number);
    const slotEndMin = slotHour * 60 + slotMin + duration;
    const slotEnd = `${Math.floor(slotEndMin / 60).toString().padStart(2, '0')}:${(slotEndMin % 60).toString().padStart(2, '0')}`;
    
    return currentTime >= slotTime && currentTime < slotEnd;
  };

  const completedCount = schedule?.slots?.filter(s => s.completed).length || 0;
  const totalCount = schedule?.slots?.length || 0;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <DashboardLayout role="student" navItems={[]}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="student" navItems={[]}>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {schedule?.day_name || days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]}
              </h1>
              <p className="text-slate-600 mt-1">
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleRegenerate}
                disabled={regenerating}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
              <Button
                onClick={() => setShowSettings(true)}
                variant="outline"
                size="sm"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Progress */}
          <Card className="mb-4">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">
                  Today's Progress
                </span>
                <span className="text-sm text-slate-600">
                  {completedCount}/{totalCount} completed
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </CardContent>
          </Card>

          {/* View Tabs */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={currentView === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentView('today')}
            >
              Today
            </Button>
            <Button
              variant={currentView === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentView('week')}
            >
              This Week
            </Button>
          </div>

          {/* Day Selector */}
          {currentView === 'today' && (
            <div className="flex gap-1 mb-4 overflow-x-auto">
              {dayAbbr.map((day, idx) => (
                <Button
                  key={day}
                  variant={selectedDay === idx ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDay(idx)}
                  className="min-w-[60px]"
                >
                  {day}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Schedule Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today's Schedule
              {schedule?.day_type && (
                <Badge variant={schedule.day_type === 'weekday' ? 'default' : 'secondary'}>
                  {schedule.day_type === 'weekday' ? 'College Day' : 'Weekend'}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={timelineRef} className="space-y-2 max-h-[600px] overflow-y-auto">
              {schedule?.slots?.map((slot: any, index: number) => {
                const config = typeConfig[slot.type] || typeConfig.routine;
                const past = isSlotPast(slot.time);
                const current = isSlotCurrent(slot.time, slot.duration);
                const Icon = getIcon(slot.type, slot.icon);

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`
                      relative p-4 rounded-lg border-l-4 transition-all cursor-pointer
                      ${config.color}
                      ${past && !slot.completed ? 'opacity-50' : 'opacity-100'}
                      ${current ? 'ring-2 ring-red-500 is-current' : ''}
                    `}
                    onClick={() => handleSlotToggle(index)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {slot.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm">{slot.label}</span>
                          <Badge variant="outline" className="text-xs">
                            {slot.duration} min
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs opacity-75">
                          <span>{slot.time}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            {Icon}
                            {slot.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Settings Modal */}
        {showSettings && (
          <ScheduleSettings
            settings={settings}
            onSave={handleSettingsSave}
            onClose={() => setShowSettings(false)}
          />
        )}

        {/* Onboarding Wizard */}
        {showOnboarding && (
          <OnboardingWizard
            onComplete={handleOnboardingComplete}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentSchedulePage;
