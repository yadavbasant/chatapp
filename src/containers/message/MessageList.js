import React from 'react';
import Message from '../../components/message/Message';
import './MessageList.scss';

const MessageList = ({ messages }) => {
    let messageItems = null;
    const userId = parseInt(localStorage.getItem("userId"))
    if (messages && messages.length > 0) {
        messageItems = messages.map((message, index) => {
            return <Message 
                key={index}
                isMyMessage={message.senderId === userId}
                message={message} />;
        });
    }

    return (
        <div id="chat-message-list">
            {messageItems}
        </div>
    );
}



export default MessageList;