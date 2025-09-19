import React, { useState } from "react";

interface IndividualMessageBoxProps {
	message: Message;
	isSenderCurrentUser: boolean;
}

function IndividualMessageBox({ message, isSenderCurrentUser }: IndividualMessageBoxProps) {
	const [showMessageDetails, setShowMessageDetails] = useState<boolean>(false);
	return (
		<div className={`flex items-center gap-1  ${isSenderCurrentUser ? " max-w-4/5 self-end flex-row-reverse" : " max-w-4/5 self-start "}`}>
			<p>{message.senderId}</p>
			<p>:</p>
			<div onClick={() => setShowMessageDetails(!showMessageDetails)} className={`break-words px-2`}>
				<p className={`break-words`}>{message.message}</p>
			</div>
		</div>
	);
}

export default IndividualMessageBox;
