import React from 'react';
import Button from '../controls/buttons/Button';
import './ChatTitle.scss';

const ChatTitle = ({ selectedConversation, setSelectedUser, setEnableVideoCall, rtmClient, currentUser }) => {
    let chatTitleContents = null;

    const sendCallMessage = async () => {
        setEnableVideoCall(true)
        const msgBody = {type: "call_message", callerTitle: currentUser.username}
        const ackMessage = await rtmClient.sendPeerMessage(selectedConversation.peopleid.toString(), msgBody)
        console.log("===================ack", ackMessage);
    }

    if (selectedConversation) {
        chatTitleContents = (
            <>
                
                <span>{ selectedConversation.username }</span>
                <div className="cross_button" onClick={ () => { setSelectedUser(null); } } title="Delete Conversation">
                   X
                </div>
                <span><button className="call_button" onClick={ () => { sendCallMessage() } } >Start</button></span>
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