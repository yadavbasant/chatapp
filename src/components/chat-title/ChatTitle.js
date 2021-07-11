import React from 'react';
import Button from '../controls/buttons/Button';
import './ChatTitle.scss';

const ChatTitle = ({ selectedConversation, setSelectedUser, setEnableVideoCall }) => {
    let chatTitleContents = null;

    if (selectedConversation) {
        chatTitleContents = (
            <>
                
                <span>{ selectedConversation.username }</span>
                <div className="cross_button" onClick={ () => { setSelectedUser(null); } } title="Delete Conversation">
                   X
                </div>
                <span><button className="call_button" onClick={ () => { setEnableVideoCall(true) } } >Start</button></span>
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