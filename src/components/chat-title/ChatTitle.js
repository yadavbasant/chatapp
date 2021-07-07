import React from 'react';
import './ChatTitle.scss';

const ChatTitle = ({ selectedConversation, setSelectedUser }) => {
    let chatTitleContents = null;

    if (selectedConversation) {
        chatTitleContents = (
            <>
                <span>{ selectedConversation.username }</span>
                <div className="cross_button" onClick={ () => { setSelectedUser(null); } } title="Delete Conversation">
                   X
                </div>
            </>
        );
    }

    return (
        <div id="chat-title">
            { chatTitleContents }
        </div>
    );
}

export default ChatTitle;