import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Clock,
  MapPin,
  Calendar as CalendarIcon,
  BellRing,
  ListOrdered
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export interface CustomEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  category: "exam" | "deadline" | "study" | "other";
  description?: string;
  location?: string;
  isPreset?: boolean;
}

const DEFAULT_CET_EVENTS: CustomEvent[] = [
  {
    id: "preset-admu-deadline",
    title: "Ateneo (ACET) Application Period Closes",
    date: "2026-08-24",
    time: "05:00 PM",
    category: "deadline",
    description: "Submission of Ateneo College Application Forms & essay.",
    location: "Ateneo Edu Portal",
    isPreset: true,
  },
  {
    id: "preset-dlsu-exam",
    title: "DLSU DCAT Testing Schedule",
    date: "2026-09-15",
    time: "08:00 AM",
    category: "exam",
    description: "De La Salle University College Admission Test.",
    location: "DLSU Manila Campus",
    isPreset: true,
  },
  {
    id: "preset-bucet-exam",
    title: "BUCET 2027 Official Exam Date",
    date: "2026-11-19",
    time: "07:30 AM",
    category: "exam",
    description: "Bicol University College Entrance Test (BUCET) Examination Day.",
    location: "Bicol University Campuses",
    isPreset: true,
  },
  {
    id: "preset-bu-deadline",
    title: "Bicol University (BU) Application Deadline",
    date: "2026-10-30",
    time: "05:00 PM",
    category: "deadline",
    description: "Final deadline to submit BU application forms online.",
    location: "iBU Online Portal",
    isPreset: true,
  },
  {
    id: "preset-nu-open",
    title: "National University (NU) Registration Opens",
    date: "2026-08-08",
    time: "08:00 AM",
    category: "deadline",
    description: "National University admission registration opens for incoming freshmen.",
    location: "NU Quest Portal",
    isPreset: true,
  },
  {
    id: "preset-dost-deadline",
    title: "DOST-SEI Scholarship Application Deadline",
    date: "2026-09-17",
    time: "11:59 PM",
    category: "deadline",
    description: "Final deadline to submit DOST-SEI Undergraduate Scholarship application.",
    location: "DOST E-Scholarship Portal",
    isPreset: true,
  },
  {
    id: "preset-ust-deadline",
    title: "UST (USTET) Application Deadline",
    date: "2027-01-08",
    time: "05:00 PM",
    category: "deadline",
    description: "University of Santo Tomas Application Period closes.",
    location: "USTET Portal",
    isPreset: true,
  },
  {
    id: "preset-pnu-deadline",
    title: "PNU Application Period Closes",
    date: "2026-10-23",
    time: "05:00 PM",
    category: "deadline",
    description: "Philippine Normal University online application submission deadline.",
    location: "PNU Online Applicants Portal",
    isPreset: true,
  },
];

const LOCAL_STORAGE_KEY = "kolehiyotrack_user_calendar_events";

export function CalendarWidget() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const [userEvents, setUserEvents] = useState<CustomEvent[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to parse calendar events", e);
    }
    return [];
  });

  // Save to localStorage when userEvents change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userEvents));
    } catch (e) {
      console.error("Failed to save calendar events", e);
    }
  }, [userEvents]);

  // Combine default preset events with user custom events
  const allEvents = [...DEFAULT_CET_EVENTS, ...userEvents];

  // Add Custom Event Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [upcomingDialogOpen, setUpcomingDialogOpen] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(selectedDateStr);
  const [newTime, setNewTime] = useState("09:00 AM");
  const [newCategory, setNewCategory] = useState<"exam" | "deadline" | "study" | "other">("study");
  const [newLocation, setNewLocation] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(today.toISOString().split("T")[0]);
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) return;

    const created: CustomEvent = {
      id: `custom-${Date.now()}`,
      title: newTitle.trim(),
      date: newDate,
      time: newTime ? newTime : undefined,
      category: newCategory,
      location: newLocation.trim() || undefined,
      description: newDescription.trim() || undefined,
    };

    setUserEvents((prev) => [created, ...prev]);
    toast({
      title: "Event Added",
      description: `"${created.title}" added to your calendar.`,
    });

    setAddDialogOpen(false);
    setNewTitle("");
    setNewLocation("");
    setNewDescription("");
  };

  const handleDeleteEvent = (eventId: string, title: string) => {
    setUserEvents((prev) => prev.filter((e) => e.id !== eventId));
    toast({
      title: "Event Removed",
      description: `"${title}" has been deleted from your calendar.`,
    });
  };

  // Calendar calculations
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const todayStr = new Date().toISOString().split("T")[0];

  // Events on selected date
  const selectedDateEvents = allEvents.filter((evt) => evt.date === selectedDateStr);

  // Upcoming events sorted by date
  const upcomingEvents = allEvents
    .filter((evt) => evt.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "exam":
        return <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-[10px]">Exam</Badge>;
      case "deadline":
        return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]">Deadline</Badge>;
      case "study":
        return <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px]">Study</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">Event</Badge>;
    }
  };

  return (
    <div className="space-y-3 w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          Calendar
        </h2>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setUpcomingDialogOpen(true)}
            className="gap-1 font-semibold text-xs h-8 px-2.5"
            title="View all upcoming CET dates"
          >
            <ListOrdered className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Schedule</span>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setNewDate(selectedDateStr);
              setAddDialogOpen(true);
            }}
            className="gap-1 font-semibold text-xs h-8 px-2.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Event
          </Button>
        </div>
      </div>

      {/* Main Calendar Card */}
      <Card className="border border-border bg-card shadow-sm overflow-hidden w-full">
        {/* Month Navigation Bar */}
        <CardHeader className="p-3.5 pb-2.5 flex flex-row items-center justify-between border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
            <CardTitle className="text-sm font-bold tracking-tight">
              {monthNames[month]} {year}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="h-7 text-[11px] font-semibold px-2"
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="h-7 w-7"
              title="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="h-7 w-7"
              title="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-3.5 space-y-3">
          {/* Day Names Header */}
          <div className="grid grid-cols-7 text-center text-[11px] font-bold text-muted-foreground">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Blank leading slots */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} className="aspect-square" />
            ))}

            {/* Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(
                dayNum
              ).padStart(2, "0")}`;

              const isToday = dateString === todayStr;
              const isSelected = dateString === selectedDateStr;

              // Events on this date
              const dayEvents = allEvents.filter((e) => e.date === dateString);
              const hasExam = dayEvents.some((e) => e.category === "exam");
              const hasDeadline = dayEvents.some((e) => e.category === "deadline");

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => setSelectedDateStr(dateString)}
                  className={`aspect-square w-full rounded-md flex flex-col items-center justify-center relative text-xs font-semibold transition-all hover:bg-muted/70 ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold shadow-sm ring-2 ring-primary/40"
                      : isToday
                      ? "bg-primary/10 text-primary border border-primary/40 font-bold"
                      : "text-foreground"
                  }`}
                >
                  <span>{dayNum}</span>

                  {/* Dot Indicators */}
                  {dayEvents.length > 0 && (
                    <div className="flex items-center gap-0.5 absolute bottom-1">
                      {hasExam ? (
                        <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : "bg-red-500"}`} />
                      ) : hasDeadline ? (
                        <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : "bg-amber-500"}`} />
                      ) : (
                        <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : "bg-blue-500"}`} />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-3 pt-2.5 border-t text-[11px] text-muted-foreground font-medium">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
              <span>Exam</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
              <span>Deadline</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
              <span>Study</span>
            </div>
          </div>

          {/* Selected Date Events Section */}
          <div className="pt-2 border-t space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <BellRing className="h-3.5 w-3.5 text-primary" />
                {new Date(selectedDateStr + "T00:00:00").toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNewDate(selectedDateStr);
                  setAddDialogOpen(true);
                }}
                className="h-6 text-[11px] font-semibold px-2 text-primary hover:text-primary"
              >
                + Add
              </Button>
            </div>

            {selectedDateEvents.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-2">
                No events scheduled for this day.
              </p>
            ) : (
              <div className="space-y-1.5">
                {selectedDateEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-2 rounded-md border bg-muted/15 text-xs space-y-1"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-foreground leading-snug">{evt.title}</span>
                          {getCategoryBadge(evt.category)}
                        </div>
                        {evt.time && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>{evt.time}</span>
                          </div>
                        )}
                        {evt.location && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{evt.location}</span>
                          </div>
                        )}
                        {evt.description && (
                          <p className="text-[11px] text-muted-foreground leading-tight pt-0.5">
                            {evt.description}
                          </p>
                        )}
                      </div>

                      {!evt.isPreset && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => handleDeleteEvent(evt.id, evt.title)}
                          title="Delete event"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog for Adding Custom Event */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Plus className="h-4 w-4 text-primary" />
              Add Calendar Event
            </DialogTitle>
            <DialogDescription className="text-xs">
              Schedule a CET practice session, exam, or submission deadline.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateEvent} className="space-y-3 my-1">
            <div className="space-y-1">
              <Label htmlFor="evt-title" className="text-xs font-bold">
                Title *
              </Label>
              <Input
                id="evt-title"
                placeholder="e.g. UPCAT Science Review"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label htmlFor="evt-date" className="text-xs font-bold">
                  Date *
                </Label>
                <Input
                  id="evt-date"
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="evt-time" className="text-xs font-bold">
                  Time
                </Label>
                <Input
                  id="evt-time"
                  placeholder="e.g. 08:00 AM"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="evt-category" className="text-xs font-bold">
                Category
              </Label>
              <select
                id="evt-category"
                value={newCategory}
                onChange={(e: any) => setNewCategory(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="study">Study Session</option>
                <option value="exam">Exam Date</option>
                <option value="deadline">Application Deadline</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="evt-location" className="text-xs font-bold">
                Location (Optional)
              </Label>
              <Input
                id="evt-location"
                placeholder="e.g. Library or Online Portal"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="evt-desc" className="text-xs font-bold">
                Notes (Optional)
              </Label>
              <Input
                id="evt-desc"
                placeholder="e.g. Math practice mock test"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="font-semibold">
                Save Event
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog for Upcoming Admissions & CET Schedule */}
      <Dialog open={upcomingDialogOpen} onOpenChange={setUpcomingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <ListOrdered className="h-4 w-4 text-primary" />
              Upcoming Admissions & CET Schedule
            </DialogTitle>
            <DialogDescription className="text-xs">
              Key college entrance exam dates and deadlines.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 my-1">
            {upcomingEvents.map((evt) => (
              <div
                key={evt.id}
                onClick={() => {
                  setSelectedDateStr(evt.date);
                  setUpcomingDialogOpen(false);
                }}
                className="p-2.5 rounded-lg border bg-muted/15 hover:bg-muted/30 cursor-pointer flex items-center justify-between gap-2 transition-colors"
              >
                <div className="space-y-0.5 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{evt.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(evt.date + "T00:00:00").toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {evt.time ? ` • ${evt.time}` : ""}
                  </p>
                </div>
                {getCategoryBadge(evt.category)}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUpcomingDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
