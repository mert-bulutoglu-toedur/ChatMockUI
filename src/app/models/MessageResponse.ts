export class MessageResponse{
  content?: string;
  senderId?: number;
  receiverId?: number;
  chatId?: number ;
  isSeen?: boolean;
  sentDate?: string;
  isContentFile?: boolean;
  fileCaption?: string;

}