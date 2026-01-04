import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';
import { Chat, Message, User, ROLES } from '../../types';
import { ChatBubbleIcon, XIcon, ArrowLeftIcon, PlusIcon, PaperAirplaneIcon, TrashIcon, SpinnerIcon } from '../icons';

// --- SUB-COMPONENTS ---

interface ChatListViewProps {
    chats: Chat[];
    onSelectChat: (chat: Chat) => void;
    onNewChat: () => void;
    isLoading: boolean;
    onChatCreated: (chat: Chat) => void;
    onChatDeleted: (chatId: number) => void;
    getChatDisplayName: (chat: Chat, user: any) => string;
}

/* FIX: Added missing ChatListView sub-component */
const ChatListView: React.FC<ChatListViewProps> = ({ chats, onSelectChat, onNewChat, isLoading, onChatDeleted, getChatDisplayName }) => {
    const { user } = useAuth();

    const handleDeleteChat = async (e: React.MouseEvent, chatId: number) => {
        e.stopPropagation();
        if (window.confirm('¿Eliminar este chat?')) {
            try {
                await apiService.deleteChat(chatId);
                onChatDeleted(chatId);
            } catch (error) {
                console.error(error);
                alert("No se pudo eliminar el chat.");
            }
        }
    };

    if (isLoading) return <div className="flex justify-center p-8"><SpinnerIcon className="w-8 h-8 text-primary" /></div>;

    return (
        <div className="flex flex-col h-full bg-background/30">
            <div className="p-3 border-b border-border bg-surface flex justify-between items-center">
                <span className="text-sm font-bold text-text-secondary">Tus Conversaciones</span>
                <button onClick={onNewChat} className="text-primary hover:text-accent p-1 rounded-full hover:bg-background" title="Nuevo Grupo">
                    <PlusIcon className="w-6 h-6" />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto">
                {chats.length === 0 ? (
                    <div className="p-8 text-center text-text-tertiary">No tienes chats activos.</div>
                ) : (
                    <ul className="divide-y divide-border">
                        {chats.map(chat => (
                            <li 
                                key={chat.chatID} 
                                onClick={() => onSelectChat(chat)}
                                className="p-3 hover:bg-white cursor-pointer transition-colors flex justify-between items-center group"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-text-primary truncate">{getChatDisplayName(chat, user!)}</p>
                                    <p className="text-xs text-text-tertiary truncate">
                                        {chat.isGroupChat ? `${chat.participants.length} participantes` : 'Chat Individual'}
                                    </p>
                                </div>
                                <button 
                                    onClick={(e) => handleDeleteChat(e, chat.chatID)}
                                    className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-danger p-1 transition-opacity"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

interface ChatViewProps {
    chat: Chat;
}

/* FIX: Added missing ChatView sub-component */
const ChatView: React.FC<ChatViewProps> = ({ chat }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchMessages = useCallback(async () => {
        try {
            const data = await apiService.getChatMessages(chat.chatID);
            setMessages(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [chat.chatID]);

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000); // Polling for new messages
        return () => clearInterval(interval);
    }, [fetchMessages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;

        const content = newMessage.trim();
        setNewMessage('');

        try {
            const msg = await apiService.sendMessage({
                ChatID: chat.chatID,
                SenderID: user.userId,
                Content: content
            });
            setMessages(prev => [...prev, msg]);
        } catch (error) {
            console.error(error);
            alert("Error al enviar el mensaje.");
        }
    };

    if (isLoading) return <div className="flex justify-center p-8"><SpinnerIcon className="w-8 h-8 text-primary" /></div>;

    return (
        <div className="flex flex-col h-full bg-background/10">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => {
                    const isOwn = msg.senderID === user?.userId;
                    return (
                        <div key={msg.messageID} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-lg shadow-sm ${isOwn ? 'bg-primary text-text-on-primary rounded-tr-none' : 'bg-surface text-text-primary rounded-tl-none border border-border'}`}>
                                {!isOwn && <p className="text-[10px] font-bold text-accent mb-1 uppercase">{msg.sender?.userName}</p>}
                                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                <p className={`text-[10px] mt-1 text-right ${isOwn ? 'text-white/60' : 'text-text-tertiary'}`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSend} className="p-3 bg-surface border-t border-border flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 p-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
                <button type="submit" disabled={!newMessage.trim()} className="bg-primary text-text-on-primary p-2 rounded-lg hover:bg-opacity-90 disabled:bg-secondary">
                    <PaperAirplaneIcon className="w-5 h-5" />
                </button>
            </form>
        </div>
    );
};

interface NewChatViewProps {
    onCancel: () => void;
    onChatCreated: (chat: Chat) => void;
}

/* FIX: Added missing NewChatView sub-component */
const NewChatView: React.FC<NewChatViewProps> = ({ onCancel, onChatCreated }) => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
    const [groupName, setGroupName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async () => {
        if (!searchTerm.trim() || !user) return;
        setIsSearching(true);
        try {
            const result = await apiService.globalSearch(user.schoolId, user.userId, searchTerm);
            setUsers(result.users.filter(u => u.userID !== user.userId));
        } catch (error) {
            console.error(error);
        } finally {
            setIsSearching(false);
        }
    };

    const toggleUser = (userId: number) => {
        setSelectedUserIds(prev => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    const handleCreate = async () => {
        if (!user || selectedUserIds.size === 0 || !groupName.trim()) return;
        setIsLoading(true);
        try {
            const newChat = await apiService.createGroupChat({
                SchoolID: user.schoolId,
                ChatName: groupName.trim(),
                UserIDs: [user.userId, ...Array.from(selectedUserIds)]
            });
            onChatCreated(newChat);
        } catch (error) {
            console.error(error);
            alert("Error al crear el grupo.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background/10 p-4 space-y-4">
            <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Nombre del Grupo</label>
                <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Ej. Coordinación Académica"
                    className="w-full p-2 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
            </div>
            <div className="flex-1 flex flex-col min-h-0">
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Participantes</label>
                <div className="flex gap-2 mb-2">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por nombre o email..."
                        className="flex-1 p-2 border border-border rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button onClick={handleSearch} className="bg-background border border-border p-2 rounded-lg hover:bg-border">
                        {isSearching ? <SpinnerIcon className="w-5 h-5" /> : 'Buscar'}
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto border border-border rounded-lg bg-surface divide-y divide-border">
                    {users.map(u => (
                        <label key={u.userID} className="flex items-center p-3 hover:bg-background cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedUserIds.has(u.userID)}
                                onChange={() => toggleUser(u.userID)}
                                className="h-4 w-4 text-primary focus:ring-accent border-border rounded mr-3"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text-primary truncate">{u.userName}</p>
                                <p className="text-xs text-text-tertiary truncate">{u.email}</p>
                            </div>
                        </label>
                    ))}
                    {users.length === 0 && !isSearching && (
                        <p className="p-4 text-center text-xs text-text-tertiary italic">Busca usuarios para añadir al grupo.</p>
                    )}
                </div>
            </div>
            <div className="flex gap-2 pt-2">
                <button onClick={onCancel} className="flex-1 py-2 bg-background border border-border rounded-lg hover:bg-border font-semibold">Cancelar</button>
                <button 
                    onClick={handleCreate} 
                    disabled={isLoading || selectedUserIds.size === 0 || !groupName.trim()} 
                    className="flex-1 py-2 bg-primary text-text-on-primary rounded-lg hover:bg-opacity-90 disabled:bg-secondary font-bold"
                >
                    {isLoading ? 'Creando...' : 'Crear Grupo'}
                </button>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

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
    // MODIFICACIÓN: Ocultar para padres (3) y estudiantes (1)
    if (user.roleId === 3 || user.roleId === 1) return null; 

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

export default ChatWidget;