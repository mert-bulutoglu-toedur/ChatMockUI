
export interface ChatsModel
{
    chatId: number;
    lastMessage: string;
    lastMessageDate: string;
    isSeen: boolean;
    senderName: string;
    senderId: number;
    isSeenCount?: number;
    isShowIsSeen: boolean;
    isTyping?: boolean;
}
