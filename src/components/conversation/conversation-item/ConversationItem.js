import React from 'react';
import classNames from 'classnames';
import './ConversationItem.scss';

const ConversationItem = ({ conversation, isActive, onConversationItemSelected }) => {
    const className = classNames('conversation', {
        'active': isActive
    });

    return (
        <div className={className} onClick={() => onConversationItemSelected(conversation)}>
            {conversation.image && <img src={conversation.image} alt={conversation.username} />}
            {!conversation.image && <span className="name_initial" > {String(conversation.username).charAt(0).toUpperCase()} </span>}
            <div className="title-text">{conversation.username}</div>
        </div>
    );
}

export default ConversationItem;