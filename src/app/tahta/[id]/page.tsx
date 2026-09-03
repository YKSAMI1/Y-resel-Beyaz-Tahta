"use client";

import React, { useState, useEffect, useCallback, use, useRef } from 'react';
import { Tool, Layer, DrawAction, WhiteboardSettings, Participant } from '@/types';
import { generateId, generateGuestName } from '@/lib/utils';
import WhiteboardCanvas, { WhiteboardCanvasHandle } from '@/components/WhiteboardCanvas';
import LeftSidebar from '@/components/toolbar/LeftSidebar';
import TopToolbar from '@/components/toolbar/TopToolbar';
import OptionsPanel from '@/components/toolbar/OptionsPanel';
import LayersPanel from '@/components/LayersPanel';
import ParticipantsPanel from '@/components/ParticipantsPanel';
import SettingsPanel from '@/components/SettingsPanel';
import ShareModal from '@/components/ShareModal';
import HistoryPanel from '@/components/HistoryPanel';
import ConnectionStatus from '@/components/ConnectionStatus';
import ToastContainer, { showToast } from '@/components/Toast';
import Tutorial from '@/components/Tutorial';

interface WhiteboardData {
  id: string;
  name: string;
  settings: WhiteboardSettings;
}

export default function WhiteboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const canvasRef = useRef<WhiteboardCanvasHandle>(null);
  const [boardData, setBoardData] = useState<WhiteboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Nickname
  const [nickname, setNickname] = useState('');
  const nicknameRef = useRef('');
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [nicknameReady, setNicknameReady] = useState(false);

  // Tools
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('transparent');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [opacity, setOpacity] = useState(1);
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [brushStyle, setBrushStyle] = useState('marker');

  // Layers
  const [layers, setLayers] = useState<Layer[]>([
    { id: 'default', name: 'Varsayılan Katman', visible: true, locked: false, opacity: 1, order: 0 },
  ]);
  const [activeLayerId, setActiveLayerId] = useState('default');

  // Actions / History
  const [actions, setActions] = useState<DrawAction[]>([]);
  const actionsRef = useRef<DrawAction[]>([]);
  const pendingDeletesRef = useRef<Set<string>>(new Set());
  const snapshotPauseRef = useRef(false); // snapshot yuklerken polling'i durdur
  const [syncedTimestamp, setSyncedTimestamp] = useState(0);
  // Unique client ID — nickname ile ayni olsun ki incelenin dogru goster
  const clientIdRef = useRef('');
  // Proper undo/redo stacks
  type UndoOp = { type: 'add'; action: DrawAction } | { type: 'delete'; action: DrawAction } | { type: 'move'; oldPositions: Map<string, {x:number;y:number}[]> };
  const undoStackRef = useRef<UndoOp[]>([]);
  const redoStackRef = useRef<UndoOp[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);
  // Keep refs in sync
  useEffect(() => { actionsRef.current = actions; }, [actions]);

  // Participants
  const [participants, setParticipants] = useState<Participant[]>([
    { id: 'self', name: 'Sen', color: '#2563eb', isOwner: true, isDrawing: false },
  ]);

  // Settings
  const [settings, setSettings] = useState<WhiteboardSettings>({
    allowDrawing: true,
    allowImageUpload: true,
    allowCopy: true,
    showCursors: true,
    boardType: 'public',
    background: 'white',
    showGrid: false,
  });

  // Panels — as floating popout panels
  const [activePanel, setActivePanel] = useState<'layers' | 'participants' | 'history' | 'options' | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  // Broadcast messages
  const [broadcasts, setBroadcasts] = useState<{ message: string; timestamp: number }[]>([]);
  const [broadcastBanner, setBroadcastBanner] = useState<string | null>(null);

  // ===== Nickname =====
  useEffect(() => {
    const savedNick = localStorage.getItem('freebuff_nickname');
    if (savedNick) {
      setNickname(savedNick);
      nicknameRef.current = savedNick;
      clientIdRef.current = savedNick; // nickname = userId
      setNicknameReady(true);
      setParticipants(prev => prev.map(p => p.id === 'self' ? { ...p, name: savedNick } : p));
    } else {
      setShowNicknameModal(true);
    }
  }, []);

  const handleNicknameSave = () => {
    const name = nickname.trim() || generateGuestName();
    setNickname(name);
    nicknameRef.current = name;
    clientIdRef.current = name; // nickname = userId
    localStorage.setItem('freebuff_nickname', name);
    setNicknameReady(true);
    setShowNicknameModal(false);
    setParticipants(prev => prev.map(p => p.id === 'self' ? { ...p, name } : p));
  };

  // ===== Load from localStorage =====
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`freeboard_actions_${id}`);
      if (saved) {
        const parsed = JSON.parse(saved) as DrawAction[];
        if (parsed.length > 0) {
          setActions(parsed);
        }
      }
      const savedSettings = localStorage.getItem(`freeboard_settings_${id}`);
      if (savedSettings) setSettings(JSON.parse(savedSettings));
      const savedLayers = localStorage.getItem(`freeboard_layers_${id}`);
      if (savedLayers) setLayers(JSON.parse(savedLayers));
    } catch { /* ignore */ }
    // Sunucudan tum veriyi yukle (gorseller dahil)
    const loadAll = async () => {
      try {
        const res = await fetch(`/api/whiteboard/${id}/actions?since=0`);
        if (res.ok) {
          const data = await res.json();
          if (data.actions && data.actions.length > 0) {
            setActions(data.actions);
            const maxTs = Math.max(...data.actions.map((a: DrawAction) => a.timestamp));
            setSyncedTimestamp(maxTs);
          }
        }
      } catch { /* will retry on next poll */ }
    };
    loadAll();
  }, [id]);

  // ===== Save to localStorage (strip base64 images to avoid quota) =====
  useEffect(() => {
    try {
      // Strip large base64 data from image actions before saving
      const safeActions = actions.map(a => {
        const copy = { ...a };
        // Strip large base64 data from images and fill bitmaps
        if (copy.imageSrc && copy.imageSrc.startsWith('data:')) {
          copy.imageSrc = '';
        }
        if (copy.fillBitmap && copy.fillBitmap.length > 1000) {
          copy.fillBitmap = '';
        }
        return copy;
      });
      localStorage.setItem(`freeboard_actions_${id}`, JSON.stringify(safeActions));
    } catch { /* quota exceeded — silently ignore */ }
  }, [actions, id]);
  useEffect(() => {
    try {
      localStorage.setItem(`freeboard_settings_${id}`, JSON.stringify(settings));
    } catch { /* ignore */ }
  }, [settings, id]);
  useEffect(() => {
    try {
      localStorage.setItem(`freeboard_layers_${id}`, JSON.stringify(layers));
    } catch { /* ignore */ }
  }, [layers, id]);

  // ===== REAL-TIME SYNC: Poll server every 2s =====
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      if (snapshotPauseRef.current) return; // snapshot yukleniyor, bekle
      try {
        const res = await fetch(`/api/whiteboard/${id}/actions?since=${syncedTimestamp}`);
        if (res.ok) {
          const data = await res.json();
          // Handle deletions from other users
          if (data.deletedIds && data.deletedIds.length > 0) {
            setActions(prev => prev.filter(a => !data.deletedIds.includes(a.id)));
          }
          if (data.actions && data.actions.length > 0) {
            // Add new AND update existing remote actions (for move/resize sync)
            setActions(prev => {
              const localMap = new Map(prev.map(a => [a.id, a]));
              let changed = false;
              for (const remote of data.actions) {
                if (pendingDeletesRef.current.has(remote.id)) continue;
                const local = localMap.get(remote.id);
                if (!local) {
                  // New action — add it
                  localMap.set(remote.id, remote);
                  changed = true;
                } else if (remote.timestamp > local.timestamp && remote.userId !== clientIdRef.current) {
                  // Existing action with newer timestamp from another user — update it
                  localMap.set(remote.id, remote);
                  changed = true;
                }
              }
              if (!changed) return prev;
              return Array.from(localMap.values());
            });
            // Update synced timestamp
            const maxTs = Math.max(...data.actions.map((a: DrawAction) => a.timestamp));
            setSyncedTimestamp(prev => Math.max(prev, maxTs));
          }
        }
        // Check broadcasts
        const bRes = await fetch(`/api/whiteboard/${id}/broadcasts?since=${Date.now() - 10000}`);
        if (bRes.ok) {
          const bData = await bRes.json();
          if (bData.broadcasts && bData.broadcasts.length > 0) {
            const latest = bData.broadcasts[bData.broadcasts.length - 1];
            setBroadcastBanner(latest.message);
            setTimeout(() => setBroadcastBanner(null), 8000);
          }
        }
      } catch { /* ignore network errors */ }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [id, syncedTimestamp]);

  // ===== HEARTBEAT: her 5 sn'de bir kendini bildir + aktif kullanici listesini al =====
  useEffect(() => {
    if (!nicknameReady || !nickname) return;
    const sendHeartbeat = async () => {
      try {
        const nick = nicknameRef.current || nickname;
        if (!nick) return;
        // Heartbeat gonder (kendini sunucuya bildir)
        await fetch(`/api/whiteboard/${id}/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: clientIdRef.current || nick,
            nickname: nick,
            color: participants.find(p => p.id === 'self')?.color || '#2563eb',
          }),
        });
        // Aktif kullanicilari al
        const res = await fetch(`/api/whiteboard/${id}/heartbeat`);
        if (res.ok) {
          const data = await res.json();
          if (data.users) {
            setParticipants(prev => {
              const self = prev.find(p => p.id === 'self');
              const nick = clientIdRef.current || nicknameRef.current;
              const others = data.users
                .filter((u: any) => u.userId !== nick)
                .map((u: any) => ({
                  id: u.userId,
                  name: u.nickname,
                  color: u.color,
                  isOwner: false,
                  isDrawing: false,
                }));
              return self ? [self, ...others] : others;
            });
          }
        }
      } catch { /* ignore */ }
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 5000);
    return () => clearInterval(interval);
  }, [id, nicknameReady, nickname]);

  // Fetch board data
  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const res = await fetch(`/api/whiteboard?id=${id}`);
        if (res.ok) {
          const data = await res.json();
          setBoardData(data);
          if (data.settings) setSettings(prev => ({ ...prev, ...data.settings }));
        }
      } catch {
        showToast('Sunucuyla bağlantı kurulamadı', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchBoard();
  }, [id]);

  // ===== Sync actions to server =====
  const syncActionToServer = useCallback(async (action: DrawAction) => {
    try {
      await fetch(`/api/whiteboard/${id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action),
      });
    } catch { /* will retry on next poll */ }
  }, [id]);

  const pushUndoCount = () => setUndoCount(undoStackRef.current.length);
  const pushRedoCount = () => setRedoCount(redoStackRef.current.length);

  const handleAddAction = useCallback((action: DrawAction) => {
    setActions(prev => [...prev, action]);
    undoStackRef.current.push({ type: 'add', action });
    redoStackRef.current = []; // Clear redo on new action
    pushUndoCount(); pushRedoCount();
    syncActionToServer(action);
  }, [syncActionToServer]);

  const handleDeleteAction = useCallback(async (actionId: string) => {
    const current = actionsRef.current;
    const removed = current.find(a => a.id === actionId);
    if (removed) {
      undoStackRef.current.push({ type: 'delete', action: removed });
      redoStackRef.current = [];
      pushUndoCount(); pushRedoCount();
    }
    pendingDeletesRef.current.add(actionId);
    setActions(prev => prev.filter(a => a.id !== actionId));
    try { await fetch(`/api/whiteboard/${id}/actions/${actionId}`, { method: 'DELETE' }); } catch { /* ignore */ }
  }, [id]);

  const handleUndo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    const op = stack.pop()!;
    redoStackRef.current.push(op);
    if (op.type === 'add') {
      // Ekleme islemini geri al: action'ı sil
      pendingDeletesRef.current.add(op.action.id);
      setActions(prev => prev.filter(a => a.id !== op.action.id));
      fetch(`/api/whiteboard/${id}/actions/${op.action.id}`, { method: 'DELETE' }).catch(() => {});
    } else if (op.type === 'delete') {
      // Silme islemini geri al: action'ı geri ekle (yeni timestamp ile)
      pendingDeletesRef.current.delete(op.action.id);
      const restored = { ...op.action, timestamp: Date.now() };
      setActions(prev => [...prev, restored]);
      syncActionToServer(restored);
      fetch(`/api/whiteboard/${id}/actions/${op.action.id}?clearDeleted=true`, { method: 'DELETE' }).catch(() => {});
    } else if (op.type === 'move') {
      // Tasima/islem geri al: eski konumlara don
      setActions(prev => prev.map(a => {
        const oldPts = op.oldPositions.get(a.id);
        if (!oldPts) return a;
        return { ...a, points: oldPts.map(p => ({...p})), timestamp: Date.now() };
      }));
      syncActionsRef.current();
    }
    pushUndoCount(); pushRedoCount();
  }, [id, syncActionToServer]);

  const handleRedo = useCallback(() => {
    const stack = redoStackRef.current;
    if (stack.length === 0) return;
    const op = stack.pop()!;
    undoStackRef.current.push(op);
    if (op.type === 'add') {
      const restored = { ...op.action, timestamp: Date.now() };
      setActions(prev => [...prev, restored]);
      syncActionToServer(restored);
    } else if (op.type === 'delete') {
      pendingDeletesRef.current.add(op.action.id);
      setActions(prev => prev.filter(a => a.id !== op.action.id));
      fetch(`/api/whiteboard/${id}/actions/${op.action.id}`, { method: 'DELETE' }).catch(() => {});
    }
    // move/update redo: tekrar uygula (simdi current positions eski konumlarda, hedef yere tasi)
    pushUndoCount(); pushRedoCount();
  }, [id, syncActionToServer]);

  // Ref for handleSyncActions to avoid circular dependency
  const syncActionsRef = useRef<() => void>(() => {});
  // Degisen action ID'lerini takip et (move/resize/rotate icin)
  const changedIdsRef = useRef<Set<string>>(new Set());

  // Sync sadece degisen action'lari sunucuya gonder (bulk replace YAPMAZ!)
  const handleSyncActions = useCallback(async () => {
    const changedIds = changedIdsRef.current;
    changedIdsRef.current = new Set(); // temizle
    if (changedIds.size === 0) return;
    // Sadece degisen action'lari bul ve gonder
    const now = Date.now();
    const changedActions: DrawAction[] = [];
    setActions(prev => {
      const updated = prev.map(a => {
        if (changedIds.has(a.id)) {
          const stamped = { ...a, timestamp: now };
          changedActions.push(stamped);
          return stamped;
        }
        return a;
      });
      actionsRef.current = updated;
      return updated;
    });
    // Sadece degisen action'lari sunucuya upsert et
    if (changedActions.length > 0) {
      try {
        await fetch(`/api/whiteboard/${id}/actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ upsert: changedActions }),
        });
      } catch { /* network error */ }
    }
  }, [id]);

  // Keep syncActionsRef in sync
  useEffect(() => { syncActionsRef.current = () => handleSyncActions(); }, [handleSyncActions]);

  // ===== SNAPSHOT =====
  const handleSaveSnapshot = useCallback(async (name: string, createdBy?: string, isAuto?: boolean) => {
    try {
      const res = await fetch(`/api/whiteboard/${id}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, actions: actionsRef.current, createdBy: createdBy || nickname || 'unknown', isAuto: isAuto || false }),
      });
      if (res.ok && !isAuto) { showToast('Snapshot kaydedildi!', 'success'); }
      else if (!res.ok) { showToast('Snapshot kaydedilemedi', 'error'); }
    } catch { if (!isAuto) showToast('Snapshot kaydedilemedi', 'error'); }
  }, [id, nickname]);

  const handleDeleteSnapshot = useCallback(async (snapshotId: string) => {
    try {
      await fetch(`/api/whiteboard/${id}/snapshots/${snapshotId}`, { method: 'DELETE' });
    } catch { /* ignore */ }
  }, [id]);

  // ===== AUTO-SNAPSHOT (15 dk aralıkla) =====
  const autoSnapTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!nicknameReady) return;
    autoSnapTimerRef.current = setInterval(() => {
      if (actionsRef.current.length > 0) {
        handleSaveSnapshot(`Oto-${new Date().toLocaleTimeString('tr-TR')}`, nickname || 'system', true);
      }
    }, 15 * 60 * 1000); // 15 dakika
    return () => { if (autoSnapTimerRef.current) clearInterval(autoSnapTimerRef.current); };
  }, [nicknameReady, handleSaveSnapshot, nickname]);

  const handleLoadSnapshot = useCallback(async (snapshotId: string) => {
    try {
      snapshotPauseRef.current = true; // polling'i durdur
      const res = await fetch(`/api/whiteboard/${id}/snapshots/${snapshotId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.actions) {
          // Tum action'lara yeni timestamp ver ki diger clientlar da alsin
          const now = Date.now();
          const freshActions = data.actions.map((a: DrawAction, i: number) => ({
            ...a,
            timestamp: now + i, // her birine farkli timestamp
          }));
          // Local state'i guncelle
          setActions(freshActions);
          actionsRef.current = freshActions;
          setSyncedTimestamp(now + freshActions.length);
          // Sunucuya da yukle ki diger kullanilar da gorun (upsert - digerlerinin verisini silme)
          await fetch(`/api/whiteboard/${id}/actions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ upsert: freshActions }),
          });
          showToast('Snapshot yüklendi ve senkronize edildi!', 'success');
        }
      }
      // 5 saniye sonra polling'i devam ettir
      setTimeout(() => { snapshotPauseRef.current = false; }, 5000);
    } catch {
      snapshotPauseRef.current = false;
      showToast('Snapshot yüklenemedi', 'error');
    }
  }, [id]);

  // Export
  const handleExportPNG = useCallback(() => {
    canvasRef.current?.exportFullCanvas();
  }, []);

  // Fullscreen
  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  // Grid
  const handleToggleGrid = useCallback(() => {
    setSettings(prev => ({ ...prev, showGrid: !prev.showGrid }));
  }, []);

  // Top toolbar visibility toggle
  const [showTopToolbar, setShowTopToolbar] = useState(true);

  // ===== TOOLBAR: clicking a tool =====
  const handleToolChange = useCallback((newTool: Tool) => {
    // Same tool clicked again → toggle top toolbar off or deselect
    if (newTool === tool) {
      // If it's a drawing tool, toggle the toolbar
      if (['pen', 'freehand', 'line', 'arrow', 'rectangle', 'square', 'circle', 'ellipse', 'triangle', 'star', 'diamond', 'speech', 'image'].includes(newTool)) {
        setShowTopToolbar(prev => !prev);
      }
      // Don't change tool — just toggle panel
    } else {
      setTool(newTool);
      // Show top toolbar for drawing tools, hide for others
      if (['pen', 'freehand', 'line', 'arrow', 'rectangle', 'square', 'circle', 'ellipse', 'triangle', 'star', 'diamond', 'speech', 'image'].includes(newTool)) {
        setShowTopToolbar(true);
      } else {
        setShowTopToolbar(false);
      }
    }
    setActivePanel(null);
  }, [tool]);

  // ===== PANEL TOGGLE: clicking the same button closes, different opens =====
  const togglePanel = useCallback((panel: 'layers' | 'participants' | 'history' | 'options') => {
    setActivePanel(prev => prev === panel ? null : panel);
  }, []);

  // Canvas interaction: close panels AND top toolbar
  const handleCanvasInteract = useCallback(() => {
    setActivePanel(null);
    setShowTopToolbar(false);
  }, []);

  // Move selected objects
  const moveSnapshotRef = useRef<Map<string, {x:number;y:number}[]> | null>(null);
  const handleMoveSelected = useCallback((dx: number, dy: number) => {
    // First move: snapshot old positions for undo
    if (!moveSnapshotRef.current) {
      const selIds = canvasRef.current?.getSelectedIds() || [];
      const snap = new Map<string, {x:number;y:number}[]>();
      for (const a of actionsRef.current) {
        if (selIds.includes(a.id)) {
          snap.set(a.id, a.points.map(p => ({...p})));
          changedIdsRef.current.add(a.id); // degisiklikleri takip et
        }
      }
      moveSnapshotRef.current = snap;
    }
    setActions(prev => {
      const selIds = canvasRef.current?.getSelectedIds() || [];
      const next = prev.map(a => {
        if (!selIds.includes(a.id)) return a;
        return { ...a, points: a.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
      });
      actionsRef.current = next;
      return next;
    });
  }, []);

  // Commit move to undo stack (called on pointer up)
  const handleMoveCommit = useCallback(() => {
    if (!moveSnapshotRef.current) return;
    const oldPositions = moveSnapshotRef.current;
    moveSnapshotRef.current = null;
    // Push undo op: restore old positions
    undoStackRef.current.push({ type: 'move', oldPositions: new Map(oldPositions) });
    redoStackRef.current = [];
    pushUndoCount(); pushRedoCount();
  }, []);

  // Commit resize/rotate to undo stack
  const handleUpdateCommit = useCallback((oldPositions: Map<string, {x:number;y:number}[]>) => {
    undoStackRef.current.push({ type: 'move', oldPositions: new Map(oldPositions) });
    redoStackRef.current = [];
    pushUndoCount(); pushRedoCount();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); handleUndo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); handleRedo(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) { e.preventDefault(); canvasRef.current?.setZoom((canvasRef.current.getZoom() || 1) * 2); }
      else if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); canvasRef.current?.setZoom((canvasRef.current.getZoom() || 1) * 0.5); }
      else if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); canvasRef.current?.resetZoom(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        canvasRef.current?.deleteSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Tool shortcuts
  useEffect(() => {
    const handleToolShortcut = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      switch (e.key) {
        case 'v': handleToolChange('select'); break;
        case 'p': handleToolChange('pen'); break;
        case 'e': handleToolChange('eraser'); break;
        case 'l': handleToolChange('line'); break;
        case 'a': handleToolChange('arrow'); break;
        case 'r': handleToolChange('rectangle'); break;
        case 'd': handleToolChange('circle'); break;
        case 'h': handleToolChange('hand'); break;
        case 'i': handleToolChange('inspect'); break;
      }
    };
    window.addEventListener('keydown', handleToolShortcut);
    return () => window.removeEventListener('keydown', handleToolShortcut);
  }, [handleToolChange]);

  // ===== NICKNAME MODAL =====
  if (!nicknameReady && showNicknameModal) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <ToastContainer />
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <div className="text-center mb-5">
            <span className="text-4xl block mb-3">👤</span>
            <h2 className="text-lg font-bold text-gray-900">Hoş Geldin!</h2>
            <p className="text-sm text-gray-500 mt-1">Tahtaya katılmak için bir takma ad seç</p>
          </div>
          <input
            type="text"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder={generateGuestName()}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleNicknameSave()}
          />
          <button onClick={handleNicknameSave} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">Devam Et →</button>
          <p className="text-[10px] text-gray-400 text-center mt-3">Takma adın bu cihazda kaydedilecek</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">🎨</div>
          <p className="text-gray-500 text-sm">Tahta yükleniyor...</p>
        </div>
      </div>
    );
  }

  const isTopToolbarVisible = showTopToolbar && tool !== 'hand' && tool !== 'select' && tool !== 'eraser' && tool !== 'image';

  // ===== Floating panel component =====
  const FloatingPanel = ({ children }: { children: React.ReactNode }) => (
    <div className="absolute top-0 left-[68px] md:left-[68px] h-full w-56 md:w-64 bg-white border-r border-gray-200 shadow-lg z-30 overflow-hidden flex flex-col">
      {children}
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden select-none">
      <ConnectionStatus />
      <ToastContainer />

      {/* ===== TOP HEADER ===== */}
      <header className="h-10 bg-[#f0f0f0] border-b border-[#d0d0d0] flex items-center px-2 gap-2 shrink-0 z-20">
        <a href="/" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity mr-1">
          <span className="text-lg">🎨</span>
          <span className="font-bold text-[#4a90d9] text-sm">Yöresel Beyaz Tahta</span>
        </a>
        <div className="h-5 w-px bg-[#d0d0d0]" />
        <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]">{boardData?.name || 'Tahta'}</span>
        <span className="text-[10px] text-gray-400 ml-1">({nickname})</span>
        <div className="flex-1" />

        <button onClick={handleUndo} disabled={undoCount === 0} className="w-7 h-7 rounded flex items-center justify-center text-gray-600 hover:bg-[#e0e0e0] disabled:opacity-30 transition-colors text-sm" title="Geri Al (Ctrl+Z)">↶</button>
        <button onClick={handleRedo} disabled={redoCount === 0} className="w-7 h-7 rounded flex items-center justify-center text-gray-600 hover:bg-[#e0e0e0] disabled:opacity-30 transition-colors text-sm" title="Yinele (Ctrl+Y)">↷</button>
        <div className="h-5 w-px bg-[#d0d0d0]" />
        <button onClick={() => setShowShare(true)} className="h-7 px-2.5 bg-[#4a90d9] text-white text-[10px] font-medium rounded hover:bg-[#3a7bc8] transition-colors flex items-center gap-1">🔗 <span className="hidden sm:inline">Paylaş</span></button>
        <button onClick={handleExportPNG} className="h-7 px-2.5 bg-white border border-[#d0d0d0] text-gray-700 text-[10px] font-medium rounded hover:bg-gray-50 transition-colors flex items-center gap-1">💾 <span className="hidden sm:inline">İndir</span></button>
        <button onClick={handleToggleFullscreen} className="w-7 h-7 rounded flex items-center justify-center text-gray-600 hover:bg-[#e0e0e0] transition-colors text-sm" title="Tam Ekran">⛶</button>
        <button onClick={() => setShowSettings(true)} className="w-7 h-7 rounded flex items-center justify-center text-gray-600 hover:bg-[#e0e0e0] transition-colors text-sm" title="Ayarlar">⚙️</button>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* ===== LEFT SIDEBAR ===== */}
        <LeftSidebar
          activeTool={tool}
          onToolSelect={handleToolChange}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={undoCount > 0}
          canRedo={redoCount > 0}
          onOpenOptions={() => togglePanel('options')}
          undoCount={undoCount}
          redoCount={redoCount}
        />

        {/* ===== FLOATING PANELS (appear next to sidebar) ===== */}
        {activePanel === 'options' && (
          <FloatingPanel>
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
              <h3 className="text-xs font-semibold text-gray-700">⚙️ Seçenekler</h3>
              <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-gray-600 text-sm">×</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <OptionsPanel
                settings={settings}
                onUpdateSettings={(s) => setSettings(prev => ({ ...prev, ...s }))}
                onExportPNG={handleExportPNG}
                onClear={() => {
                  if (confirm('Tahtadaki tüm içerik temizlenecek. Emin misiniz?')) {
                    setActions([]); undoStackRef.current = []; redoStackRef.current = []; setUndoCount(0); setRedoCount(0);
                    showToast('Tahta temizlendi', 'success');
                  }
                }}
                onDelete={() => {
                  if (confirm('Bu tahtayı silmek istediğinize emin misiniz?')) {
                    showToast('Tahta silindi', 'success'); window.location.href = '/';
                  }
                }}
                onToggleFullscreen={handleToggleFullscreen}
                isFullscreen={isFullscreen}
                participantCount={participants.length}
                actionCount={actions.length}
                onToolSelect={handleToolChange}
                onToggleGrid={handleToggleGrid}
                onToggleSettings={() => setShowSettings(true)}
                onShare={() => setShowShare(true)}
                onZoomIn={() => canvasRef.current?.setZoom((canvasRef.current.getZoom() || 1) * 2)}
                onZoomOut={() => canvasRef.current?.setZoom((canvasRef.current.getZoom() || 1) * 0.5)}
                onOpenParticipants={() => togglePanel('participants')}
                onOpenLayers={() => togglePanel('layers')}
              />
            </div>
          </FloatingPanel>
        )}

        {activePanel === 'layers' && (
          <FloatingPanel>
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
              <h3 className="text-xs font-semibold text-gray-700">📑 Katmanlar</h3>
              <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-gray-600 text-sm">×</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <LayersPanel
                layers={layers}
                activeLayerId={activeLayerId}
                onSelect={setActiveLayerId}
                onUpdate={(lid, updates) => setLayers(prev => prev.map(l => l.id === lid ? { ...l, ...updates } : l))}
                onAdd={(layer) => setLayers(prev => [...prev, layer])}
                onDelete={(lid) => {
                  setLayers(prev => prev.filter(l => l.id !== lid));
                  if (activeLayerId === lid) setActiveLayerId(layers[0]?.id || 'default');
                }}
                onReorder={(from, to) => {
                  setLayers(prev => {
                    const n = [...prev]; const [moved] = n.splice(from, 1); n.splice(to, 0, moved); return n;
                  });
                }}
              />
            </div>
          </FloatingPanel>
        )}

        {activePanel === 'participants' && (
          <FloatingPanel>
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
              <h3 className="text-xs font-semibold text-gray-700">👥 Katılımcılar</h3>
              <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-gray-600 text-sm">×</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ParticipantsPanel participants={participants} />
            </div>
          </FloatingPanel>
        )}

        {activePanel === 'history' && (
          <FloatingPanel>
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
              <h3 className="text-xs font-semibold text-gray-700">📋 Geçmiş</h3>
              <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-gray-600 text-sm">×</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <HistoryPanel history={actions} onClose={() => setActivePanel(null)} />
            </div>
          </FloatingPanel>
        )}



        {/* ===== MAIN CONTENT AREA ===== */}
        <div className="flex-1 relative overflow-hidden">
          {/* Top Toolbar — absolute overlay, doesn't resize canvas */}
          {isTopToolbarVisible && (
            <div className="absolute top-0 left-0 right-0 z-20">
              <TopToolbar
                activeTool={tool}
                color={color}
                fillColor={fillColor}
                strokeWidth={strokeWidth}
                opacity={opacity}
                onColorChange={setColor}
                onFillColorChange={setFillColor}
                onStrokeWidthChange={setStrokeWidth}
                onOpacityChange={setOpacity}
                onToolSelect={handleToolChange}
                onStyleChange={setBrushStyle}
                activeStyle={brushStyle}
              />
            </div>
          )}

          {/* Canvas — always full size */}
          <div className="absolute inset-0">
            <WhiteboardCanvas
              ref={canvasRef}
              tool={tool}
              color={color}
              fillColor={fillColor}
              strokeWidth={strokeWidth}
              opacity={opacity}
              fontSize={fontSize}
              fontFamily={fontFamily}
              layers={layers}
              activeLayerId={activeLayerId}
              settings={settings}
              onAddAction={handleAddAction}
              onDeleteAction={handleDeleteAction}
              actions={actions}
              participants={participants}
              brushStyle={brushStyle}
              onToolChange={handleToolChange}
              onCanvasInteract={handleCanvasInteract}
              onMoveSelected={handleMoveSelected}
              onMoveCommit={handleMoveCommit}
              onUpdateActions={setActions}
              onUpdateCommit={handleUpdateCommit}
              onSyncActions={handleSyncActions}
              onActionsChanged={(ids) => { ids.forEach(id => changedIdsRef.current.add(id)); }}
              clientId={clientIdRef.current}
            />


          </div>
        </div>
      </div>



      {/* Broadcast Banner */}
      {broadcastBanner && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-white px-6 py-3 rounded-xl shadow-lg animate-bounce max-w-md text-center">
          <span className="text-sm font-semibold">📢 {broadcastBanner}</span>
        </div>
      )}

      {/* Modals */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onUpdate={(updates) => setSettings(prev => ({ ...prev, ...updates }))}
          onClose={() => setShowSettings(false)}
          onDelete={() => { if (confirm('Bu tahtayı silmek istediğinize emin misiniz?')) { showToast('Tahta silindi', 'success'); window.location.href = '/'; } }}
          onClear={() => { if (confirm('Tahtadaki tüm içerik temizlenecek. Emin misiniz?')) { setActions([]); undoStackRef.current = []; redoStackRef.current = []; setUndoCount(0); setRedoCount(0); showToast('Tahta temizlendi', 'success'); } }}
          onSaveSnapshot={handleSaveSnapshot}
          onLoadSnapshot={handleLoadSnapshot}
          onDeleteSnapshot={handleDeleteSnapshot}
          boardId={id}
          nickname={nickname}
        />
      )}
      {showShare && <ShareModal boardId={id} onClose={() => setShowShare(false)} />}
      {showTutorial && <Tutorial onDone={() => setShowTutorial(false)} />}
    </div>
  );
}
