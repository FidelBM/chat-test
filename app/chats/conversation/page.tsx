import React from "react";

const ConversationPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="font-bold text-2xl">Welcome to the conversation page!</h1>
      <p>Select a conversation to see the messages</p>
    </div>
  );
};

export default ConversationPage;
