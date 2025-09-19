import React from "react";
import CreateChatRoomDialog from "./CreateChatRoomDialog";

function CreateChatRoom() {
	return (
		<div className="flex flex-col gap-4">
			<p>Wanna create your own chat room?</p>
			<CreateChatRoomDialog />
		</div>
	);
}

export default CreateChatRoom;
