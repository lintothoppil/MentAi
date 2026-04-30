import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, X, Plus, Trash2 } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface ScheduleSettingsProps {
  settings: any;
  onSave: () => void;
  onClose: () => void;
}

const ScheduleSettings = ({ settings, onSave, onClose }: ScheduleSettingsProps) => {
  const [formData, setFormData] = useState({
    wake_time: settings?.wake_time || '05:45',
    sleep_time: settings?.sleep_time || '23:00',
    leave_home_time: settings?.leave_home_time || '08:15',
    arrive_home_time: settings?.arrive_home_time || '16:45',
    city: settings?.city || 'Kochi',
    country: settings?.country || 'India',
    religion: settings?.religion || 'None',
    gym_enabled: settings?.gym_enabled || false,
    gym_time_pref: settings?.gym_time_pref || 'Evening',
    gym_duration: settings?.gym_duration || 45,
    play_duration: settings?.play_duration || 30,
    eca_details: settings?.eca_details || [],
    study_block_length: settings?.study_block_length || 45,
    break_duration: settings?.break_duration || 10,
    priority_subjects: settings?.priority_subjects || [],
    auto_optimize: settings?.auto_optimize !== undefined ? settings.auto_optimize : true,
    college_start_time: settings?.college_start_time || '09:00',
    college_end_time: settings?.college_end_time || '16:00',
  });

  const [saving, setSaving] = useState(false);
  const [ecaInput, setEcaInput] = useState({ name: '', days: [], duration: 60 });

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const handleSave = async () => {
    try {
      setSaving(true);
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
        onSave();
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const addECA = () => {
    if (ecaInput.name && ecaInput.days.length > 0) {
      setFormData({
        ...formData,
        eca_details: [...formData.eca_details, { ...ecaInput }]
      });
      setEcaInput({ name: '', days: [], duration: 60 });
    }
  };

  const removeECA = (index: number) => {
    const updated = [...formData.eca_details];
    updated.splice(index, 1);
    setFormData({ ...formData, eca_details: updated });
  };

  const toggleECADay = (day: string) => {
    const updated = [...ecaInput.days];
    if (updated.includes(day)) {
      updated.splice(updated.indexOf(day), 1);
    } else {
      updated.push(day);
    }
    setEcaInput({ ...ecaInput, days: updated });
  };

  const togglePrioritySubject = (subject: string) => {
    const updated = [...formData.priority_subjects];
    if (updated.includes(subject)) {
      updated.splice(updated.indexOf(subject), 1);
    } else if (updated.length < 3) {
      updated.push(subject);
    }
    setFormData({ ...formData, priority_subjects: updated });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Schedule Settings</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[70vh] pr-4">
          <Tabs defaultValue="personal">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="fitness">Fitness</TabsTrigger>
              <TabsTrigger value="study">Study</TabsTrigger>
              <TabsTrigger value="eca">ECA</TabsTrigger>
            </TabsList>

            {/* Personal Tab */}
            <TabsContent value="personal" className="space-y-4 mt-4">
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
                  <Label>College Start</Label>
                  <Input
                    type="time"
                    value={formData.college_start_time}
                    onChange={(e) => setFormData({ ...formData, college_start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>College End</Label>
                  <Input
                    type="time"
                    value={formData.college_end_time}
                    onChange={(e) => setFormData({ ...formData, college_end_time: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>City</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g., Kochi"
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
            </TabsContent>

            {/* Fitness Tab */}
            <TabsContent value="fitness" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <Label>Gym Enabled</Label>
                <Switch
                  checked={formData.gym_enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, gym_enabled: checked })}
                />
              </div>

              {formData.gym_enabled && (
                <>
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
                </>
              )}

              <div>
                <Label>Play/Recreation Duration</Label>
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
            </TabsContent>

            {/* Study Tab */}
            <TabsContent value="study" className="space-y-4 mt-4">
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

              <div>
                <Label>Priority Subjects (max 3)</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['Mathematics', 'Physics', 'Chemistry', 'Programming', 'English'].map((subject) => (
                    <Button
                      key={subject}
                      variant={formData.priority_subjects.includes(subject) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => togglePrioritySubject(subject)}
                      disabled={!formData.priority_subjects.includes(subject) && formData.priority_subjects.length >= 3}
                    >
                      {subject}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Auto-optimize Schedule</Label>
                <Switch
                  checked={formData.auto_optimize}
                  onCheckedChange={(checked) => setFormData({ ...formData, auto_optimize: checked })}
                />
              </div>
            </TabsContent>

            {/* ECA Tab */}
            <TabsContent value="eca" className="space-y-4 mt-4">
              <div className="space-y-3">
                <Label>Add ECA Activity</Label>
                <Input
                  placeholder="Activity name (e.g., Music, Dance)"
                  value={ecaInput.name}
                  onChange={(e) => setEcaInput({ ...ecaInput, name: e.target.value })}
                />

                <div>
                  <Label className="text-sm">Days</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {days.map((day) => (
                      <Button
                        key={day}
                        variant={ecaInput.days.includes(day) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleECADay(day)}
                      >
                        {day}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={ecaInput.duration}
                    onChange={(e) => setEcaInput({ ...ecaInput, duration: parseInt(e.target.value) })}
                  />
                </div>

                <Button onClick={addECA} disabled={!ecaInput.name || ecaInput.days.length === 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Activity
                </Button>
              </div>

              <div className="mt-6">
                <Label>Current Activities</Label>
                <div className="space-y-2 mt-2">
                  {formData.eca_details.map((eca: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                      <div>
                        <p className="font-medium">{eca.name}</p>
                        <p className="text-sm text-slate-600">
                          {eca.days.join(', ')} - {eca.duration} min
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeECA(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  {formData.eca_details.length === 0 && (
                    <p className="text-sm text-slate-500">No ECA activities added</p>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleSettings;
