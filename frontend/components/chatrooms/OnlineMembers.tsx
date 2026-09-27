"use client";
import React from 'react';
import { useSocket } from '@/contexts/SocketProvider';
import { Avatar, AvatarFallback } from '../ui/avatar';

interface OnlineMembersProps {
    roomId: string;
}

function OnlineMembers({ roomId }: OnlineMembersProps) {
    const { getOnlineMembersForRoom, isConnected } = useSocket();
    const onlineMembers = getOnlineMembersForRoom(roomId);

    // Helper to determine if a member is a guest/anonymous user
    const isGuestMember = (member: { type?: string; username: string }) => {
        return (
            member.type === "guest" ||
            member.type === "anonymous" ||
            member.username.toLowerCase().startsWith("guest-")
        );
    };

    // Separate permanent members and guest members so permanent users show first
    const permanentMembers = onlineMembers.filter((m) => !isGuestMember(m));
    const guestMembers = onlineMembers.filter((m) => isGuestMember(m));

    const renderMemberItem = (member: OnlineMember, isGuest: boolean) => {
        const rawName = member.username;
        const displayName =
            isGuest && !rawName.toLowerCase().startsWith("guest-")
                ? `guest-${rawName}`
                : rawName;
        const initials = (isGuest ? rawName.replace(/^guest-/i, "") : rawName)
            .slice(0, 2)
            .toUpperCase() || "U";

        return (
            <div
                key={member.userId || member.username}
                className="flex items-center p-2 rounded-lg hover:bg-muted/50 transition-colors min-w-0 w-full group"
                title={displayName}
            >
                <div className="flex items-center gap-2.5 min-w-0 w-full">
                    <Avatar className="w-8 h-8 shrink-0">
                        <AvatarFallback className="text-xs font-semibold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                        <span className="text-sm font-medium truncate block min-w-0 flex-1 text-foreground">
                            {displayName}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-3 min-w-0 w-full">
            <div className="flex items-center justify-between pb-1 border-b">
                <h2 className="font-semibold text-base sm:text-lg truncate">Online Members</h2>
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                    {onlineMembers.length}
                </span>
            </div>

            {!isConnected ? (
                <p className="text-sm text-muted-foreground">Connecting...</p>
            ) : onlineMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No members online</p>
            ) : (
                <div className="flex flex-col gap-3 min-w-0 w-full">
                    {/* Permanent Account Users Section (Shown First) */}
                    {permanentMembers.length > 0 && (
                        <div className="flex flex-col gap-1 min-w-0 w-full">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2">
                                Members — {permanentMembers.length}
                            </span>
                            <div className="flex flex-col gap-0.5 min-w-0 w-full">
                                {permanentMembers.map((m) => renderMemberItem(m, false))}
                            </div>
                        </div>
                    )}

                    {/* Guest Users Section (Shown Below Permanent Users) */}
                    {guestMembers.length > 0 && (
                        <div className="flex flex-col gap-1 min-w-0 w-full">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2">
                                Guests — {guestMembers.length}
                            </span>
                            <div className="flex flex-col gap-0.5 min-w-0 w-full">
                                {guestMembers.map((m) => renderMemberItem(m, true))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default OnlineMembers;

