import React, { useState } from 'react';
import FormButton from '../controls/buttons/FormButton';
import './ChatForm.scss';

const isMessageEmpty = (textMessage) => {
    return adjustTextMessage(textMessage).length === 0;
}

const adjustTextMessage = (textMessage) => {
    return textMessage.trim();
};

const ChatForm = ({ selectedConversation, userId, rtmClient, conversations, updateConversations, currentUser }) => {
    const [textMessage, setTextMessage] = useState('');
    const disableButton = isMessageEmpty(textMessage);

    let formContents = null;
    let handleFormSubmit = null;

    if (selectedConversation) {
        formContents = (
            <>
                <input 
                    type="text" 
                    placeholder="type a message" 
                    value={textMessage}
                    onChange={ (e) => { setTextMessage(e.target.value); } } />
                <FormButton disabled={ disableButton }>Send</FormButton>
            </>
        );
    
        handleFormSubmit = (e) => {
            e.preventDefault();
            const msgBody = {type: "chat_message", msg: textMessage, senderTitle: currentUser.username}
            rtmClient.sendPeerMessage(selectedConversation.peopleid.toString(), msgBody)
            const currentDate = new Date();
            const messageRow = {
                message: textMessage,
                senderId: parseInt(userId),
                senderTitle: currentUser.username, 
                image: "",
                receiverId: parseInt(selectedConversation.peopleid), 
                createdAt: currentDate.getTime()
            }
            const updatedMessages = [...conversations];
            updatedMessages.push(messageRow);
           
            updateConversations([...conversations, messageRow])
            localStorage.setItem("conversations", JSON.stringify([...conversations, messageRow]));
            if (!isMessageEmpty(textMessage)) {
                setTextMessage('');
            }
        };
    }

    return (
        <form id="chat-form" onSubmit={handleFormSubmit}>
            {formContents}
        </form> 
    );
}

export default ChatForm;