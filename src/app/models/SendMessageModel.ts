export interface SendMessageModel
{
  chatId: string;
  content: string;
  isContentFile: boolean;
  fileCaption: string;
  file: any;
  senderId: string;
  receiverId: number;
  sentDate: string;
  isSeen: boolean;
}

