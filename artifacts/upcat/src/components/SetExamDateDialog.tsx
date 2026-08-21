import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, Sparkles, Trash2, Check } from "lucide-react";
import { UniversityLogo } from "@/components/UniversityLogo";
import { calculateDaysRemaining, formatCustomDateDisplay } from "@/lib/userUniversities";

interface SetExamDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  universityId: string;
  universityName: string;
  currentDate?: string;
  defaultDate?: string;
  onSaveDate: (newDateStr: string) => void;
}

export function SetExamDateDialog({
  open,
  onOpenChange,
  universityId,
  universityName,
  currentDate = "",
  defaultDate = "TBA",
  onSaveDate,
}: SetExamDateDialogProps) {
  const [selectedDate, setSelectedDate] = useState<string>(currentDate || "");

  useEffect(() => {
    if (open) {
      setSelectedDate(currentDate || "");
    }
  }, [open, currentDate]);

  const daysLeft = calculateDaysRemaining(selectedDate);
  const formattedPreview = selectedDate ? formatCustomDateDisplay(selectedDate) : (defaultDate || "TBA");

  const handleSave = () => {
    onSaveDate(selectedDate.trim());
    onOpenChange(false);
  };

  const handleClear = () => {
    setSelectedDate("");
    onSaveDate("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <UniversityLogo
              universityId={universityId}
              alt={`${universityName} logo`}
              className="h-10 w-10 shrink-0 object-contain"
            />
            <div>
              <DialogTitle className="text-lg font-bold">Set Exam Schedule</DialogTitle>
              <DialogDescription className="text-xs">
                Set your specific test date based on your test permit or location.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="p-3 rounded-lg bg-muted/40 border space-y-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              University
            </span>
            <p className="text-sm font-bold text-foreground">{universityName}</p>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">Default Schedule:</span>
              <Badge variant="outline" className="text-xs font-semibold">
                {defaultDate || "TBA"}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="exam-date-input" className="text-xs font-semibold flex items-center justify-between">
              <span>Your Specific Exam Date</span>
              {selectedDate && (
                <span className="text-[11px] text-primary font-bold">
                  {formattedPreview}
                </span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="exam-date-input"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full h-10 text-sm font-medium cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Tip: Entrance exams (like UPCAT, ACET, DCAT, BUCET) often schedule test dates across different weekends or provincial test centers.
            </p>
          </div>

          {selectedDate && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Live Countdown
                </span>
                {daysLeft !== null && (
                  <Badge variant={daysLeft <= 7 ? "destructive" : "default"} className="text-xs font-bold">
                    {daysLeft <= 0 ? "Exam Day / Passed" : `${daysLeft} days left`}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Your countdown timer will automatically adapt to <strong>{formattedPreview}</strong>.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {currentDate && (
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Reset to Default / TBA
            </Button>
          )}
          <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1 sm:flex-none text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-none text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90"
            >
              <Check className="h-3.5 w-3.5" />
              Save Date
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
