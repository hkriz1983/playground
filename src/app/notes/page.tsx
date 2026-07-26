"use client";

import React, { useState, useEffect } from "react";
import { format, isPast, isToday } from "date-fns";
import { Calendar, CheckCircle2, Clock, Plus, Trash2, Bell } from "lucide-react";

type Note = {
  id: string;
  title: string;
  content: string | null;
  category: string;
  reminderAt: string | null;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function Dashboard() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [filter, setFilter] = useState<"all" | "reminders" | "completed">("all");
  
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newReminder, setNewReminder] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [showDetails, setShowDetails] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchNotes = async () => {
    try {
      const res = await fetch(`/api/notes?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch (error) {
      console.error("Failed to fetch notes", error);
    }
  };

  useEffect(() => {
    fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      notes.forEach((note) => {
        if (note.reminderAt && !note.isCompleted) {
          const reminderTime = new Date(note.reminderAt);
          const diff = Math.abs(now.getTime() - reminderTime.getTime());
          if (diff <= 60000 && reminderTime <= now) {
            triggerToast(`Reminder: ${note.title}`);
            if (Notification.permission === "granted") {
              new Notification("Quick Reminder", { body: note.title });
            }
          }
        }
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [notes]);

  useEffect(() => {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          content: newContent,
          category: newCategory,
          reminderAt: newReminder || null,
        }),
      });

      if (res.ok) {
        setNewTitle("");
        setNewContent("");
        setNewReminder("");
        setShowDetails(false);
        fetchNotes();
        triggerToast("Note added successfully.");
      }
    } catch (error) {
      console.error("Failed to add note", error);
    }
  };

  const toggleCompletion = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !currentStatus }),
      });
      if (res.ok) {
        fetchNotes();
      }
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const deleteNote = async (id: string) => {
    try {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchNotes();
        triggerToast("Note deleted.");
      }
    } catch (error) {
      console.error("Failed to delete note", error);
    }
  };

  const getReminderBadge = (dateString: string) => {
    const d = new Date(dateString);
    if (isPast(d) && !isToday(d)) {
      return <span className="bg-error-container/20 border border-error-container text-error font-mono text-xs px-2 py-0.5 rounded-full flex items-center gap-1 uppercase"><Clock size={12}/> Overdue</span>;
    }
    if (isToday(d)) {
      return <span className="bg-tertiary-container/20 border border-tertiary-container text-tertiary font-mono text-xs px-2 py-0.5 rounded-full flex items-center gap-1 uppercase"><Clock size={12}/> Today {format(d, "h:mm a")}</span>;
    }
    return <span className="bg-secondary-container/20 border border-secondary-container text-secondary font-mono text-xs px-2 py-0.5 rounded-full flex items-center gap-1 uppercase"><Calendar size={12}/> {format(d, "MMM d")}</span>;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 relative">
      {toastMessage && (
        <div className="fixed bottom-4 right-4 glass-panel text-on-surface px-4 py-3 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 z-50">
          <Bell className="text-secondary" size={20} />
          {toastMessage}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-on-surface tracking-tight">Dashboard</h1>
        <p className="text-on-surface-variant mt-1">Manage your notes and upcoming reminders.</p>
      </div>

      <div className="bg-surface-container rounded-xl shadow-lg border border-surface-variant p-4 mb-8 transition-all group focus-within:border-primary/50">
        <form onSubmit={handleAddNote} className="flex flex-col gap-3">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="What's on your mind?"
              className="flex-1 bg-surface-lowest border border-surface-variant rounded-lg px-4 py-3 text-on-surface placeholder-outline-variant focus:outline-none focus:border-b-2 focus:border-b-primary focus:border-x-surface-variant focus:border-t-surface-variant transition-all font-display text-lg"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onFocus={() => setShowDetails(true)}
              required
            />
            <button 
              type="submit"
              className="bg-primary text-on-primary font-medium p-3 rounded-lg hover:bg-primary-container transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Add</span>
            </button>
          </div>

          {showDetails && (
            <div className="pt-2 animate-in fade-in slide-in-from-top-2 grid gap-3 md:grid-cols-2">
              <textarea
                placeholder="Optional details..."
                className="col-span-full md:col-span-2 bg-surface-lowest border border-surface-variant rounded-lg px-4 py-3 text-sm text-on-surface placeholder-outline-variant focus:outline-none focus:border-primary/50 resize-none h-24"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
              />
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[10px] text-outline uppercase tracking-wider">Set Reminder</label>
                <input
                  type="datetime-local"
                  className="bg-surface-lowest border border-surface-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/50"
                  value={newReminder}
                  onChange={(e) => setNewReminder(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[10px] text-outline uppercase tracking-wider">Category</label>
                <select
                  className="bg-surface-lowest border border-surface-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/50"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  <option value="General">General</option>
                  <option value="Work">Work</option>
                  <option value="Personal">Personal</option>
                  <option value="Ideas">Ideas</option>
                </select>
              </div>
            </div>
          )}
        </form>
      </div>

      <div className="flex items-center gap-1 bg-surface-container p-1 rounded-lg w-fit mb-6 border border-surface-variant">
        {(["all", "reminders", "completed"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all capitalize ${
              filter === tab ? "bg-surface-bright text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-20 bg-surface-container rounded-xl border border-dashed border-surface-variant">
          <p className="text-on-surface-variant">No notes found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => (
            <div 
              key={note.id}
              className={`bg-surface-bright rounded-xl border border-surface-variant p-5 shadow-sm hover:shadow-[0_0_15px_rgba(99,102,241,0.1)] hover:border-primary/50 transition-all flex flex-col group ${
                note.isCompleted ? 'opacity-50 grayscale' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className={`font-display font-semibold text-lg text-on-surface break-words ${note.isCompleted ? 'line-through text-outline' : ''}`}>
                  {note.title}
                </h3>
                {note.reminderAt && (
                  <button 
                    onClick={() => toggleCompletion(note.id, note.isCompleted)}
                    className={`p-1 rounded-full hover:bg-surface-variant transition-colors flex-shrink-0 ml-2 ${note.isCompleted ? 'text-secondary' : 'text-outline hover:text-secondary'}`}
                    title={note.isCompleted ? "Mark incomplete" : "Mark complete"}
                  >
                    <CheckCircle2 size={20} />
                  </button>
                )}
              </div>
              
              {note.content && (
                <p className="text-on-surface-variant text-sm mb-4 line-clamp-3 break-words whitespace-pre-wrap">
                  {note.content}
                </p>
              )}
              
              <div className="mt-auto pt-4 flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  <span className="bg-surface border border-surface-variant text-on-surface-variant font-mono text-xs px-2 py-0.5 rounded-full flex items-center gap-1 uppercase">
                    {note.category}
                  </span>
                  {note.reminderAt && !note.isCompleted && getReminderBadge(note.reminderAt)}
                </div>
                
                <button
                  onClick={() => deleteNote(note.id)}
                  className="text-outline hover:text-error hover:bg-error-container/20 p-1.5 rounded transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
