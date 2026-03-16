import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigation } from '../components/Navigation';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ArrowLeft, UserPlus, LogOut, Users, Trash2, Mail, X, AlertTriangle, CloudUpload, Camera } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { serverUrl, supabaseAnonKey } from '../utils/supabase';
import { toast } from 'sonner';
import { saveData, saveManyToServer, SYNCED_DATA_KEYS, SYNCED_DATA_DEFAULTS, loadAllDataFromServer, clearSyncedDataFromLocalStorage } from '../utils/dataSync';
import type { BabyProfile } from '../types';
import { getAgeInDays } from '../utils/babyUtils';
import { compressBabyPhoto } from '../utils/imageCompress';
import { readAlertThresholds, saveAlertThresholds, type AlertThresholds } from '../utils/alertThresholdsStorage';
import { Mic } from 'lucide-react';
import { VOICE_COMMAND_EXAMPLES } from '../components/VoiceControl';

interface FamilyMember {
  id: string;
  email?: string;
}


export function Settings() {
  const navigate = useNavigate();
  const { user, signOut, session, familyId, refreshFamily, setFamilyIdFromCreate } = useAuth();
  const [inviteEmail, setInviteEmail] = useState('');
  const [family, setFamily] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<{ id: string; familyId: string; familyName?: string }[]>([]);
  const [inviteActionLoading, setInviteActionLoading] = useState<string | null>(null);
  const [syncingToCloud, setSyncingToCloud] = useState(false);
  const [wipePending, setWipePending] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
  const [birthDateInput, setBirthDateInput] = useState('');
  const [babyNameInput, setBabyNameInput] = useState('');
  const [photoCompressing, setPhotoCompressing] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [alertThresholds, setAlertThresholds] = useState<AlertThresholds>(() => readAlertThresholds());

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
    try {
      const raw = localStorage.getItem('babyProfile');
      if (raw) {
        const p = JSON.parse(raw) as BabyProfile | null;
        setBabyProfile(p);
        if (p?.birthDate) {
          const d = new Date(p.birthDate);
          setBirthDateInput(d.toISOString().slice(0, 10));
        }
        setBabyNameInput(p?.name ?? '');
      }
    } catch {
      // ignore
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
      const updates = SYNCED_DATA_KEYS.flatMap((key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        try { return [{ dataType: key, data: JSON.parse(raw) }]; } catch { return []; }
      });
      await saveManyToServer(updates, session.access_token);
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

  const handleWipeAllData = async () => {
    if (!wipePending) {
      setWipePending(true);
      return;
    }
    setWiping(true);
    setWipePending(false);
    try {
      // Reset localStorage to defaults
      clearSyncedDataFromLocalStorage();
      for (const key of SYNCED_DATA_KEYS) {
        const def = SYNCED_DATA_DEFAULTS[key];
        localStorage.setItem(key, JSON.stringify(def));
      }
      // Push defaults to server so every family member also gets wiped
      if (session?.access_token) {
        const updates = SYNCED_DATA_KEYS.map((key) => ({ dataType: key, data: SYNCED_DATA_DEFAULTS[key] }));
        await saveManyToServer(updates, session.access_token);
      }
      toast.success('All baby data has been wiped. Family account and members are untouched.');
    } catch {
      toast.error('Wipe failed. Try again.');
    } finally {
      setWiping(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const saveBabyProfile = (updates: Partial<BabyProfile> | null) => {
    const next: BabyProfile | null = updates === null
      ? null
      : {
          birthDate: updates.birthDate ?? babyProfile?.birthDate ?? 0,
          ...(updates.name !== undefined ? { name: updates.name || undefined } : (babyProfile?.name != null ? { name: babyProfile.name } : {})),
          ...(updates.photoDataUrl !== undefined ? { photoDataUrl: updates.photoDataUrl || undefined } : (babyProfile?.photoDataUrl != null ? { photoDataUrl: babyProfile.photoDataUrl } : {})),
        };
    if (next && !next.birthDate) return;
    const toSave = next && next.birthDate ? next : null;
    setBabyProfile(toSave);
    try { localStorage.setItem('babyProfile', JSON.stringify(toSave)); } catch { /* ignore */ }
    if (session?.access_token) saveData('babyProfile', toSave, session.access_token);
  };

  const handleBirthDateChange = (dateStr: string) => {
    setBirthDateInput(dateStr);
    if (!dateStr) { saveBabyProfile(null); return; }
    const ms = new Date(dateStr).setHours(0, 0, 0, 0);
    if (!Number.isNaN(ms)) saveBabyProfile({ birthDate: ms });
  };

  const handleBabyNameBlur = () => {
    const name = babyNameInput.trim().slice(0, 200);
    setBabyNameInput(name);
    if (babyProfile?.birthDate) saveBabyProfile({ name: name || undefined });
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    const existingMs = babyProfile?.birthDate ?? (birthDateInput ? new Date(birthDateInput).setHours(0, 0, 0, 0) : NaN);
    const birthDateMs = Number.isFinite(existingMs) ? existingMs : (() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })();
    setPhotoCompressing(true);
    try {
      const dataUrl = await compressBabyPhoto(file);
      if (babyProfile?.birthDate) saveBabyProfile({ photoDataUrl: dataUrl });
      else {
        const next: BabyProfile = { birthDate: birthDateMs, photoDataUrl: dataUrl };
        if (babyNameInput.trim()) next.name = babyNameInput.trim().slice(0, 200);
        setBabyProfile(next);
        setBirthDateInput(new Date(birthDateMs).toISOString().slice(0, 10));
        try { localStorage.setItem('babyProfile', JSON.stringify(next)); } catch { /* ignore */ }
        if (session?.access_token) saveData('babyProfile', next, session.access_token);
      }
      toast.success(Number.isFinite(existingMs) ? 'Photo added' : 'Photo added. Set birth date below for accurate targets.');
    } catch (err) {
      toast.error('Could not process photo');
      console.warn(err);
    } finally {
      setPhotoCompressing(false);
    }
  };

  const handleRemovePhoto = () => {
    if (babyProfile?.birthDate) saveBabyProfile({ photoDataUrl: undefined });
    toast.success('Photo removed');
  };

  const cardClass = 'rounded-[16px] p-4 mb-4 border';
  const cardStyle: React.CSSProperties = { background: 'var(--card)', borderColor: 'var(--bd)', fontFamily: 'system-ui, sans-serif' };
  const labelClass = 'block text-[13px] mb-1';
  const labelStyle: React.CSSProperties = { color: 'var(--mu)' };
  const inputClass = 'rounded-lg border px-3 py-2.5 text-[15px] outline-none min-h-[44px] w-full max-w-[200px]';
  const inputStyle: React.CSSProperties = { borderColor: 'var(--bd)', background: 'var(--bg2)', color: 'var(--tx)' };

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/">
            <button type="button" className="p-2 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center" style={{ color: 'var(--tx)', background: 'var(--card)', border: '1px solid var(--bd)' }}>
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--tx)' }}>Settings</h1>
        </div>

        {/* Baby */}
        <div className={cardClass} style={cardStyle}>
          <h2 className="text-base font-medium mb-1" style={{ color: 'var(--tx)' }}>Baby</h2>
          <p className="text-[13px] mb-4" style={labelStyle}>
            Set birth date to see age-appropriate targets and normalcy on the dashboard.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center shrink-0 border-2" style={{ background: 'var(--bg2)', borderColor: 'var(--bd)' }}>
                {babyProfile?.photoDataUrl ? (
                  <img src={babyProfile.photoDataUrl} alt="Baby" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8" style={{ color: 'var(--mu)' }} />
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} disabled={photoCompressing} />
                <Button type="button" variant="outline" size="sm" disabled={photoCompressing} onClick={() => photoInputRef.current?.click()} className="min-h-[44px]">
                  {photoCompressing ? 'Compressing…' : 'Upload photo'}
                </Button>
                {babyProfile?.photoDataUrl && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleRemovePhoto} className="min-h-[44px]" style={{ color: 'var(--mu)' }}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
            <div className="flex-1 space-y-3 min-w-0">
              <div>
                <label className={labelClass} style={labelStyle}>Name</label>
                <Input
                  type="text"
                  placeholder="Baby's name"
                  value={babyNameInput}
                  onChange={(e) => setBabyNameInput(e.target.value)}
                  onBlur={handleBabyNameBlur}
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Birth date</label>
                <Input
                  type="date"
                  value={birthDateInput}
                  onChange={(e) => handleBirthDateChange(e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                />
                {babyProfile?.birthDate && (
                  <p className="text-[13px] mt-2" style={labelStyle}>
                    Age: {getAgeInDays(babyProfile.birthDate)} days
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Alert thresholds */}
        <div className={cardClass} style={cardStyle}>
          <h2 className="text-base font-medium mb-1" style={{ color: 'var(--tx)' }}>Alert thresholds</h2>
          <p className="text-[13px] mb-4" style={labelStyle}>
            Configure when alert pills appear on the home screen. Dismissed alerts hide for 2 hours.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} style={labelStyle}>No poop (hours)</label>
              <Input type="number" min={12} max={72} value={alertThresholds.noPoopHours} onChange={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v)) { setAlertThresholds((t) => ({ ...t, noPoopHours: v })); saveAlertThresholds({ noPoopHours: v }); } }} className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>No sleep (hours)</label>
              <Input type="number" min={3} max={12} value={alertThresholds.noSleepHours} onChange={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v)) { setAlertThresholds((t) => ({ ...t, noSleepHours: v })); saveAlertThresholds({ noSleepHours: v }); } }} className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Feed overdue buffer (minutes)</label>
              <Input type="number" min={0} max={120} value={alertThresholds.feedOverdueMinutes} onChange={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v)) { setAlertThresholds((t) => ({ ...t, feedOverdueMinutes: v })); saveAlertThresholds({ feedOverdueMinutes: v }); } }} className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Tummy low target (minutes)</label>
              <Input type="number" min={5} max={60} value={alertThresholds.tummyLowMinutes} onChange={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v)) { setAlertThresholds((t) => ({ ...t, tummyLowMinutes: v })); saveAlertThresholds({ tummyLowMinutes: v }); } }} className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Tummy low check after (hour, 0–23)</label>
              <Input type="number" min={0} max={23} value={alertThresholds.tummyLowByHour} onChange={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v)) { setAlertThresholds((t) => ({ ...t, tummyLowByHour: v })); saveAlertThresholds({ tummyLowByHour: v }); } }} className={inputClass} style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Account */}
        <div className={cardClass} style={cardStyle}>
          <h2 className="text-base font-medium mb-3" style={{ color: 'var(--tx)' }}>Account</h2>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--pe)' }}>
              <span className="text-xl font-medium" style={{ color: 'var(--coral)' }}>
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-medium text-[14px]" style={{ color: 'var(--tx)' }}>{user?.email}</p>
              <p className="text-[13px]" style={labelStyle}>Signed in</p>
            </div>
          </div>
        </div>

        {/* Family Management */}
        <div className={cardClass} style={cardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5" style={{ color: 'var(--blue)' }} />
            <h2 className="text-base font-medium" style={{ color: 'var(--tx)' }}>Family Sharing</h2>
          </div>

          {family && (
            <div className="mb-4 p-3 rounded-[14px] border" style={{ background: 'var(--bg2)', borderColor: 'var(--bd)' }}>
              <p className="text-[11px] uppercase tracking-wider mb-1" style={labelStyle}>Current family</p>
              <p className="font-medium text-[14px]" style={{ color: 'var(--tx)' }}>{family.name}</p>
              <p className="text-[13px] mt-0.5" style={labelStyle}>
                {family.members?.length || 0} member{family.members?.length !== 1 ? 's' : ''}
              </p>
              <p className="text-[12px] mt-2" style={labelStyle}>
                If others don&apos;t see your logs, sync your data so it&apos;s stored for the whole family.
              </p>
              <Button type="button" variant="outline" size="sm" className="mt-2 min-h-[44px]" disabled={syncingToCloud} onClick={handleSyncMyDataToFamily}>
                <CloudUpload className="w-4 h-4 mr-2" />
                {syncingToCloud ? 'Syncing…' : 'Sync my data to family'}
              </Button>
            </div>
          )}

          {pendingInvites.length > 0 && (
            <div className="mb-4 p-3 rounded-[14px] border" style={{ borderColor: 'var(--ro)', background: 'var(--ro-bub)' }}>
              <p className="text-[11px] uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: 'var(--med-col)' }}>
                <Mail className="w-3.5 h-3.5" /> Pending invite{pendingInvites.length !== 1 ? 's' : ''}
              </p>
              <p className="text-[13px] mb-2" style={labelStyle}>
                You can be in one family at a time. Accepting will switch you to that family and you'll see their data.
              </p>
              {pendingInvites.map((inv) => (
                <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-2 border-t first:border-t-0 first:pt-0 first:mt-0 mt-2" style={{ borderColor: 'var(--bd)' }}>
                  <span className="text-[14px]" style={{ color: 'var(--tx)' }}>
                    Invited to <strong>{inv.familyName ?? 'a family'}</strong>
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={inviteActionLoading !== null} onClick={() => handleDeclineInvite(inv.id)} className="min-h-[44px]" style={{ color: 'var(--mu)' }}>
                      <X className="w-4 h-4 mr-1" /> Decline
                    </Button>
                    <Button size="sm" disabled={inviteActionLoading !== null} onClick={() => handleAcceptInvite(inv.id)} className="min-h-[44px]">
                      {inviteActionLoading === inv.id ? '…' : 'Accept & switch'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className={labelClass} style={labelStyle}>Invite family member by email</label>
              <div className="flex gap-2">
                <Input type="email" placeholder="partner@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="flex-1 min-h-[44px]" style={inputStyle} />
                <Button onClick={handleInvite} disabled={loading || !inviteEmail.trim()} className="min-h-[44px]">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite
                </Button>
              </div>
              <p className="text-[12px] mt-2" style={labelStyle}>
                They'll need to sign in with this email to join your family
              </p>
            </div>
          </div>
        </div>

        {/* Voice Commands */}
        <div className={cardClass} style={cardStyle}>
          <div className="flex items-center gap-2 mb-3">
            <Mic className="w-5 h-5" style={{ color: 'var(--purp)' }} />
            <h2 className="text-base font-medium" style={{ color: 'var(--tx)' }}>Voice Commands</h2>
          </div>
          <p className="text-[13px] mb-3" style={labelStyle}>
            Tap the <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs" style={{ background: 'var(--bg2)' }}><Mic className="w-3 h-3" /> mic button</span> floating above the nav bar, then say any of these commands. The &ldquo;BabyTracker,&rdquo; prefix is optional.
          </p>
          <ul className="space-y-2">
            {VOICE_COMMAND_EXAMPLES.map(({ cmd, desc }) => (
              <li key={cmd} className="flex flex-col gap-0.5">
                <code className="text-xs rounded px-2 py-0.5 font-mono" style={{ background: 'var(--bg2)', color: 'var(--purp)' }}>{cmd}</code>
                <span className="text-[12px] pl-1" style={labelStyle}>{desc}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Danger Zone */}
        <div className={cardClass} style={{ ...cardStyle, borderColor: 'var(--ro)' }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5" style={{ color: 'var(--med-col)' }} />
            <h2 className="text-base font-medium" style={{ color: 'var(--tx)' }}>Danger Zone</h2>
          </div>
          <p className="text-[13px] mb-4" style={labelStyle}>
            Permanently deletes all tracking data (feeds, sleeps, diapers, tummy time) for the entire family. Your account and family members are kept.
          </p>
          {wipePending ? (
            <div className="space-y-2">
              <p className="text-[14px] font-medium" style={{ color: 'var(--med-col)' }}>
                Are you sure? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button variant="destructive" className="flex-1 min-h-[48px]" disabled={wiping} onClick={handleWipeAllData}>
                  {wiping ? 'Wiping…' : 'Yes, wipe everything'}
                </Button>
                <Button variant="outline" className="flex-1 min-h-[48px]" onClick={() => setWipePending(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full min-h-[48px]" style={{ borderColor: 'var(--ro)', color: 'var(--med-col)' }} onClick={handleWipeAllData}>
              <Trash2 className="w-4 h-4 mr-2" />
              Wipe all baby data
            </Button>
          )}
        </div>

        {/* Sign Out */}
        <div className={cardClass} style={cardStyle}>
          <Button onClick={handleSignOut} variant="destructive" className="w-full min-h-[48px]">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      <Navigation />
    </div>
  );
}
