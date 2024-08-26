export interface SendMessageModel
{
  chatId: number;
  content: string;
  isContentFile: boolean;
  fileCaption: string;
  file: any;
  senderId: number;
  receiverId: number;
  sentDate: string;
  isSeen: boolean;
}

