
export interface ChatsModel
{
    chatId: number;
    lastMessage: string;
    lastMessageDate: string;
    isSeen: boolean;
    senderName: string;
    isSeenCount?: number;
    isShowIsSeen: boolean;
}
