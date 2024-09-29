
export interface ChatsModel
{
    chatId: string;
    lastMessage: string;
    lastMessageDate: string;
    isSeen: boolean;
    senderName: string;
    senderPhoto: string;
    senderId: string;
    isSeenCount: number;
    isShowIsSeen: boolean;
    isTyping: boolean;
}
