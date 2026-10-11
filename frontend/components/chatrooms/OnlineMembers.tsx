"use client";

import React, { useContext } from 'react';
import { useSocket } from '@/contexts/SocketProvider';
import { authContext } from '@/contexts/AuthProvider';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Users } from 'lucide-react';

interface OnlineMembersProps {
    roomId: string;
}

function OnlineMembers({ roomId }: OnlineMembersProps) {
    const { user } = useContext(authContext);
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
        const isCurrentUser = user?.username && rawName.toLowerCase() === user.username.toLowerCase();

        return (
            <div
                key={member.userId || member.username}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/60 transition-colors min-w-0 w-full group"
                title={displayName}
            >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Avatar with Messenger green presence dot */}
                    <div className="relative shrink-0">
                        <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-[11px] font-semibold bg-gradient-to-tr from-blue-500/15 to-indigo-500/15 text-blue-600 dark:text-blue-400">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-background" />
                    </div>

                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="text-xs sm:text-sm font-medium truncate block text-foreground">
                            {displayName}
                        </span>
                        {isCurrentUser && (
                            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                                (You)
                            </span>
                        )}
                    </div>
                </div>

                {/* Role badge */}
                <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                        isGuest
                            ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-800/40"
                            : "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-800/40"
                    }`}
                >
                    {isGuest ? "Guest" : "Member"}
                </span>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-3 min-w-0 w-full">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <h2 className="font-semibold text-sm sm:text-base text-foreground">People Online</h2>
                </div>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200/50 dark:border-blue-800/40 px-2 py-0.5 rounded-full shrink-0">
                    {onlineMembers.length}
                </span>
            </div>

            {!isConnected ? (
                <div className="py-4 text-center text-xs text-muted-foreground">
                    Connecting to presence server...
                </div>
            ) : onlineMembers.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">
                    No active members online
                </div>
            ) : (
                <div className="flex flex-col gap-3 min-w-0 w-full">
                    {/* Permanent Account Users Section (Shown First) */}
                    {permanentMembers.length > 0 && (
                        <div className="flex flex-col gap-1 min-w-0 w-full">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-2">
                                Registered Members ({permanentMembers.length})
                            </span>
                            <div className="flex flex-col gap-0.5 min-w-0 w-full">
                                {permanentMembers.map((m) => renderMemberItem(m, false))}
                            </div>
                        </div>
                    )}

                    {/* Guest Users Section (Shown Below Permanent Users) */}
                    {guestMembers.length > 0 && (
                        <div className="flex flex-col gap-1 min-w-0 w-full">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-2">
                                Guests ({guestMembers.length})
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


