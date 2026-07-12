import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, GraduationCap, Plus, ArrowRight } from "lucide-react";
import { useUpcatCountdown } from "@/hooks/useCountdown";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const UNIVERSITIES = [
  { 
    id: 'upcat', 
    name: 'University of the Philippines - (UPCAT 2027)', 
    date: 'August 1-2, 2026',
    description: ''
  }
];

export default function Dashboard() {
  const { toast } = useToast();
  const upcatDaysLeft = useUpcatCountdown();

  const handleAddUniversity = () => {
    toast({
      title: "Coming Soon",
      description: "More universities will be added in a future update.",
    });
  };

  return (
    <Layout>
      <div className="space-y-8 max-w-4xl mx-auto w-full">
        <div className="space-y-4 text-center py-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
            Welcome to KolehiyoTrack
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Prepare for upcoming CETs with our high-fidelity mock test environment.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">My Universities</h2>
          <Button onClick={handleAddUniversity} className="gap-2">
            <Plus className="h-4 w-4" />
            Add University
          </Button>
        </div>

        <div className="grid gap-4">
          {UNIVERSITIES.map((uni) => (
            <Card key={uni.id} className="overflow-hidden border transition-all hover:border-primary/50">
              <div className="flex flex-col md:flex-row">
                {/* Left side info */}
                <div className="p-5 flex-1 flex flex-row items-center gap-4">
                  <img 
                    src={`${import.meta.env.BASE_URL}up-logo.png`} 
                    alt="UP logo" 
                    className="h-14 w-14 md:h-16 md:w-16 shrink-0 object-contain" 
                  />
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg md:text-xl font-bold">{uni.name}</CardTitle>
                    <div className="flex items-center justify-between gap-4 mt-2 w-full">
                      <p className="text-sm md:text-base font-semibold text-primary">
                        {uni.date || "TBA"}
                      </p>
                      {uni.id === 'upcat' ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-background border px-3 py-1 rounded-full shadow-sm shrink-0">
                          <Clock className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
                          <span>{upcatDaysLeft} days remaining</span>
                        </div>
                      ) : uni.date ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-background border px-3 py-1 rounded-full shadow-sm shrink-0">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          <span>{uni.date}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-background border px-3 py-1 rounded-full shadow-sm shrink-0">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          <span>TBA</span>
                        </div>
                      )}
                    </div>
                    {uni.description && (
                      <CardDescription className="mt-2 text-sm">
                        {uni.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
                
                {/* Right side action */}
                <div className="p-5 flex items-center justify-center bg-card md:w-48 shrink-0">
                  <Link href={`/university/${uni.id}`} className="w-full">
                    <Button 
                      size="default" 
                      className="w-full gap-2 text-sm h-10 font-semibold shadow-sm"
                    >
                      Study Now
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
