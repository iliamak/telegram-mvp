import { useState } from 'react';
import Auth from './components/Auth';
import ChatList from './components/ChatList';
import Chat from './components/Chat';

function App() {
  const [client, setClient] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);

  const handleAuthentication = (tdClient) => {
    setClient(tdClient);
    setIsAuthenticated(true);
  };

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
  };

  const handleBackToList = () => {
    setSelectedChat(null);
  };

  if (!isAuthenticated) {
    return <Auth onAuthenticated={handleAuthentication} />;
  }

  if (selectedChat) {
    return (
      <Chat 
        client={client} 
        chat={selectedChat} 
        onBack={handleBackToList} 
      />
    );
  }

  return (
    <ChatList 
      client={client} 
      onChatSelect={handleChatSelect} 
    />
  );
}

export default App;