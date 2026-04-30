import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface OnboardingWizardProps {
  onComplete: () => void;
}

const OnboardingWizard = ({ onComplete }: OnboardingWizardProps) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    wake_time: '05:45',
    sleep_time: '23:00',
    leave_home_time: '08:15',
    arrive_home_time: '16:45',
    city: '',
    religion: 'None',
    gym_enabled: false,
    gym_time_pref: 'Evening',
    gym_duration: 45,
    play_duration: 30,
    study_block_length: 45,
    break_duration: 10,
    auto_optimize: true,
    college_start_time: '09:00',
    college_end_time: '16:00',
  });

  const totalSteps = 5;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/schedule/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (data.status === 'ok') {
        // Generate initial schedule
        await fetch(`${API_BASE}/api/schedule/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        onComplete();
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const progress = (step / totalSteps) * 100;

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Welcome to Your Personal Schedule Planner!</DialogTitle>
        </DialogHeader>

        <div className="mb-6">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-slate-600 mt-2">Step {step} of {totalSteps}</p>
        </div>

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Personal Routine</h3>
            <p className="text-sm text-slate-600">Let's start with your daily routine times</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Wake-up Time</Label>
                <Input
                  type="time"
                  value={formData.wake_time}
                  onChange={(e) => setFormData({ ...formData, wake_time: e.target.value })}
                />
              </div>
              <div>
                <Label>Sleep Time</Label>
                <Input
                  type="time"
                  value={formData.sleep_time}
                  onChange={(e) => setFormData({ ...formData, sleep_time: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>City (for prayer times)</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g., Kochi, Delhi, Mumbai"
              />
            </div>

            <div>
              <Label>Religion</Label>
              <Select
                value={formData.religion}
                onValueChange={(value) => setFormData({ ...formData, religion: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Muslim">Muslim</SelectItem>
                  <SelectItem value="Hindu">Hindu</SelectItem>
                  <SelectItem value="Christian">Christian</SelectItem>
                  <SelectItem value="None">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 2: College Timing */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">College Schedule</h3>
            <p className="text-sm text-slate-600">When do you leave for and return from college?</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Leave Home Time</Label>
                <Input
                  type="time"
                  value={formData.leave_home_time}
                  onChange={(e) => setFormData({ ...formData, leave_home_time: e.target.value })}
                />
              </div>
              <div>
                <Label>Arrive Home Time</Label>
                <Input
                  type="time"
                  value={formData.arrive_home_time}
                  onChange={(e) => setFormData({ ...formData, arrive_home_time: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>College Start Time</Label>
                <Input
                  type="time"
                  value={formData.college_start_time}
                  onChange={(e) => setFormData({ ...formData, college_start_time: e.target.value })}
                />
              </div>
              <div>
                <Label>College End Time</Label>
                <Input
                  type="time"
                  value={formData.college_end_time}
                  onChange={(e) => setFormData({ ...formData, college_end_time: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Fitness & Play */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Fitness & Recreation</h3>
            <p className="text-sm text-slate-600">Configure your gym and play preferences</p>
            
            <div>
              <Label>Gym Preference</Label>
              <Select
                value={formData.gym_enabled ? 'yes' : 'no'}
                onValueChange={(value) => setFormData({ ...formData, gym_enabled: value === 'yes' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes, I go to the gym</SelectItem>
                  <SelectItem value="no">No gym</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.gym_enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Preferred Time</Label>
                  <Select
                    value={formData.gym_time_pref}
                    onValueChange={(value) => setFormData({ ...formData, gym_time_pref: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Morning">Morning</SelectItem>
                      <SelectItem value="Evening">Evening</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duration</Label>
                  <Select
                    value={String(formData.gym_duration)}
                    onValueChange={(value) => setFormData({ ...formData, gym_duration: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div>
              <Label>Play/Recreation Time</Label>
              <Select
                value={String(formData.play_duration)}
                onValueChange={(value) => setFormData({ ...formData, play_duration: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 4: Study Preferences */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Study Preferences</h3>
            <p className="text-sm text-slate-600">How do you prefer to study?</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Study Block Length</Label>
                <Select
                  value={String(formData.study_block_length)}
                  onValueChange={(value) => setFormData({ ...formData, study_block_length: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 min (Pomodoro)</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Break Duration</Label>
                <Select
                  value={String(formData.break_duration)}
                  onValueChange={(value) => setFormData({ ...formData, break_duration: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 rounded">
              <div>
                <p className="font-medium">Auto-optimize Schedule</p>
                <p className="text-sm text-slate-600">Let AI arrange your schedule for maximum productivity</p>
              </div>
              <Button
                variant={formData.auto_optimize ? 'default' : 'outline'}
                onClick={() => setFormData({ ...formData, auto_optimize: !formData.auto_optimize })}
              >
                {formData.auto_optimize ? 'ON' : 'OFF'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Review & Complete */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">You're All Set!</h3>
              <p className="text-slate-600">
                Your personalized schedule has been generated based on your preferences.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded space-y-2">
              <p className="text-sm"><strong>Wake-up:</strong> {formData.wake_time}</p>
              <p className="text-sm"><strong>Sleep:</strong> {formData.sleep_time}</p>
              <p className="text-sm"><strong>City:</strong> {formData.city}</p>
              <p className="text-sm"><strong>Religion:</strong> {formData.religion}</p>
              <p className="text-sm"><strong>Gym:</strong> {formData.gym_enabled ? 'Yes' : 'No'}</p>
              <p className="text-sm"><strong>Study Block:</strong> {formData.study_block_length} min</p>
            </div>

            <p className="text-sm text-slate-600 text-center">
              You can always update these settings later by clicking the gear icon.
            </p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {step < totalSteps ? (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Generate My Schedule
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingWizard;
