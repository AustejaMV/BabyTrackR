import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigation } from '../components/Navigation';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ArrowLeft, UserPlus, LogOut, Download, Users, CheckCircle2, Circle, Trash2, Lock, Globe, Mail, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { serverUrl, supabaseAnonKey } from '../utils/supabase';
import { generatePediatricReport } from '../utils/pdfExport';
import { toast } from 'sonner';
import { saveData, syncDataToServer, SYNCED_DATA_KEYS, loadAllDataFromServer, clearSyncedDataFromLocalStorage } from '../utils/dataSync';
import { CloudUpload } from 'lucide-react';

interface FamilyMember {
  id: string;
  email?: string;
}

interface Note {
  id: string;
  text: string;
  createdAt: number;
  done: boolean;
  isPublic?: boolean;
}

export function Settings() {
  const navigate = useNavigate();
  const { user, signOut, session, familyId, refreshFamily, setFamilyIdFromCreate } = useAuth();
  const [inviteEmail, setInviteEmail] = useState('');
  const [family, setFamily] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [pendingInvites, setPendingInvites] = useState<{ id: string; familyId: string; familyName?: string }[]>([]);
  const [inviteActionLoading, setInviteActionLoading] = useState<string | null>(null);
  const [syncingToCloud, setSyncingToCloud] = useState(false);

  useEffect(() => {
    if (session?.access_token && familyId) {
      loadFamily();
    }
  }, [session, familyId]);

  // Fetch pending invites whenever logged in (so user sees invites even when they already have a family)
  useEffect(() => {
    if (!session?.access_token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${serverUrl}/family/invites`, {
          headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && Array.isArray(data.invites)) setPendingInvites(data.invites);
        else if (!cancelled) setPendingInvites([]);
      } catch {
        if (!cancelled) setPendingInvites([]);
      }
    })();
    return () => { cancelled = true; };
  }, [session?.access_token]);

  // If user is logged in but familyId is still null (e.g. slow load or opened Settings early), try once to load/create family
  useEffect(() => {
    if (session?.access_token && !familyId) {
      refreshFamily();
    }
  }, [session?.access_token, familyId, refreshFamily]);

  useEffect(() => {
    const storedNotes = localStorage.getItem('notes');
    if (storedNotes) {
      try {
        const parsed: Note[] = JSON.parse(storedNotes);
        // Newest first
        parsed.sort((a, b) => b.createdAt - a.createdAt);
        setNotes(parsed);
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  const loadFamily = async () => {
    if (!session?.access_token) return;

    try {
      const response = await fetch(`${serverUrl}/family`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();
      if (result.family) {
        setFamily(result.family);
      }
    } catch (error) {
      console.error('Error loading family:', error);
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    if (!session?.access_token) return;
    setInviteActionLoading(inviteId);
    try {
      const res = await fetch(`${serverUrl}/family/accept-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ inviteId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.familyId) {
        setFamilyIdFromCreate(data.familyId);
        setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
        toast.success(`You've joined "${data.familyName ?? 'the family'}". You're now viewing that family's data.`);
        loadFamily(); // refresh current family details
        // Load family data into localStorage and go to Dashboard so invitee sees shared stats immediately
        const { ok, data: serverData } = await loadAllDataFromServer(session.access_token);
        if (ok) {
          clearSyncedDataFromLocalStorage();
          Object.entries(serverData).forEach(([key, value]) => {
            try {
              localStorage.setItem(key, JSON.stringify(value));
            } catch {
              // ignore
            }
          });
          console.log('[BabyTracker] Settings (after accept): applied server data', { keys: Object.keys(serverData) });
        } else {
          console.warn('[BabyTracker] Settings (after accept): GET /data/all failed, going to Dashboard anyway');
        }
        navigate('/');
      } else {
        toast.error(data.error ?? 'Could not accept invite');
      }
    } catch (e) {
      toast.error('Could not accept invite');
    } finally {
      setInviteActionLoading(null);
    }
  };

  const handleSyncMyDataToFamily = async () => {
    if (!session?.access_token) return;
    setSyncingToCloud(true);
    try {
      for (const key of SYNCED_DATA_KEYS) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const value = JSON.parse(raw);
            await syncDataToServer(key, value, session.access_token);
          } catch {
            // skip invalid json
          }
        }
      }
      toast.success('Your local data has been synced to the family. Other members will see it when they refresh.');
    } catch {
      toast.error('Sync failed. Try again.');
    } finally {
      setSyncingToCloud(false);
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    if (!session?.access_token) return;
    setInviteActionLoading(inviteId);
    try {
      const res = await fetch(`${serverUrl}/family/decline-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ inviteId }),
      });
      if (res.ok) {
        setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
        toast.success('Invite declined.');
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? 'Could not decline');
      }
    } catch {
      toast.error('Could not decline invite');
    } finally {
      setInviteActionLoading(null);
    }
  };

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email || !session?.access_token || !user?.id) return;

    let effectiveFamilyId = familyId;
    if (!effectiveFamilyId) {
      effectiveFamilyId = await refreshFamily();
    }
    if (!effectiveFamilyId) {
      // Fallback: create family directly so we have an id for the invite
      try {
        const createRes = await fetch(`${serverUrl}/family/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ familyName: 'My Family' }),
        });
        const createData = await createRes.json();
        effectiveFamilyId = createData?.familyId ?? null;
        if (effectiveFamilyId) setFamilyIdFromCreate(effectiveFamilyId);
      } catch {
        // ignore
      }
    }
    if (!effectiveFamilyId) {
      toast.error('Could not load or create family. Check your connection and try again.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${serverUrl}/family/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email,
          inviter_id: user.id,
          family_id: effectiveFamilyId,
        }),
      });

      if (response.ok) {
        toast.success('Invitation sent! Ask them to sign in with that email.');
        setInviteEmail('');
      } else {
        toast.error('Failed to send invitation');
      }
    } catch (error) {
      console.error('Error sending invite:', error);
      toast.error('Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    generatePediatricReport();
    toast.success('Report downloaded!');
  };

  const persistNotes = (updated: Note[]) => {
    // Newest first
    const sorted = [...updated].sort((a, b) => b.createdAt - a.createdAt);
    setNotes(sorted);
    localStorage.setItem('notes', JSON.stringify(sorted));
    if (session?.access_token) {
      saveData('notes', sorted, session.access_token);
    }
  };

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    const note: Note = {
      id: Date.now().toString(),
      text: newNoteText.trim(),
      createdAt: Date.now(),
      done: false,
      isPublic: false,
    };
    persistNotes([note, ...notes]);
    setNewNoteText('');
  };

  const handleToggleNotePublic = (id: string) => {
    const updated = notes.map((n) =>
      n.id === id ? { ...n, isPublic: !(n.isPublic ?? false) } : n
    );
    persistNotes(updated);
  };

  const handleToggleNote = (id: string) => {
    const updated = notes.map((n) =>
      n.id === id
        ? {
            ...n,
            done: !n.done,
          }
        : n,
    );
    persistNotes(updated);
  };

  const handleDeleteNote = (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    persistNotes(updated);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 pb-20">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl dark:text-white">Settings</h1>
        </div>

        {/* User Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-4">
          <h2 className="text-lg mb-3 dark:text-white">Account</h2>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400 text-xl">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="dark:text-white font-medium">{user?.email}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Signed in</p>
            </div>
          </div>
        </div>

        {/* Family Management */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg dark:text-white">Family Sharing</h2>
          </div>

          {family && (
            <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Current family</p>
              <p className="dark:text-white font-medium">{family.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {family.members?.length || 0} member{family.members?.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                If others don&apos;t see your logs, sync your data so it&apos;s stored for the whole family.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                disabled={syncingToCloud}
                onClick={handleSyncMyDataToFamily}
              >
                <CloudUpload className="w-4 h-4 mr-2" />
                {syncingToCloud ? 'Syncing…' : 'Sync my data to family'}
              </Button>
            </div>
          )}

          {pendingInvites.length > 0 && (
            <div className="mb-4 p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20">
              <p className="text-xs text-amber-700 dark:text-amber-300 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> Pending invite{pendingInvites.length !== 1 ? 's' : ''}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                You can be in one family at a time. Accepting will switch you to that family and you'll see their data.
              </p>
              {pendingInvites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 border-t border-amber-200/80 dark:border-amber-800/80 first:border-t-0 first:pt-0 first:mt-0 mt-2"
                >
                  <span className="text-sm dark:text-white">
                    Invited to <strong>{inv.familyName ?? 'a family'}</strong>
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={inviteActionLoading !== null}
                      onClick={() => handleDeclineInvite(inv.id)}
                      className="text-gray-600 dark:text-gray-400"
                    >
                      <X className="w-4 h-4 mr-1" /> Decline
                    </Button>
                    <Button
                      size="sm"
                      disabled={inviteActionLoading !== null}
                      onClick={() => handleAcceptInvite(inv.id)}
                    >
                      {inviteActionLoading === inv.id ? '…' : 'Accept & switch'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 block mb-2">
                Invite family member by email
              </label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="partner@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleInvite} disabled={loading || !inviteEmail.trim()}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                They'll need to sign in with this email to join your family
              </p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-4">
          <h2 className="text-lg mb-3 dark:text-white">Notes</h2>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a note..."
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button onClick={handleAddNote} disabled={!newNoteText.trim()}>
                Add
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Public notes are included in the PDF report. Default: private.
            </p>
            {notes.length > 0 ? (
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {notes.map((note) => (
                  <li
                    key={note.id}
                    className="flex items-start justify-between gap-3 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleNote(note.id)}
                      className="mt-0.5 text-blue-600 dark:text-blue-400"
                      title={note.done ? 'Mark undone' : 'Mark done'}
                    >
                      {note.done ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm dark:text-white ${
                          note.done ? 'line-through text-gray-400 dark:text-gray-500' : ''
                        }`}
                      >
                        {note.text}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleNotePublic(note.id)}
                      className={`shrink-0 p-1 rounded ${(note.isPublic ?? false) ? 'text-green-600 dark:text-green-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                      title={(note.isPublic ?? false) ? 'Public (in PDF)' : 'Private (not in PDF)'}
                    >
                      {(note.isPublic ?? false) ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-gray-400 hover:text-red-500 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No notes yet.</p>
            )}
          </div>
        </div>

        {/* Export Report */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-4">
          <h2 className="text-lg mb-3 dark:text-white">Reports</h2>
          <Button onClick={handleExportPDF} variant="outline" className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Export PDF Report for Pediatrician
          </Button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Generates a summary of the last 7 days of tracking data
          </p>
        </div>

        {/* Sign Out */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <Button onClick={handleSignOut} variant="destructive" className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      <Navigation />
    </div>
  );
}
