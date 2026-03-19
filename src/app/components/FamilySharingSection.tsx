import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { serverUrl, supabaseAnonKey } from '../utils/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import type { FamilyMember, FamilyRole } from '../types/family';
import {
  Users, UserPlus, RefreshCw, MoreVertical, Copy, X,
} from 'lucide-react';

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

const AVATAR_COLOURS = [
  '#d4604a', '#7ab3d4', '#4a8a4a', '#c4a0d4', '#d4904a',
  '#4a6ab4', '#8a6b5b', '#b05050', '#5aa85a', '#9060d0',
];

function avatarColour(name: string): string {
  return AVATAR_COLOURS[hashCode(name) % AVATAR_COLOURS.length];
}

const ROLE_LABELS: Record<FamilyRole, string> = {
  owner: 'Owner',
  partner: 'Partner',
  caregiver: 'Caregiver',
  viewer: 'Viewer',
};

const ROLE_BADGE_COLOURS: Record<FamilyRole, { bg: string; text: string }> = {
  owner: { bg: 'var(--pe)', text: 'var(--coral)' },
  partner: { bg: 'var(--sk)', text: 'var(--blue2)' },
  caregiver: { bg: 'var(--sa)', text: 'var(--grn)' },
  viewer: { bg: 'var(--la)', text: 'var(--purp2)' },
};

interface FamilyData {
  id: string;
  name: string;
  members?: FamilyMember[];
}

export function FamilySharingSection() {
  const { user, session, familyId, refreshFamily, setFamilyIdFromCreate } = useAuth();

  const [family, setFamily] = useState<FamilyData | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loadingFamily, setLoadingFamily] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [familyNameInput, setFamilyNameInput] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<FamilyRole>('partner');
  const [inviting, setInviting] = useState(false);

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [roleSheetMember, setRoleSheetMember] = useState<FamilyMember | null>(null);
  const [roleSheetValue, setRoleSheetValue] = useState<FamilyRole>('partner');
  const [removeConfirm, setRemoveConfirm] = useState<FamilyMember | null>(null);
  const [syncing, setSyncing] = useState(false);

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${session?.access_token ?? ''}`,
  }), [session?.access_token]);

  const loadFamily = useCallback(async () => {
    if (!session?.access_token) return;
    setLoadingFamily(true);
    try {
      const res = await fetch(`${serverUrl}/family`, { headers: headers() });
      const data = await res.json().catch(() => ({}));
      if (data.family) {
        setFamily(data.family);
        setMembers(data.family.members ?? []);
      } else {
        setFamily(null);
        setMembers([]);
      }
    } catch {
      /* network error */
    } finally {
      setLoadingFamily(false);
    }
  }, [session?.access_token, headers]);

  useState(() => { loadFamily(); });

  const handleCreate = async () => {
    const name = familyNameInput.trim();
    if (!name || !session?.access_token) return;
    setCreating(true);
    try {
      const res = await fetch(`${serverUrl}/family/create`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ familyName: name }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.familyId) {
        setFamilyIdFromCreate(data.familyId);
        setCreateOpen(false);
        setFamilyNameInput('');
        toast.success('Family created');
        loadFamily();
      } else {
        toast.error(data.error ?? 'Could not create family');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    const code = joinCode.trim();
    if (!code || !session?.access_token) return;
    setJoining(true);
    try {
      const token = code.includes('/') ? code.split('/').pop() : code;
      const res = await fetch(`${serverUrl}/family/join`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.familyId) {
        setFamilyIdFromCreate(data.familyId);
        setJoinOpen(false);
        setJoinCode('');
        toast.success('Joined family!');
        loadFamily();
      } else {
        toast.error(data.error ?? 'Invalid or expired invite link');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setJoining(false);
    }
  };

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email || !session?.access_token || !user?.id) return;
    let effectiveFamilyId = familyId ?? family?.id;
    if (!effectiveFamilyId) {
      effectiveFamilyId = await refreshFamily();
    }
    if (!effectiveFamilyId) {
      toast.error('No family found. Create one first.');
      return;
    }
    setInviting(true);
    try {
      const res = await fetch(`${serverUrl}/family/invite`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          email,
          role: inviteRole,
          inviter_id: user.id,
          family_id: effectiveFamilyId,
        }),
      });
      if (res.ok) {
        toast.success('Invitation sent!');
        setInviteEmail('');
        loadFamily();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? 'Failed to send invitation');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async () => {
    if (!roleSheetMember || !session?.access_token) return;
    try {
      const res = await fetch(`${serverUrl}/family/member-role`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ memberId: roleSheetMember.id, role: roleSheetValue }),
      });
      if (res.ok) {
        toast.success(`Role changed to ${ROLE_LABELS[roleSheetValue]}`);
        setRoleSheetMember(null);
        loadFamily();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? 'Could not change role');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleRemove = async () => {
    if (!removeConfirm || !session?.access_token) return;
    try {
      const res = await fetch(`${serverUrl}/family/member`, {
        method: 'DELETE',
        headers: headers(),
        body: JSON.stringify({ memberId: removeConfirm.id }),
      });
      if (res.ok) {
        toast.success('Member removed');
        setRemoveConfirm(null);
        loadFamily();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? 'Could not remove member');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await refreshFamily();
      await loadFamily();
      toast.success('Synced');
    } catch {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const currentMember = members.find((m) => m.user_id === user?.id);
  const isOwner = currentMember?.role === 'owner';
  const hasFamily = Boolean(family);

  const cardStyle: React.CSSProperties = { background: 'var(--card)', borderColor: 'var(--bd)', fontFamily: 'system-ui, sans-serif' };
  const labelStyle: React.CSSProperties = { color: 'var(--mu)' };

  if (!hasFamily && !loadingFamily) {
    return (
      <div className="rounded-[16px] p-4 mb-4 border" style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5" style={{ color: 'var(--blue)' }} />
          <h2 className="text-base font-medium" style={{ color: 'var(--tx)' }}>Family Sharing</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-xl border p-4 text-center min-h-[100px] flex flex-col items-center justify-center gap-2"
            style={{ borderColor: 'var(--bd)', background: 'var(--bg2)', color: 'var(--tx)' }}
          >
            <Users className="w-6 h-6" style={{ color: 'var(--coral)' }} />
            <span className="text-sm font-medium">Create a family</span>
          </button>
          <button
            type="button"
            onClick={() => setJoinOpen(true)}
            className="rounded-xl border p-4 text-center min-h-[100px] flex flex-col items-center justify-center gap-2"
            style={{ borderColor: 'var(--bd)', background: 'var(--bg2)', color: 'var(--tx)' }}
          >
            <UserPlus className="w-6 h-6" style={{ color: 'var(--blue2)' }} />
            <span className="text-sm font-medium">Join a family</span>
          </button>
        </div>

        {/* Create dialog */}
        {createOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setCreateOpen(false)}>
            <div className="w-full max-w-sm rounded-2xl p-5 border" style={{ background: 'var(--card)', borderColor: 'var(--bd)' }} onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--tx)' }}>Create a family</h3>
              <Input
                placeholder="Family name"
                value={familyNameInput}
                onChange={(e) => setFamilyNameInput(e.target.value)}
                className="mb-3 min-h-[44px]"
                style={{ borderColor: 'var(--bd)', background: 'var(--bg2)', color: 'var(--tx)' }}
                autoFocus
              />
              <div className="flex gap-2">
                <Button className="flex-1 min-h-[44px]" disabled={creating || !familyNameInput.trim()} onClick={handleCreate} style={{ background: 'var(--coral)', color: '#fff' }}>
                  {creating ? 'Creating…' : 'Create'}
                </Button>
                <Button variant="outline" className="min-h-[44px]" onClick={() => setCreateOpen(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}

        {/* Join dialog */}
        {joinOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setJoinOpen(false)}>
            <div className="w-full max-w-sm rounded-2xl p-5 border" style={{ background: 'var(--card)', borderColor: 'var(--bd)' }} onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--tx)' }}>Join a family</h3>
              <Input
                placeholder="Paste invite link or code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="mb-3 min-h-[44px]"
                style={{ borderColor: 'var(--bd)', background: 'var(--bg2)', color: 'var(--tx)' }}
                autoFocus
              />
              <div className="flex gap-2">
                <Button className="flex-1 min-h-[44px]" disabled={joining || !joinCode.trim()} onClick={handleJoin} style={{ background: 'var(--coral)', color: '#fff' }}>
                  {joining ? 'Joining…' : 'Join'}
                </Button>
                <Button variant="outline" className="min-h-[44px]" onClick={() => setJoinOpen(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-[16px] p-4 mb-4 border" style={cardStyle}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5" style={{ color: 'var(--blue)' }} />
          <h2 className="text-base font-medium" style={{ color: 'var(--tx)' }}>{family?.name ?? 'Family'}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px]" style={labelStyle}>
            {members.filter((m) => m.status === 'active').length} member{members.filter((m) => m.status === 'active').length !== 1 ? 's' : ''}
          </span>
          <button type="button" onClick={handleSync} disabled={syncing} className="p-2 rounded-full min-w-[36px] min-h-[36px] flex items-center justify-center" style={{ color: 'var(--mu)' }} aria-label="Sync">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Member list */}
      <div className="space-y-2 mb-4">
        {members.map((member) => {
          const isSelf = member.user_id === user?.id;
          const colour = member.avatar_colour || avatarColour(member.display_name || member.email);
          const badge = ROLE_BADGE_COLOURS[member.role];
          const initial = (member.display_name || member.email || '?').charAt(0).toUpperCase();

          return (
            <div key={member.id} className="flex items-center gap-3 py-2 px-2 rounded-xl relative" style={{ background: isSelf ? 'var(--hl-bg)' : 'transparent' }}>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                style={{ background: colour, color: '#fff' }}
              >
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px] font-medium truncate" style={{ color: 'var(--tx)' }}>
                    {member.display_name || member.email}
                  </span>
                  {isSelf && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--pe)', color: 'var(--coral)' }}>You</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: badge.bg, color: badge.text }}>
                    {ROLE_LABELS[member.role]}
                  </span>
                  {member.status === 'pending' && (
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--notice-amber)' }}>
                      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--notice-amber)' }} />
                      Pending
                    </span>
                  )}
                  {member.status === 'active' && (
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--grn)' }}>
                      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--grn)' }} />
                      Active
                    </span>
                  )}
                </div>
              </div>

              {isOwner && !isSelf && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpenId(menuOpenId === member.id ? null : member.id)}
                    className="p-2 rounded-full min-w-[36px] min-h-[36px] flex items-center justify-center"
                    style={{ color: 'var(--mu)' }}
                    aria-label="Member options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {menuOpenId === member.id && (
                    <div
                      className="absolute right-0 top-full mt-1 z-30 rounded-xl border shadow-lg py-1 min-w-[140px]"
                      style={{ background: 'var(--card)', borderColor: 'var(--bd)' }}
                    >
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2.5 text-[14px] min-h-[44px]"
                        style={{ color: 'var(--tx)' }}
                        onClick={() => {
                          setMenuOpenId(null);
                          setRoleSheetValue(member.role === 'owner' ? 'partner' : member.role);
                          setRoleSheetMember(member);
                        }}
                      >
                        Change role
                      </button>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2.5 text-[14px] min-h-[44px]"
                        style={{ color: 'var(--destructive)' }}
                        onClick={() => {
                          setMenuOpenId(null);
                          setRemoveConfirm(member);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Invite someone */}
      <div className="pt-3 border-t" style={{ borderColor: 'var(--bd)' }}>
        <p className="text-[13px] font-medium mb-2 flex items-center gap-1.5" style={{ color: 'var(--tx)' }}>
          <UserPlus className="w-4 h-4" style={{ color: 'var(--blue2)' }} />
          Invite someone
        </p>
        <div className="flex gap-2 mb-2">
          <Input
            type="email"
            placeholder="partner@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-1 min-h-[44px]"
            style={{ borderColor: 'var(--bd)', background: 'var(--bg2)', color: 'var(--tx)' }}
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as FamilyRole)}
            className="rounded-xl border px-2 py-1 text-[13px] min-h-[44px]"
            style={{ borderColor: 'var(--bd)', background: 'var(--bg2)', color: 'var(--tx)' }}
            aria-label="Role"
          >
            <option value="partner">Partner</option>
            <option value="caregiver">Caregiver</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        <Button
          onClick={handleInvite}
          disabled={inviting || !inviteEmail.trim()}
          className="w-full min-h-[44px]"
          style={{ background: 'var(--coral)', color: '#fff' }}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          {inviting ? 'Sending…' : 'Invite'}
        </Button>
      </div>

      {/* Change role bottom sheet */}
      {roleSheetMember && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setRoleSheetMember(null)}>
          <div
            className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-5 border"
            style={{ background: 'var(--card)', borderColor: 'var(--bd)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--tx)' }}>
                Change role for {roleSheetMember.display_name || roleSheetMember.email}
              </h3>
              <button type="button" onClick={() => setRoleSheetMember(null)} className="p-2" style={{ color: 'var(--mu)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            {(['partner', 'caregiver', 'viewer'] as FamilyRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleSheetValue(r)}
                className="w-full flex items-center gap-3 py-3 px-4 rounded-xl border mb-2 min-h-[48px]"
                style={{
                  borderColor: roleSheetValue === r ? 'var(--coral)' : 'var(--bd)',
                  background: roleSheetValue === r ? 'var(--hl-bg)' : 'var(--bg2)',
                  color: 'var(--tx)',
                }}
              >
                <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: roleSheetValue === r ? 'var(--coral)' : 'var(--bd)' }}>
                  {roleSheetValue === r && <span className="w-2 h-2 rounded-full" style={{ background: 'var(--coral)' }} />}
                </span>
                <span className="text-[14px] font-medium">{ROLE_LABELS[r]}</span>
              </button>
            ))}
            <Button className="w-full mt-2 min-h-[48px]" onClick={handleChangeRole} style={{ background: 'var(--coral)', color: '#fff' }}>
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Remove confirmation dialog */}
      {removeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setRemoveConfirm(null)}>
          <div
            className="w-full max-w-sm rounded-2xl p-5 border"
            style={{ background: 'var(--card)', borderColor: 'var(--bd)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--tx)' }}>Remove member</h3>
            <p className="text-[14px] mb-4" style={{ color: 'var(--mu)' }}>
              Remove {removeConfirm.display_name || removeConfirm.email} from the family? They won&apos;t be notified.
            </p>
            <div className="flex gap-2">
              <Button variant="destructive" className="flex-1 min-h-[48px]" onClick={handleRemove}>Remove</Button>
              <Button variant="outline" className="flex-1 min-h-[48px]" onClick={() => setRemoveConfirm(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
