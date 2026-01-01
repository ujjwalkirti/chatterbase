type ChatRoomType = 'private' | 'group' | 'anonymous';

interface ChatRoom {
    id: string;
    _id?: string;
    name: string;
    type: ChatRoomType;
    createdAt: string;
    updatedAt: string;
    lastMessageContent?: string;
    participantCount?: number;
}

interface Message {
    senderId: string;
    senderUsername?: string;
    message: string;
    roomId: string;
    type?: 'user' | 'system';
    timestamp?: string;
}

interface OnlineMember {
    userId: string;
    username: string;
    roomId: string;
}

interface User {
    id: string;
    username: string;
    dob: string;
    gender: string;
    ip_address: string;
    createdAt: string;
    updatedAt: string;
}
