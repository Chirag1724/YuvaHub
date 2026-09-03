import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Plus,
  Type,
  ListChecks,
  Link2,
  BellRing,
  Trash2,
  Check,
  Loader2,
  Users,
} from "lucide-react";
import { useSocket } from "../context/SocketContext";
import {
  fetchApplicationNote,
  saveApplicationNote,
  shareApplicationNote,
} from "../services/apiClient";

type ChecklistItem = { id: string; text: string; done: boolean };

type Block = {
  id: string;
  type: "text" | "checklist" | "link" | "reminder";
  text?: string;
  url?: string;
  items?: ChecklistItem[];
  dueAt?: string;
  done?: boolean;
};

type Note = {
  id?: string;
  _id?: string;
  ownerId?: string;
  applicationId: string;
  title: string;
  blocks: Block[];
  sharedWith?: string[];
};

interface Props {
  applicationId: string;
  applicationTitle?: string;
  currentUserId?: string;
  onClose: () => void;
}

const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const freshBlock = (type: Block["type"]): Block => {
  const block: Block = { id: uid(), type };
  if (type === "text") block.text = "";
  if (type === "link") {
    block.url = "";
    block.text = "";
  }
  if (type === "checklist") block.items = [{ id: uid(), text: "", done: false }];
  if (type === "reminder") {
    block.text = "";
    block.dueAt = "";
    block.done = false;
  }
  return block;
};

const emptyNote = (applicationId: string): Note => ({
  applicationId,
  title: "Application Workspace",
  blocks: [freshBlock("text")],
  sharedWith: [],
});

const normalize = (raw: any, applicationId: string): Note => ({
  id: raw?.id || raw?._id,
  _id: raw?._id,
  ownerId: raw?.ownerId,
  applicationId: raw?.applicationId || applicationId,
  title: raw?.title || "Application Workspace",
  blocks:
    Array.isArray(raw?.blocks) && raw.blocks.length
      ? raw.blocks
      : [freshBlock("text")],
  sharedWith: Array.isArray(raw?.sharedWith) ? raw.sharedWith : [],
});

export default function ApplicationNoteEditor({
  applicationId,
  applicationTitle,
  currentUserId,
  onClose,
}: Props) {
  const { socket } = useSocket();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState("");

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Load the existing note, or start a fresh (unsaved) one ----
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const existing = await fetchApplicationNote(applicationId);
        if (cancelled) return;
        setNote(existing ? normalize(existing, applicationId) : emptyNote(applicationId));
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load note");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  const noteId = note?.id || note?._id;
  const isOwner = !!note && (!note.ownerId || note.ownerId === currentUserId);

  // ---- Real-time: join the note room, apply edits coming from other people ----
  useEffect(() => {
    if (!socket || !noteId) return;

    socket.emit("note:join", { noteId });

    const onRemoteUpdate = (payload: {
      noteId: string;
      title?: string;
      blocks?: Block[];
      userId?: string;
    }) => {
      if (payload.noteId !== noteId) return;
      if (payload.userId && payload.userId === currentUserId) return;
      setNote((prev) =>
        prev
          ? {
              ...prev,
              title: payload.title ?? prev.title,
              blocks: payload.blocks ?? prev.blocks,
            }
          : prev
      );
    };

    socket.on("note:updated", onRemoteUpdate);
    return () => {
      socket.emit("note:leave", { noteId });
      socket.off("note:updated", onRemoteUpdate);
    };
  }, [socket, noteId, currentUserId]);

  // ---- Debounced persistence ----
  const scheduleSave = useCallback(
    (next: Note) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        setError(null);
        try {
          const saved = await saveApplicationNote(applicationId, {
            title: next.title,
            blocks: next.blocks,
          });
          // Only pick up server-managed fields; keep local body as-is so we
          // don't stomp on edits made while the request was in flight.
          setNote((prev) =>
            prev
              ? {
                  ...prev,
                  id: saved?.id || saved?._id || prev.id,
                  _id: saved?._id || prev._id,
                  ownerId: saved?.ownerId ?? prev.ownerId,
                  sharedWith: Array.isArray(saved?.sharedWith)
                    ? saved.sharedWith
                    : prev.sharedWith,
                }
              : prev
          );
        } catch (e: any) {
          setError(e?.message || "Failed to save");
        } finally {
          setSaving(false);
        }
      }, 800);
    },
    [applicationId]
  );

  // ---- Single entry point for every local edit: update state, save, broadcast ----
  const applyChange = useCallback(
    (updater: (n: Note) => Note) => {
      setNote((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        scheduleSave(next);
        const id = next.id || next._id;
        if (socket && id) {
          socket.emit("note:update", {
            noteId: id,
            title: next.title,
            blocks: next.blocks,
            userId: currentUserId,
          });
        }
        return next;
      });
    },
    [scheduleSave, socket, currentUserId]
  );

  const addBlock = (type: Block["type"]) =>
    applyChange((n) => ({ ...n, blocks: [...n.blocks, freshBlock(type)] }));

  const updateBlock = (id: string, patch: Partial<Block>) =>
    applyChange((n) => ({
      ...n,
      blocks: n.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));

  const removeBlock = (id: string) =>
    applyChange((n) => ({ ...n, blocks: n.blocks.filter((b) => b.id !== id) }));

  const addItem = (blockId: string) =>
    applyChange((n) => ({
      ...n,
      blocks: n.blocks.map((b) =>
        b.id === blockId
          ? { ...b, items: [...(b.items || []), { id: uid(), text: "", done: false }] }
          : b
      ),
    }));

  const updateItem = (
    blockId: string,
    itemId: string,
    patch: Partial<ChecklistItem>
  ) =>
    applyChange((n) => ({
      ...n,
      blocks: n.blocks.map((b) =>
        b.id === blockId
          ? {
              ...b,
              items: (b.items || []).map((it) =>
                it.id === itemId ? { ...it, ...patch } : it
              ),
            }
          : b
      ),
    }));

  const removeItem = (blockId: string, itemId: string) =>
    applyChange((n) => ({
      ...n,
      blocks: n.blocks.map((b) =>
        b.id === blockId
          ? { ...b, items: (b.items || []).filter((it) => it.id !== itemId) }
          : b
      ),
    }));

  // ---- Overall checklist progress across every checklist block ----
  const progress = useMemo(() => {
    const items = (note?.blocks || []).flatMap((b) =>
      b.type === "checklist" ? b.items || [] : []
    );
    return { done: items.filter((it) => it.done).length, total: items.length };
  }, [note]);

  const handleShare = async () => {
    if (!noteId || !shareEmail.trim()) return;
    try {
      const updated = await shareApplicationNote(noteId, {
        addEmail: shareEmail.trim(),
      });
      setNote((prev) =>
        prev ? { ...prev, sharedWith: updated?.sharedWith || prev.sharedWith } : prev
      );
      setShareEmail("");
    } catch (e: any) {
      setError(e?.message || "Failed to share");
    }
  };

  const handleUnshare = async (userId: string) => {
    if (!noteId) return;
    try {
      const updated = await shareApplicationNote(noteId, { removeUserId: userId });
      setNote((prev) =>
        prev ? { ...prev, sharedWith: updated?.sharedWith || [] } : prev
      );
    } catch (e: any) {
      setError(e?.message || "Failed to update sharing");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border-theme bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border-theme p-4">
          <div className="min-w-0 flex-1">
            <input
              value={note?.title || ""}
              onChange={(e) =>
                applyChange((n) => ({ ...n, title: e.target.value }))
              }
              placeholder="Workspace title"
              className="w-full bg-transparent text-lg font-semibold text-text-primary outline-none placeholder:text-text-muted"
            />
            {applicationTitle && (
              <p className="truncate text-xs text-text-muted">
                for {applicationTitle}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {saving ? (
              <span className="flex items-center gap-1 text-xs text-text-muted">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving
              </span>
            ) : (
              <span className="text-xs text-text-muted">Saved</span>
            )}
            <button
              onClick={onClose}
              aria-label="Close workspace"
              className="rounded-lg p-1.5 text-text-muted hover:bg-surface-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Checklist progress */}
        {progress.total > 0 && (
          <div className="border-b border-border-theme px-4 py-2">
            <div className="mb-1 flex justify-between text-xs text-text-muted">
              <span>Checklist progress</span>
              <span>
                {progress.done}/{progress.total} done
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-secondary">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{
                  width: `${
                    progress.total ? (progress.done / progress.total) * 100 : 0
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
            </div>
          ) : (
            <>
              {note?.blocks.map((block) => (
                <BlockRow
                  key={block.id}
                  block={block}
                  onChange={(patch) => updateBlock(block.id, patch)}
                  onRemove={() => removeBlock(block.id)}
                  onAddItem={() => addItem(block.id)}
                  onUpdateItem={(itemId, patch) =>
                    updateItem(block.id, itemId, patch)
                  }
                  onRemoveItem={(itemId) => removeItem(block.id, itemId)}
                />
              ))}

              <div className="flex flex-wrap gap-2 pt-1">
                <AddBtn
                  icon={<Type className="h-3.5 w-3.5" />}
                  label="Text"
                  onClick={() => addBlock("text")}
                />
                <AddBtn
                  icon={<ListChecks className="h-3.5 w-3.5" />}
                  label="Checklist"
                  onClick={() => addBlock("checklist")}
                />
                <AddBtn
                  icon={<Link2 className="h-3.5 w-3.5" />}
                  label="Link"
                  onClick={() => addBlock("link")}
                />
                <AddBtn
                  icon={<BellRing className="h-3.5 w-3.5" />}
                  label="Reminder"
                  onClick={() => addBlock("reminder")}
                />
              </div>
            </>
          )}
        </div>

        {/* Sharing (owner only) */}
        {!loading && isOwner && (
          <div className="border-t border-border-theme p-4">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-text-muted">
              <Users className="h-3.5 w-3.5" /> Share with a teammate
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                disabled={!noteId}
                placeholder={
                  noteId
                    ? "teammate@email.com"
                    : "Type something first to enable sharing"
                }
                className="flex-1 rounded-lg border border-border-theme bg-surface-secondary px-3 py-1.5 text-sm text-text-primary outline-none disabled:opacity-50"
              />
              <button
                onClick={handleShare}
                disabled={!noteId || !shareEmail.trim()}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                Invite
              </button>
            </div>
            {!!note?.sharedWith?.length && (
              <ul className="mt-2 space-y-1">
                {note.sharedWith.map((u) => (
                  <li
                    key={u}
                    className="flex items-center justify-between rounded-lg bg-surface-secondary px-3 py-1.5 text-xs text-text-secondary"
                  >
                    <span className="truncate">{u}</span>
                    <button
                      onClick={() => handleUnshare(u)}
                      aria-label="Remove collaborator"
                      className="text-text-muted hover:text-red-400"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AddBtn({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-border-theme bg-surface-secondary px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary"
    >
      {icon}
      {label}
    </button>
  );
}

function BlockRow({
  block,
  onChange,
  onRemove,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
}: {
  block: Block;
  onChange: (patch: Partial<Block>) => void;
  onRemove: () => void;
  onAddItem: () => void;
  onUpdateItem: (itemId: string, patch: Partial<ChecklistItem>) => void;
  onRemoveItem: (itemId: string) => void;
}) {
  return (
    <div className="group relative rounded-xl border border-border-theme bg-surface-secondary/40 p-3">
      <button
        onClick={onRemove}
        aria-label="Remove block"
        className="absolute right-2 top-2 rounded p-1 text-text-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {block.type === "text" && (
        <textarea
          value={block.text || ""}
          onChange={(e) => onChange({ text: e.target.value })}
          rows={3}
          placeholder="Write notes, essay drafts, ideas…"
          className="w-full resize-y bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
        />
      )}

      {block.type === "checklist" && (
        <div className="space-y-1.5">
          {(block.items || []).map((it) => (
            <div key={it.id} className="flex items-center gap-2">
              <button
                onClick={() => onUpdateItem(it.id, { done: !it.done })}
                aria-label={it.done ? "Mark task not done" : "Mark task done"}
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  it.done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-border-theme"
                }`}
              >
                {it.done && <Check className="h-3 w-3" />}
              </button>
              <input
                value={it.text}
                onChange={(e) => onUpdateItem(it.id, { text: e.target.value })}
                placeholder="Task…"
                className={`flex-1 bg-transparent text-sm outline-none ${
                  it.done
                    ? "text-text-muted line-through"
                    : "text-text-primary"
                }`}
              />
              <button
                onClick={() => onRemoveItem(it.id)}
                aria-label="Remove task"
                className="text-text-muted hover:text-red-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={onAddItem}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary"
          >
            <Plus className="h-3 w-3" /> Add task
          </button>
        </div>
      )}

      {block.type === "link" && (
        <div className="space-y-1.5">
          <input
            value={block.text || ""}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="Label (e.g. Portfolio)"
            className="w-full bg-transparent text-sm font-medium text-text-primary outline-none placeholder:text-text-muted"
          />
          <input
            value={block.url || ""}
            onChange={(e) => onChange({ url: e.target.value })}
            placeholder="https://…"
            className="w-full bg-transparent text-sm text-emerald-400 outline-none placeholder:text-text-muted"
          />
          {block.url && (
            <a
              href={block.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-text-muted underline"
            >
              Open link
            </a>
          )}
        </div>
      )}

      {block.type === "reminder" && (
        <div className="flex flex-wrap items-center gap-2">
          <BellRing className="h-4 w-4 shrink-0 text-amber-400" />
          <input
            value={block.text || ""}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="Reminder…"
            className="min-w-[8rem] flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
          />
          <input
            type="datetime-local"
            value={block.dueAt || ""}
            onChange={(e) => onChange({ dueAt: e.target.value })}
            className="rounded-lg border border-border-theme bg-surface px-2 py-1 text-xs text-text-secondary outline-none"
          />
          <button
            onClick={() => onChange({ done: !block.done })}
            className={`rounded-lg px-2 py-1 text-xs ${
              block.done
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-surface text-text-muted"
            }`}
          >
            {block.done ? "Done" : "Mark done"}
          </button>
        </div>
      )}
    </div>
  );
}
