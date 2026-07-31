"use client";

import React, { useState, useEffect } from "react";
import { format, isPast, isToday } from "date-fns";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Bell,
  FolderPlus,
  ListTodo,
  List,
  CheckSquare,
  Square,
  Layers,
  Folder,
  Tag,
  ChevronDown,
  ChevronUp
} from "lucide-react";

type TaskHeader = {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
  _count?: { notes: number };
};

type Note = {
  id: string;
  title: string;
  content: string | null;
  category: string;
  taskHeaderId: string | null;
  taskHeader?: TaskHeader | null;
  reminderAt: string | null;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function NotesDashboard() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [taskHeaders, setTaskHeaders] = useState<TaskHeader[]>([]);
  const [filter, setFilter] = useState<"all" | "reminders" | "completed">("all");
  const [viewMode, setViewMode] = useState<"grouped" | "grid">("grouped");

  // Form State
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newReminder, setNewReminder] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [newTaskHeaderId, setNewTaskHeaderId] = useState<string>("");
  const [showDetails, setShowDetails] = useState(false);

  // Header Master Modal
  const [isHeaderModalOpen, setIsHeaderModalOpen] = useState(false);
  const [headerNameInput, setHeaderNameInput] = useState("");
  const headerColorInput = "amber-400";

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Collapsed sections in grouped view
  const [collapsedHeaders, setCollapsedHeaders] = useState<Record<string, boolean>>({});

  const fetchTaskHeaders = async () => {
    try {
      const res = await fetch("/api/notes/task-headers");
      if (res.ok) {
        const data = await res.json();
        setTaskHeaders(data);
      }
    } catch (error) {
      console.error("Failed to fetch task headers", error);
    }
  };

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
    fetchTaskHeaders();
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
            if (typeof window !== "undefined" && Notification.permission === "granted") {
              new Notification("Quick Reminder", { body: note.title });
            }
          }
        }
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [notes]);

  useEffect(() => {
    if (typeof window !== "undefined" && Notification?.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
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
          taskHeaderId: newTaskHeaderId || null,
          reminderAt: newReminder || null,
        }),
      });

      if (res.ok) {
        setNewTitle("");
        setNewContent("");
        setNewReminder("");
        setShowDetails(false);
        fetchNotes();
        fetchTaskHeaders();
        triggerToast("Note added successfully.");
      }
    } catch (error) {
      console.error("Failed to add note", error);
    }
  };

  const handleCreateTaskHeader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headerNameInput.trim()) return;

    try {
      const res = await fetch("/api/notes/task-headers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: headerNameInput.trim(),
          color: headerColorInput,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setHeaderNameInput("");
        fetchTaskHeaders();
        setNewTaskHeaderId(created.id);
        triggerToast(`Task header "${created.name}" created!`);
      }
    } catch (error) {
      console.error("Failed to create task header", error);
    }
  };

  const handleDeleteTaskHeader = async (id: string) => {
    try {
      const res = await fetch(`/api/notes/task-headers/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchTaskHeaders();
        fetchNotes();
        if (newTaskHeaderId === id) setNewTaskHeaderId("");
        triggerToast("Task header removed (Notes unlinked to General)");
      }
    } catch (error) {
      console.error("Failed to delete task header", error);
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
        fetchTaskHeaders();
        triggerToast("Note deleted.");
      }
    } catch (error) {
      console.error("Failed to delete note", error);
    }
  };

  // Checkbox toggle inside content line
  const handleToggleContentCheckbox = async (noteId: string, fullContent: string, lineIndex: number) => {
    const lines = fullContent.split("\n");
    const targetLine = lines[lineIndex];

    if (targetLine.includes("[ ]") || targetLine.includes("- [ ]")) {
      lines[lineIndex] = targetLine.replace("[ ]", "[x]");
    } else if (targetLine.includes("[x]") || targetLine.includes("- [x]")) {
      lines[lineIndex] = targetLine.replace("[x]", "[ ]");
    }

    const updatedContent = lines.join("\n");

    // Optimistic UI update
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, content: updatedContent } : n))
    );

    try {
      await fetch(`/api/notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: updatedContent }),
      });
    } catch (err) {
      console.error(err);
      fetchNotes();
    }
  };

  // Insertion helpers for note textarea
  const insertTextAtCursor = (prefix: string) => {
    setNewContent((prev) => {
      if (!prev) return prefix;
      return prev.endsWith("\n") ? `${prev}${prefix}` : `${prev}\n${prefix}`;
    });
  };

  const getReminderBadge = (dateString: string) => {
    const d = new Date(dateString);
    if (isPast(d) && !isToday(d)) {
      return (
        <span className="bg-error-container/20 border border-error-container text-error font-mono text-xs px-2 py-0.5 rounded-full flex items-center gap-1 uppercase">
          <Clock size={12} /> Overdue
        </span>
      );
    }
    if (isToday(d)) {
      return (
        <span className="bg-tertiary-container/20 border border-tertiary-container text-tertiary font-mono text-xs px-2 py-0.5 rounded-full flex items-center gap-1 uppercase">
          <Clock size={12} /> Today {format(d, "h:mm a")}
        </span>
      );
    }
    return (
      <span className="bg-secondary-container/20 border border-secondary-container text-secondary font-mono text-xs px-2 py-0.5 rounded-full flex items-center gap-1 uppercase">
        <Calendar size={12} /> {format(d, "MMM d")}
      </span>
    );
  };

  // Interactive Content Renderer (Bullets & Checkboxes)
  const renderFormattedContent = (note: Note) => {
    if (!note.content) return null;

    const lines = note.content.split("\n");

    return (
      <div className="space-y-1.5 text-sm text-on-surface-variant font-body">
        {lines.map((line, idx) => {
          const trimmed = line.trim();

          // Checkbox lines: [ ] or [x] or - [ ] or - [x]
          const isUnchecked = line.includes("[ ]") || line.includes("- [ ]");
          const isChecked = line.includes("[x]") || line.includes("- [x]");

          if (isUnchecked || isChecked) {
            const cleanText = line
              .replace(/^-?\s*\[[ x]\]\s*/, "")
              .trim();

            return (
              <div
                key={idx}
                onClick={() => handleToggleContentCheckbox(note.id, note.content!, idx)}
                className={`flex items-start gap-2 cursor-pointer group/line p-1 rounded-lg hover:bg-surface-variant/40 transition-colors ${
                  isChecked ? "line-through opacity-60" : ""
                }`}
              >
                {isChecked ? (
                  <CheckSquare className="text-emerald-400 shrink-0 mt-0.5" size={16} />
                ) : (
                  <Square className="text-outline group-hover/line:text-primary shrink-0 mt-0.5" size={16} />
                )}
                <span className={`break-words text-xs ${isChecked ? "text-outline" : "text-on-surface"}`}>
                  {cleanText || line}
                </span>
              </div>
            );
          }

          // Bullet points: • or - or *
          const isBullet = trimmed.startsWith("•") || trimmed.startsWith("- ") || trimmed.startsWith("* ");
          if (isBullet) {
            const cleanBulletText = trimmed.replace(/^([•\-\*])\s*/, "");
            return (
              <div key={idx} className="flex items-start gap-2 pl-1 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/70 shrink-0 mt-1.5"></span>
                <span className="break-words text-xs text-on-surface-variant">{cleanBulletText}</span>
              </div>
            );
          }

          // Normal paragraph line
          return (
            <p key={idx} className="break-words whitespace-pre-wrap text-xs text-on-surface-variant leading-relaxed">
              {line}
            </p>
          );
        })}
      </div>
    );
  };

  // Grouping logic: group notes by taskHeaderId
  const groupedNotes = React.useMemo(() => {
    const groups: { header: TaskHeader | null; notes: Note[] }[] = [];

    // Custom Task Headers
    taskHeaders.forEach((th) => {
      const headerNotes = notes.filter((n) => n.taskHeaderId === th.id);
      groups.push({ header: th, notes: headerNotes });
    });

    // General / Ungrouped Notes (No task header)
    const generalNotes = notes.filter((n) => !n.taskHeaderId);
    groups.push({
      header: null, // null represents General Notes
      notes: generalNotes,
    });

    return groups;
  }, [taskHeaders, notes]);

  const toggleHeaderCollapse = (headerId: string) => {
    setCollapsedHeaders((prev) => ({ ...prev, [headerId]: !prev[headerId] }));
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-surface-container-high border border-outline-variant/60 text-on-surface px-4 py-3 rounded-xl flex items-center gap-3 shadow-2xl animate-in fade-in slide-in-from-bottom-5 z-50">
          <Bell className="text-primary" size={20} />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-on-surface tracking-tight flex items-center gap-3">
            <ListTodo className="text-primary" size={32} />
            Quick Notes & Reminders
          </h1>
          <p className="text-on-surface-variant text-sm mt-1 font-body">
            Organize tasks with Task Headers, rich checklist items, and bullet points.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setIsHeaderModalOpen(true)}
            className="px-3.5 py-2 bg-surface-container-high hover:bg-surface-variant border border-outline-variant/40 rounded-xl text-xs font-semibold text-on-surface transition-all flex items-center gap-2"
          >
            <FolderPlus size={16} className="text-amber-400" />
            Task Header Master
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-surface-container p-1 rounded-xl border border-surface-variant">
            <button
              onClick={() => setViewMode("grouped")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === "grouped" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Layers size={14} /> Grouped
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === "grid" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <List size={14} /> Grid
            </button>
          </div>
        </div>
      </div>

      {/* Create Note Input Panel */}
      <div className="bg-surface-container rounded-2xl shadow-xl border border-surface-variant p-5 mb-8 transition-all group focus-within:border-primary/50">
        <form onSubmit={handleAddNote} className="flex flex-col gap-3">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="What's on your mind? (e.g., Office party food arrangement...)"
              className="flex-1 bg-surface-lowest border border-surface-variant rounded-xl px-4 py-3 text-on-surface placeholder-outline-variant focus:outline-none focus:border-b-2 focus:border-b-primary focus:border-x-surface-variant focus:border-t-surface-variant transition-all font-display text-lg"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onFocus={() => setShowDetails(true)}
              required
            />
            <button
              type="submit"
              className="bg-primary text-on-primary font-bold px-5 py-3 rounded-xl hover:bg-primary-container transition-all shadow-md flex items-center gap-2"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Add Note</span>
            </button>
          </div>

          {showDetails && (
            <div className="pt-2 animate-in fade-in slide-in-from-top-2 grid gap-4 md:grid-cols-2">
              {/* Content Textarea + Formatting Bar */}
              <div className="col-span-full space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="font-mono text-[10px] text-outline uppercase tracking-wider">Note Content & Items</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor("[ ] ")}
                      className="px-2.5 py-1 bg-surface-variant hover:bg-surface-container-high border border-outline-variant/40 rounded-lg text-xs font-semibold text-primary transition-all flex items-center gap-1"
                    >
                      <CheckSquare size={13} /> + Checkbox
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor("• ")}
                      className="px-2.5 py-1 bg-surface-variant hover:bg-surface-container-high border border-outline-variant/40 rounded-lg text-xs font-semibold text-tertiary transition-all flex items-center gap-1"
                    >
                      <List size={13} /> + Bullet
                    </button>
                  </div>
                </div>

                <textarea
                  placeholder="Add details, bullet points (•), or checkboxes ([ ] task item)..."
                  className="w-full bg-surface-lowest border border-surface-variant rounded-xl px-4 py-3 text-sm text-on-surface placeholder-outline-variant focus:outline-none focus:border-primary/50 resize-none h-28 font-body"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                />
              </div>

              {/* Task Header Selector */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-[10px] text-outline uppercase tracking-wider">Task Header (Grouping)</label>
                  <button
                    type="button"
                    onClick={() => setIsHeaderModalOpen(true)}
                    className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    + New Header
                  </button>
                </div>
                <select
                  className="bg-surface-lowest border border-surface-variant rounded-xl px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary/50 font-body"
                  value={newTaskHeaderId}
                  onChange={(e) => setNewTaskHeaderId(e.target.value)}
                >
                  <option value="">None (General Notes)</option>
                  {taskHeaders.map((th) => (
                    <option key={th.id} value={th.id}>
                      📁 {th.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category & Reminder */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10px] text-outline uppercase tracking-wider">Category</label>
                  <select
                    className="bg-surface-lowest border border-surface-variant rounded-xl px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary/50 font-body"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  >
                    <option value="General">General</option>
                    <option value="Work">Work</option>
                    <option value="Personal">Personal</option>
                    <option value="Ideas">Ideas</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10px] text-outline uppercase tracking-wider">Set Reminder</label>
                  <input
                    type="datetime-local"
                    className="bg-surface-lowest border border-surface-variant rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary/50 font-body"
                    value={newReminder}
                    onChange={(e) => setNewReminder(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1 bg-surface-container p-1 rounded-xl border border-surface-variant">
          {(["all", "reminders", "completed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all capitalize ${
                filter === tab ? "bg-surface-bright text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <span className="text-xs text-outline font-mono">
          Total Notes: {notes.length}
        </span>
      </div>

      {/* NOTES DISPLAY AREA */}
      {notes.length === 0 ? (
        <div className="text-center py-20 bg-surface-container/40 rounded-2xl border border-dashed border-surface-variant text-outline font-body">
          <p className="text-sm font-semibold text-on-surface">No notes found</p>
          <p className="text-xs text-on-surface-variant mt-1">Add your first note above to get started!</p>
        </div>
      ) : viewMode === "grouped" ? (
        /* GROUPED VIEW BY TASK HEADERS */
        <div className="space-y-8">
          {groupedNotes.map(({ header, notes: groupNotes }) => {
            if (groupNotes.length === 0 && header !== null) return null; // Skip empty custom headers if no notes
            if (groupNotes.length === 0 && header === null) return null;

            const headerKey = header ? header.id : "general";
            const isCollapsed = collapsedHeaders[headerKey];

            return (
              <div
                key={headerKey}
                className="bg-surface-container/30 border border-outline-variant/30 rounded-2xl p-5 backdrop-blur-xl transition-all"
              >
                {/* Task Header Section Title */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-outline-variant/20">
                  <div
                    onClick={() => toggleHeaderCollapse(headerKey)}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                        header
                          ? `bg-${header.color || "amber-400"}/20 border border-${header.color || "amber-400"}/30 text-${header.color || "amber-400"}`
                          : "bg-surface-variant text-on-surface-variant border border-outline-variant/40"
                      }`}
                    >
                      {header ? <Folder size={18} /> : <Tag size={18} />}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold font-display text-on-surface group-hover:text-primary transition-colors flex items-center gap-2">
                        {header ? header.name : "General Notes"}
                        <span className="text-xs font-normal font-mono px-2 py-0.5 bg-surface-variant rounded-full text-outline">
                          {groupNotes.length}
                        </span>
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDetails(true);
                        setNewTaskHeaderId(header ? header.id : "");
                        window.scrollTo({ top: 100, behavior: "smooth" });
                      }}
                      className="px-2.5 py-1 bg-surface-variant/80 hover:bg-surface-container-high border border-outline-variant/30 text-[11px] font-semibold text-primary rounded-lg transition-all flex items-center gap-1"
                    >
                      <Plus size={13} /> Add Note Here
                    </button>

                    <button
                      onClick={() => toggleHeaderCollapse(headerKey)}
                      className="p-1 rounded-lg hover:bg-surface-variant text-outline"
                    >
                      {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    </button>
                  </div>
                </div>

                {/* Notes Grid inside Header Section */}
                {!isCollapsed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupNotes.map((note) => (
                      <div
                        key={note.id}
                        className={`bg-surface-bright rounded-xl border border-surface-variant p-4 shadow-sm hover:shadow-[0_0_20px_rgba(99,102,241,0.12)] hover:border-primary/50 transition-all flex flex-col group ${
                          note.isCompleted ? "opacity-55 grayscale" : ""
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3
                            className={`font-display font-semibold text-base text-on-surface break-words ${
                              note.isCompleted ? "line-through text-outline" : ""
                            }`}
                          >
                            {note.title}
                          </h3>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <button
                              onClick={() => toggleCompletion(note.id, note.isCompleted)}
                              className={`p-1 rounded-full hover:bg-surface-variant transition-colors ${
                                note.isCompleted ? "text-emerald-400" : "text-outline hover:text-emerald-400"
                              }`}
                              title={note.isCompleted ? "Mark incomplete" : "Mark complete"}
                            >
                              <CheckCircle2 size={18} />
                            </button>
                            <button
                              onClick={() => deleteNote(note.id)}
                              className="text-outline hover:text-error hover:bg-error-container/20 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                              title="Delete Note"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Note Body (Bullets & Checkboxes) */}
                        <div className="my-2">{renderFormattedContent(note)}</div>

                        <div className="mt-auto pt-3 flex items-center justify-between border-t border-outline-variant/20 text-xs">
                          <span className="bg-surface border border-surface-variant text-on-surface-variant font-mono text-[10px] px-2 py-0.5 rounded-full uppercase">
                            {note.category}
                          </span>
                          {note.reminderAt && !note.isCompleted && getReminderBadge(note.reminderAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* FLAT GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`bg-surface-bright rounded-xl border border-surface-variant p-4 shadow-sm hover:shadow-[0_0_20px_rgba(99,102,241,0.12)] hover:border-primary/50 transition-all flex flex-col group ${
                note.isCompleted ? "opacity-55 grayscale" : ""
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3
                  className={`font-display font-semibold text-base text-on-surface break-words ${
                    note.isCompleted ? "line-through text-outline" : ""
                  }`}
                >
                  {note.title}
                </h3>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => toggleCompletion(note.id, note.isCompleted)}
                    className={`p-1 rounded-full hover:bg-surface-variant transition-colors ${
                      note.isCompleted ? "text-emerald-400" : "text-outline hover:text-emerald-400"
                    }`}
                  >
                    <CheckCircle2 size={18} />
                  </button>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="text-outline hover:text-error hover:bg-error-container/20 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Note Content */}
              <div className="my-2">{renderFormattedContent(note)}</div>

              <div className="mt-auto pt-3 flex items-center justify-between border-t border-outline-variant/20 text-xs">
                <div className="flex flex-wrap gap-1.5">
                  {note.taskHeader && (
                    <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Folder size={10} /> {note.taskHeader.name}
                    </span>
                  )}
                  <span className="bg-surface border border-surface-variant text-on-surface-variant font-mono text-[10px] px-2 py-0.5 rounded-full uppercase">
                    {note.category}
                  </span>
                </div>
                {note.reminderAt && !note.isCompleted && getReminderBadge(note.reminderAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TASK HEADER MASTER MODAL */}
      {isHeaderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-container border border-outline-variant/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <h2 className="text-xl font-bold font-display text-on-surface flex items-center gap-2">
                <FolderPlus className="text-amber-400" size={24} />
                Task Header Master
              </h2>
              <button
                onClick={() => setIsHeaderModalOpen(false)}
                className="text-outline hover:text-on-surface text-sm font-bold px-2 py-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Create Header Form */}
            <form onSubmit={handleCreateTaskHeader} className="space-y-4 bg-surface-lowest p-4 rounded-xl border border-surface-variant">
              <h3 className="text-xs font-mono font-semibold uppercase text-outline">Create New Task Header</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Office Party Tasks, Launch Prep..."
                  className="flex-1 bg-surface-container border border-outline-variant/50 rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/50"
                  value={headerNameInput}
                  onChange={(e) => setHeaderNameInput(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container transition-all"
                >
                  Create
                </button>
              </div>
            </form>

            {/* Existing Task Headers List */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              <h3 className="text-xs font-mono font-semibold uppercase text-outline">Existing Task Headers ({taskHeaders.length})</h3>
              {taskHeaders.length === 0 ? (
                <p className="text-xs text-outline text-center py-4">No task headers created yet.</p>
              ) : (
                taskHeaders.map((th) => (
                  <div
                    key={th.id}
                    className="flex items-center justify-between bg-surface-lowest p-3 rounded-xl border border-surface-variant"
                  >
                    <div className="flex items-center gap-3">
                      <Folder className="text-amber-400" size={18} />
                      <div>
                        <p className="text-sm font-bold text-on-surface">{th.name}</p>
                        <p className="text-[11px] text-outline">
                          {th._count?.notes || 0} associated notes
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteTaskHeader(th.id)}
                      className="p-1.5 text-outline hover:text-error hover:bg-error-container/20 rounded-lg transition-colors"
                      title="Delete Header"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setIsHeaderModalOpen(false)}
                className="px-4 py-2 bg-surface-variant hover:bg-surface-container-high text-on-surface font-semibold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
