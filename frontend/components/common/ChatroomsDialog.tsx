'use client'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { getAllChatRooms } from "@/utils/functions/chatrooms";
import { PlusCircleIcon } from "lucide-react";

import React from 'react'
import { Button } from "../ui/button";
import { toast } from "sonner";

function ChatroomsDialog() {
    const [chatrooms, setChatRooms] = React.useState<ChatRoom[]>([]);
    React.useEffect(() => {
        getAllChatRooms().then((rooms) => {
            setChatRooms(rooms);
        }).catch((error) => {
            console.error("Error fetching chat rooms:", error);
            setChatRooms([]);
        })
    }, []);

    const onEnterChatroom = (chatroomId: string) => {
        // Logic to enter the chatroom
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chatroom/enter`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('chatter_base_token')}` || '',
            },
            body: JSON.stringify({ chatroomId }),
        }).then((response) => {
            if (!response.ok) {
                console.error("Failed to enter chatroom");
                toast.error("Failed to enter chatroom. Please try again.");
            }
        }).catch((error) => {
            console.error("Error entering chatroom:", error);
            toast.error("Failed to enter chatroom. Please try again.");
        });
    }
    return (
        <Dialog>
            <DialogTrigger asChild><Button variant={'secondary'}>
                Chatrooms</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Available Chatrooms</DialogTitle>
                    <DialogDescription>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 w-full mt-4">
                            {chatrooms.map((chatroom) => {
                                return (
                                    <Button onClick={() => onEnterChatroom(chatroom._id)} key={chatroom._id} className="mx-auto border border-accent-foreground border-md hover:shadow-md hover:scale-105 duration-150 transition-all p-3 flex items-center justify-between gap-2 w-full">
                                        {chatroom.name} ({chatroom.participantCount ? chatroom.participantCount : 0}) <PlusCircleIcon />
                                    </Button>
                                );
                            })}
                        </div>
                    </DialogDescription>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    )
}

export default ChatroomsDialog