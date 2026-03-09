import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigation } from '../components/Navigation';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ArrowLeft, UserPlus, LogOut, Download, Users, CheckCircle2, Circle, Trash2, Lock, Globe } from 'lucide-react';
import { Link } from 'react-router';
import { serverUrl, supabaseAnonKey } from '../utils/supabase';
import { generatePediatricReport } from '../utils/pdfExport';
import { toast } from 'sonner';
import { saveData } from '../utils/dataSync';

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
  const { user, signOut, session, familyId } = useAuth();
  const [inviteEmail, setInviteEmail] = useState('');
  const [family, setFamily] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteText, setNewNoteText] = useState('');

  useEffect(() => {
    if (session?.access_token && familyId) {
      loadFamily();
    }
  }, [session, familyId]);

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

  const handleInvite = async () => {
    if (!inviteEmail || !session?.access_token || !user?.id || !familyId) {
      if (!familyId) toast.error('Please wait for your family to load, or create one first.');
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
          email: inviteEmail,
          inviter_id: user.id,
          family_id: familyId,
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
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Family Name</p>
              <p className="dark:text-white font-medium">{family.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {family.members?.length || 0} member{family.members?.length !== 1 ? 's' : ''}
              </p>
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
                <Button onClick={handleInvite} disabled={loading || !inviteEmail || !familyId}>
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
