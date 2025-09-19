'use server';

async function getAllChatRooms(): Promise<ChatRoom[]> {
    try {
        const res = await fetch(`${process.env.API_URL}/api/chatroom`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await res.json();
        if (data.success) {
            return data.data;
        }
        return [];
    } catch (error) {
        console.log(error);
        return [];
    }
}

export {
    getAllChatRooms
}
