export interface Family {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string | null;
  email: string;
  display_name: string;
  role: 'owner' | 'partner' | 'caregiver' | 'viewer';
  status: 'active' | 'pending' | 'removed' | 'declined';
  invited_at: string;
  joined_at: string | null;
  invite_token: string;
  avatar_colour: string;
}

/**
 * Role permissions:
 * - owner: full access, invite/remove members, delete family
 * - partner: can log, view all history, edit own logs
 * - caregiver: can log, TODAY tab only (no Story, no history)
 * - viewer: read-only, no Village or Me
 */
export type FamilyRole = FamilyMember['role'];
