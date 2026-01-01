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

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">Online Members</h2>
                <span className="text-sm text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                    {onlineMembers.length}
                </span>
            </div>

            {!isConnected ? (
                <p className="text-sm text-gray-500">Connecting...</p>
            ) : onlineMembers.length === 0 ? (
                <p className="text-sm text-gray-500">No members online</p>
            ) : (
                <div className="flex flex-col gap-2">
                    {onlineMembers.map((member) => (
                        <div
                            key={member.userId}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <Avatar className="w-8 h-8">
                                <AvatarFallback className="text-xs">
                                    {member.username.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                <span className="text-sm font-medium">{member.username}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default OnlineMembers
