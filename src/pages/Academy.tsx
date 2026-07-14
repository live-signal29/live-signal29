import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, PlayCircle } from "lucide-react";
import { Header } from "@/components/Header";
import ReactMarkdown from "react-markdown";

interface Lesson { id: string; title: string; level: string; content: string; video_url?: string; order_index: number; }

export default function Academy() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selected, setSelected] = useState<Lesson | null>(null);

  useEffect(() => {
    supabase.from("academy_lessons").select("*").eq("published", true).order("order_index").then(({ data }) => {
      setLessons((data as Lesson[]) || []);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2"><GraduationCap className="text-primary" /> Trading Academy</h1>
        {selected ? (
          <div>
            <button onClick={() => setSelected(null)} className="mb-3 text-sm text-primary">← Back to lessons</button>
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Badge>{selected.level}</Badge>
                <h2 className="text-xl font-bold">{selected.title}</h2>
              </div>
              {selected.video_url && (
                <a href={selected.video_url} target="_blank" rel="noopener" className="flex items-center gap-2 text-primary mb-3">
                  <PlayCircle className="w-5 h-5" /> Watch video
                </a>
              )}
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{selected.content}</ReactMarkdown>
              </div>
            </Card>
          </div>
        ) : lessons.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">Lessons coming soon!</Card>
        ) : (
          <div className="grid gap-3">
            {lessons.map(l => (
              <Card key={l.id} className="p-4 cursor-pointer hover:shadow-md transition" onClick={() => setSelected(l)}>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{l.level}</Badge>
                  <h3 className="font-semibold flex-1">{l.title}</h3>
                  {l.video_url && <PlayCircle className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{l.content.slice(0, 120)}...</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
