import { useState, useEffect } from 'react';
import { Users, UserPlus, Mail, Check, X, Clock, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { DatabaseGroup, DatabaseGroupMember } from '../../types/database';

interface GroupWithStats extends DatabaseGroup {
  member_count?: number;
  total_equity?: number;
  total_cash?: number;
}

interface MemberWithDetails extends DatabaseGroupMember {
  member_email?: string;
  member_name?: string;
  equity_value?: number;
  position_count?: number;
}

export default function NetworkManagerPage() {
  const [groups, setGroups] = useState<GroupWithStats[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupWithStats | null>(null);
  const [members, setMembers] = useState<MemberWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteNickname, setInviteNickname] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchGroups = async () => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .eq('owner_id', userId);

      if (groupsError) throw groupsError;

      // Get stats for each group
      const groupsWithStats = await Promise.all(
        (groupsData || []).map(async (group) => {
          const { data: members } = await supabase
            .from('group_members')
            .select('id')
            .eq('group_id', group.id);

          return {
            ...group,
            member_count: members?.length || 0,
          };
        })
      );

      setGroups(groupsWithStats);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError('Failed to load groups');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const { data: membersData, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId);

      if (error) throw error;

      setMembers((membersData || []) as MemberWithDetails[]);
    } catch (err) {
      console.error('Error fetching members:', err);
      setError('Failed to load group members');
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupMembers(selectedGroup.id);
    }
  }, [selectedGroup]);

  const handleCreateGroup = async () => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId || !newGroupName.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { data, error: createError } = await supabase
        .from('groups')
        .insert({
          group_name: newGroupName.trim(),
          description: newGroupDescription.trim() || null,
          owner_id: userId,
        } as never)
        .select()
        .single();

      if (createError) throw createError;

      if (data) {
        setGroups([...groups, { ...data, member_count: 0 }]);
        setSelectedGroup(data);
      }

      setNewGroupName('');
      setNewGroupDescription('');
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error('Error creating group:', err);
      setError('Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInviteMember = async () => {
    if (!selectedGroup || !inviteEmail.trim()) return;

    setIsSubmitting(true);
    setError(null);

    const userId = (await supabase.auth.getUser()).data.user?.id;

    try {
      const { error: inviteError } = await supabase
        .from('group_members')
        .insert({
          group_id: selectedGroup.id,
          invitation_email: inviteEmail.trim().toLowerCase(),
          nickname: inviteNickname.trim() || null,
          invited_by: userId,
          is_accepted: false,
        } as never);

      if (inviteError) throw inviteError;

      await fetchGroupMembers(selectedGroup.id);

      setInviteEmail('');
      setInviteNickname('');
      setIsInviteModalOpen(false);
    } catch (err) {
      console.error('Error inviting member:', err);
      setError('Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      await fetchGroupMembers(selectedGroup!.id);
    } catch (err) {
      console.error('Error removing member:', err);
      setError('Failed to remove member');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      setGroups(groups.filter(g => g.id !== groupId));
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
        setMembers([]);
      }
    } catch (err) {
      console.error('Error deleting group:', err);
      setError('Failed to delete group');
    }
  };

  const calculateNetworkTotals = () => {
    return members.reduce((totals, member) => ({
      positions: totals.positions + (member.position_count || 0),
      accepted: totals.accepted + (member.is_accepted ? 1 : 0),
      pending: totals.pending + (member.is_accepted ? 0 : 1),
    }), { positions: 0, accepted: 0, pending: 0 });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="skeleton h-8 w-48 mb-2" />
          <div className="skeleton h-4 w-64 mb-6" />
          <div className="skeleton h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Network Manager</h1>
          <p className="text-slate-400 mt-1">Manage your private investment network</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Users className="w-4 h-4" />
          Create Group
        </button>
      </div>

      {error && (
        <div className="p-4 bg-loss/10 border border-loss/30 rounded-xl text-loss">
          {error}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Groups Yet</h3>
          <p className="text-slate-400 mb-6">Create a group to start tracking your family&apos;s wealth together</p>
          <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary">
            Create Your First Group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Group List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Your Groups</h3>
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                className={`w-full glass-card p-4 text-left transition-all hover:border-accent/50 ${
                  selectedGroup?.id === group.id ? 'border-accent' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-white">{group.group_name}</h4>
                    <p className="text-sm text-slate-400 mt-1">
                      {group.description || 'No description'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {group.member_count} members
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(group.created_at).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Group Details */}
          {selectedGroup && (
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{selectedGroup.group_name}</h3>
                    <p className="text-sm text-slate-400">{selectedGroup.description || 'No description'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsInviteModalOpen(true)}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Invite
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(selectedGroup.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-loss hover:bg-loss/10 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Network Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-slate-800/30">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-xs">Total Members</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{members.length}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gain/10">
                    <div className="flex items-center gap-2 text-gain mb-1">
                      <Check className="w-4 h-4" />
                      <span className="text-xs">Active</span>
                    </div>
                    <p className="text-2xl font-bold text-gain">{calculateNetworkTotals().accepted}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-500/10">
                    <div className="flex items-center gap-2 text-amber-400 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs">Pending</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-400">{calculateNetworkTotals().pending}</p>
                  </div>
                </div>

                {/* Members List */}
                <h4 className="text-sm font-medium text-slate-400 mb-3">Network Members</h4>
                {members.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400 mb-2">No members in this group</p>
                    <p className="text-sm text-slate-500">Invite family or friends to start tracking together</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                            <span className="text-accent font-semibold">
                              {(member.nickname || member.invitation_email)[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {member.nickname || member.invitation_email.split('@')[0]}
                            </p>
                            <p className="text-sm text-slate-400">{member.invitation_email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            {member.is_accepted ? (
                              <span className="badge-gain">Active</span>
                            ) : (
                              <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded-full">
                                Pending
                              </span>
                            )}
                            <p className="text-xs text-slate-500 mt-1">
                              {member.permission_level} access
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-loss hover:bg-loss/10 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Privacy Settings Legend */}
                <div className="mt-6 p-4 rounded-xl bg-slate-800/20 border border-slate-700/50">
                  <h5 className="text-sm font-medium text-slate-300 mb-2">Permission Levels</h5>
                  <div className="space-y-2 text-xs text-slate-400">
                    <p><span className="text-white">View:</span> See total allocation percentages only</p>
                    <p><span className="text-white">View Details:</span> See position counts and equity values</p>
                    <p><span className="text-white">Admin:</span> Full access to detailed portfolio data</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Group Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="glass-card p-6 w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Create New Group</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="input-label">Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="input-field"
                  placeholder="e.g., Family Portfolio"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="input-label">Description (optional)</label>
                <textarea
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  className="input-field resize-none"
                  rows={3}
                  placeholder="e.g., Smith family investment tracking"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn-secondary flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroup}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                  disabled={isSubmitting || !newGroupName.trim()}
                >
                  {isSubmitting ? (
                    <>Creating...</>
                  ) : (
                    <>Create Group</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {isInviteModalOpen && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="glass-card p-6 w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Invite Member</h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="input-label">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="input-field"
                  placeholder="family@example.com"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="input-label">Nickname (optional)</label>
                <input
                  type="text"
                  value={inviteNickname}
                  onChange={(e) => setInviteNickname(e.target.value)}
                  className="input-field"
                  placeholder="e.g., Mom, Dad, Uncle Bob"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="btn-secondary flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleInviteMember}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                  disabled={isSubmitting || !inviteEmail.trim()}
                >
                  {isSubmitting ? (
                    <>Inviting...</>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Send Invite
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
