import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';
import { Chat, Message, User, ROLES } from '../../types';
import { ChatBubbleIcon, XIcon, ArrowLeftIcon, PlusIcon, PaperAirplaneIcon, TrashIcon } from '../icons';

const ChatWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'list' | 'chat' | 'new'>('list');
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [chats, setChats] = useState<Chat[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useAuth();

    const fetchChats = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const userChats = await apiService.getUserChats(user.userId);
            setChats(userChats);
        } catch (error) {
            console.error("Failed to fetch chats", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (isOpen && user) {
            fetchChats();
        }
    }, [isOpen, user, fetchChats]);

    const handleSelectChat = (chat: Chat) => {
        setSelectedChat(chat);
        setView('chat');
    };
    
    const handleChatCreated = (newChat: Chat) => {
        // Add new chat to the list and avoid duplicates
        setChats(prev => {
            if (prev.some(c => c.chatID === newChat.chatID)) {
                return prev;
            }
            return [newChat, ...prev];
        });
        handleSelectChat(newChat);
    };

    const handleChatDeleted = (chatId: number) => {
        setChats(prev => prev.filter(c => c.chatID !== chatId));
        setView('list');
    };

    const getChatDisplayName = (chat: Chat, currentUser: User | { userId: number }): string => {
        if (!chat.isGroupChat && chat.participants.length <= 2) {
            const currentUserId = 'userId' in currentUser ? currentUser.userId : currentUser.userID;
            const otherParticipant = chat.participants.find(p => p.userID !== currentUserId);
            return otherParticipant?.user?.userName || chat.name;
        }
        if (chat.name.startsWith("Chat Individual:")) {
            if (!chat.isGroupChat && chat.participants.length <= 2) {
                const currentUserId = 'userId' in currentUser ? currentUser.userId : currentUser.userID;
                const otherParticipant = chat.participants.find(p => p.userID !== currentUserId);
                return otherParticipant?.user?.userName || chat.name;
            }
        }
        return chat.name;
    };
    

    if (!user) return null;

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-primary text-text-on-primary w-16 h-16 rounded-full shadow-lg flex items-center justify-center transform hover:scale-110 transition-transform"
                aria-label="Open chat"
            >
                <ChatBubbleIcon className="w-8 h-8" />
            </button>
        );
    }

    return (
        <div className="fixed inset-0 md:inset-auto md:bottom-6 md:right-6 md:w-96 md:h-[600px] bg-surface md:rounded-lg md:shadow-2xl flex flex-col md:border md:border-border z-50">
            <header className="flex items-center justify-between p-3 border-b border-border bg-header text-text-on-primary md:rounded-t-lg">
                <div className="flex items-center">
                    {view !== 'list' && (
                        <button onClick={() => setView('list')} className="mr-2 p-1 rounded-full hover:bg-white/20">
                            <ArrowLeftIcon className="w-5 h-5"/>
                        </button>
                    )}
                    <h2 className="font-bold text-lg truncate">
                        {view === 'chat' && selectedChat ? getChatDisplayName(selectedChat, user) : view === 'new' ? 'Nuevo Chat Grupal' : 'Chats'}
                    </h2>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-white/20">
                    <XIcon className="w-5 h-5" />
                </button>
            </header>
            <main className="flex-1 overflow-y-auto">
                {view === 'list' && <ChatListView chats={chats} onSelectChat={handleSelectChat} onNewChat={() => setView('new')} isLoading={isLoading} onChatCreated={handleChatCreated} onChatDeleted={handleChatDeleted} getChatDisplayName={getChatDisplayName} />}
                {view === 'chat' && selectedChat && <ChatView chat={selectedChat} />}
                {view === 'new' && <NewChatView onCancel={() => setView('list')} onChatCreated={handleChatCreated} />}
            </main>
        </div>
    );
};

// --- Sub-components kept in the same file for simplicity ---

const ChatListView: React.FC<{
    chats: Chat[],
    onSelectChat: (chat: Chat) => void,
    onNewChat: () => void,
    isLoading: boolean,
    onChatCreated: (chat: Chat) => void,
    onChatDeleted: (chatId: number) => void,
    getChatDisplayName: (chat: Chat, currentUser: User | { userId: number }) => string
}> = ({ chats, onSelectChat, onNewChat, isLoading, onChatCreated, onChatDeleted, getChatDisplayName }) => {
    const { user, hasPermission } = useAuth();
    const isSuperAdmin = useMemo(() => hasPermission([6, 7]), [hasPermission]); // Roles 6 (Admin) and 7 (Super Admin)

    const [activeTab, setActiveTab] = useState<'grupal' | 'individual'>('grupal');
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [isCreatingChat, setIsCreatingChat] = useState(false);

    useEffect(() => {
        if (user && activeTab === 'individual' && allUsers.length === 0) {
            apiService.getUsers(user.schoolId).then(setAllUsers);
        }
    }, [user, activeTab, allUsers.length]);

    const handleDeleteChat = async (e: React.MouseEvent, chatId: number) => {
        e.stopPropagation();
        if (window.confirm('¿Está seguro de que quiere eliminar este chat? Esta acción es permanente y borrará todos los mensajes.')) {
            try {
                await apiService.deleteChat(chatId);
                onChatDeleted(chatId);
            } catch (error) {
                console.error("Failed to delete chat", error);
                alert('No se pudo eliminar el chat.');
            }
        }
    };

    const handleInitiateIndividualChat = async (selectedUser: User) => {
        if (!user) return;

        const existingChat = chats.find(c =>
            !c.isGroupChat &&
            c.participants.length === 2 &&
            c.participants.some(p => p.userID === user.userId) &&
            c.participants.some(p => p.userID === selectedUser.userID)
        );

        if (existingChat) {
            onSelectChat(existingChat);
            return;
        }

        setIsCreatingChat(true);
        try {
            const chatName = `Chat Individual: ${user.userName} + ${selectedUser.userName}`;
            const newChat = await apiService.createGroupChat({
                SchoolID: user.schoolId,
                ChatName: chatName,
                UserIDs: [user.userId, selectedUser.userID]
            });
            onChatCreated(newChat);
        } catch (error) {
            console.error("Failed to create individual chat", error);
        } finally {
            setIsCreatingChat(false);
        }
    };

    const chatsForGroupTab = useMemo(() => {
        if (isSuperAdmin) {
            return chats;
        }
        return chats.filter(c => c.isGroupChat && !c.name.startsWith("Chat Individual:"));
    }, [chats, isSuperAdmin]);
    
    const filteredUsers = useMemo(() => {
        const excludedRoles = new Set([1, 3, 11]); // Students, Parents, Mothers
        return allUsers.filter(u =>
            !excludedRoles.has(u.roleID) &&
            u.userID !== user?.userId &&
            u.userName.toLowerCase().includes(userSearch.toLowerCase())
        );
    }, [allUsers, userSearch, user]);


    return (
        <div>
            <div className="flex border-b">
                <button onClick={() => setActiveTab('grupal')} className={`flex-1 py-2 text-sm font-semibold ${activeTab === 'grupal' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary'}`}>
                    Grupal
                </button>
                <button onClick={() => setActiveTab('individual')} className={`flex-1 py-2 text-sm font-semibold ${activeTab === 'individual' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary'}`}>
                    Individual
                </button>
            </div>

            {activeTab === 'grupal' && (
                <div>
                    <div className="p-2 border-b">
                        <button onClick={onNewChat} className="w-full flex items-center justify-center p-2 text-sm font-semibold bg-primary text-text-on-primary rounded hover:bg-opacity-90">
                            <PlusIcon className="mr-2" /> Nuevo Chat Grupal
                        </button>
                    </div>
                    {isLoading ? <p className="p-4 text-center text-text-secondary">Cargando chats...</p> :
                     chatsForGroupTab.length > 0 ? (
                        <ul>
                            {chatsForGroupTab.map(chat => {
                                const participantsToShow = chat.participants
                                    .map(p => p.user?.userName)
                                    .filter(Boolean) as string[];
                                
                                let participantsText = participantsToShow.slice(0, 3).join(', ');
                                if (participantsToShow.length > 3) {
                                    participantsText += `, y ${participantsToShow.length - 3} más`;
                                }
                                
                                return (
                                    <li key={chat.chatID} onClick={() => onSelectChat(chat)} className="p-3 hover:bg-background cursor-pointer border-b border-border flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-text-primary">{getChatDisplayName(chat, user!)}</p>
                                            <p className="text-sm text-text-secondary truncate">
                                                {participantsText || `${chat.participants.length} participante(s)`}
                                            </p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : <p className="p-4 text-center text-text-secondary">No tienes chats grupales.</p>}
                </div>
            )}
            
            {activeTab === 'individual' && (
                <div>
                    <div className="p-2 border-b">
                        <input
                            type="text"
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            placeholder="Buscar usuario..."
                            className="w-full p-2 border border-border rounded"
                        />
                    </div>
                    {isCreatingChat ? <p className="p-4 text-center text-text-secondary">Iniciando chat...</p> :
                     isLoading ? <p className="p-4 text-center text-text-secondary">Cargando usuarios...</p> :
                     (
                        <ul className="max-h-[450px] overflow-y-auto">
                            {filteredUsers.map(u => (
                                <li key={u.userID} onClick={() => handleInitiateIndividualChat(u)} className="p-3 hover:bg-background cursor-pointer border-b border-border">
                                    <p className="font-semibold text-text-primary">{u.userName}</p>
                                    <p className="text-sm text-text-secondary">{ROLES.find(r => r.id === u.roleID)?.name || 'Usuario'}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

const ChatView: React.FC<{ chat: Chat }> = ({ chat }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const { user } = useAuth();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchMessages = useCallback(async () => {
        try {
            const chatMessages = await apiService.getChatMessages(chat.chatID);
            setMessages(chatMessages);
        } catch (error) {
            console.error("Failed to fetch messages", error);
        }
    }, [chat.chatID]);

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, [fetchMessages]);
    
    useEffect(scrollToBottom, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;

        const tempId = Date.now();
        const optimisticMessage: Message = {
            messageID: tempId,
            chatID: chat.chatID,
            senderID: user.userId,
            content: newMessage,
            timestamp: new Date().toISOString(),
            isRead: false,
            sender: { userID: user.userId, userName: user.userName, email: user.email, isBlocked: false, roleID: user.roleId, schoolID: user.schoolId, cedula: null, phoneNumber: null }
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setNewMessage('');

        try {
            const sentMessage = await apiService.sendMessage({
                ChatID: chat.chatID,
                SenderID: user.userId,
                Content: newMessage
            });
            // Replace optimistic message with the real one from server
            setMessages(prev => prev.map(m => m.messageID === tempId ? sentMessage : m));
        } catch (error) {
            console.error("Failed to send message", error);
            // Remove optimistic message on failure
            setMessages(prev => prev.filter(m => m.messageID !== tempId));
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {messages.map(msg => (
                    <div key={msg.messageID} className={`flex ${msg.senderID === user?.userId ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs p-3 rounded-lg ${msg.senderID === user?.userId ? 'bg-primary text-text-on-primary' : 'bg-background border'}`}>
                            <p className="text-sm font-semibold">{msg.sender?.userName || `Usuario #${msg.senderID}`}</p>
                            <p className="text-sm">{msg.content}</p>
                            <p className="text-xs opacity-70 text-right mt-1">{new Date(msg.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>
                ))}
                 <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-3 border-t flex items-center gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 p-2 border border-border rounded-full bg-background focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
                <button type="submit" className="bg-primary text-text-on-primary rounded-full p-2 hover:bg-opacity-90 disabled:bg-secondary" disabled={!newMessage.trim()}>
                    <PaperAirplaneIcon className="w-5 h-5"/>
                </button>
            </form>
        </div>
    );
};

const NewChatView: React.FC<{ onCancel: () => void, onChatCreated: (chat: Chat) => void }> = ({ onCancel, onChatCreated }) => {
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            apiService.getUsers(user.schoolId).then(setAllUsers);
        }
    }, [user]);

    const handleToggleUser = (userId: number) => {
        setSelectedUserIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(userId)) {
                newSet.delete(userId);
            } else {
                newSet.add(userId);
            }
            return newSet;
        });
    };

    const handleCreateChat = async () => {
        if (!user) return;
        
        const finalUserIds = [user.userId, ...Array.from(selectedUserIds)];

        if (finalUserIds.length < 2) {
            setError('Debe seleccionar al menos un participante para un chat grupal.');
            return;
        }

        const participantNames: string[] = [];
        const userMap = new Map<number, string>(allUsers.map(u => [u.userID, u.userName]));
        if(user) {
            userMap.set(user.userId, user.userName);
        }
    
        finalUserIds.forEach(id => {
            const name = userMap.get(id);
            if(name) {
                participantNames.push(name);
            }
        });
    
        let namesPart = '';
        if (participantNames.length === 1) {
            namesPart = participantNames[0];
        } else if (participantNames.length === 2) {
            namesPart = participantNames.join(' y ');
        } else if (participantNames.length > 2) {
            const allButLast = participantNames.slice(0, -1);
            const last = participantNames[participantNames.length - 1];
            namesPart = `${allButLast.join(', ')} y ${last}`;
        }
        const generatedChatName = `Chat Grupal: ${namesPart}`;

        setIsSubmitting(true);
        setError('');
        try {
            const newChat = await apiService.createGroupChat({
                SchoolID: user.schoolId,
                ChatName: generatedChatName,
                UserIDs: finalUserIds
            });
            onChatCreated(newChat);
        } catch (err: any) {
            setError(err.message || 'Error al crear el chat.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredUsers = useMemo(() => {
        const excludedRoles = new Set([1, 3, 11]);
        return allUsers.filter(u => 
            !excludedRoles.has(u.roleID) &&
            u.userName.toLowerCase().includes(searchTerm.toLowerCase()) && 
            u.userID !== user?.userId
        );
    }, [allUsers, searchTerm, user]);

    return (
        <div className="p-4 space-y-4">
            {error && <p className="text-danger-text bg-danger-light p-2 rounded text-sm">{error}</p>}
            
            <p className="text-sm text-text-secondary">Seleccione los participantes para el nuevo chat grupal. Usted será incluido automáticamente.</p>

            <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar otros participantes..."
                className="w-full p-2 border border-border rounded"
            />
            <div className="h-48 overflow-y-auto border rounded p-2 space-y-1">
                {filteredUsers.map(u => (
                    <label key={u.userID} className="flex items-center p-2 rounded hover:bg-background cursor-pointer">
                        <input
                            type="checkbox"
                            checked={selectedUserIds.has(u.userID)}
                            onChange={() => handleToggleUser(u.userID)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-accent"
                        />
                        <span className="ml-3 text-sm text-text-primary">{u.userName} ({ROLES.find(r => r.id === u.roleID)?.name || 'Usuario'})</span>
                    </label>
                ))}
            </div>
            <div className="flex justify-end gap-2">
                <button onClick={onCancel} className="py-2 px-4 rounded bg-background hover:bg-border">Cancelar</button>
                <button onClick={handleCreateChat} disabled={isSubmitting || selectedUserIds.size === 0} className="py-2 px-4 rounded bg-primary text-text-on-primary hover:bg-opacity-90 disabled:bg-secondary">
                    {isSubmitting ? 'Creando...' : `Crear Chat (${selectedUserIds.size + 1})`}
                </button>
            </div>
        </div>
    );
};

export default ChatWidget;