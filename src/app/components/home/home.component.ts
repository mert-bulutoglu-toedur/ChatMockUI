import {CommonModule} from '@angular/common';
import {Component, OnDestroy, OnInit} from '@angular/core';
import {ChatModel} from '../../models/ChatModel';
import {HttpClient} from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import {FormsModule} from '@angular/forms';
import {UserModel} from "../../models/UserModel";
import {ChatsModel} from "../../models/ChatsModel";
import {Router} from "@angular/router";
import {Response} from "../../models/Response";
import {SendMessageModel} from "../../models/SendMessageModel";
import {MessageResponse} from "../../models/MessageResponse";

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  usersForSelection: UserModel[] = [];
  chats: ChatsModel[] = [];
  messages: ChatModel[] = [];
  selectedChatId: any; // chatId ---> number
  selectedUser: any; // userId ---> number
  selectedUserForSelection: UserModel = new UserModel();
  selectedChat: ChatModel = new ChatModel();
  currentUser = new UserModel();
  hub: signalR.HubConnection | undefined;
  message: string = "";
  searchTerm: string = "";
  typingStatus: Map<string, boolean> = new Map<string, boolean>();
  isTyping: boolean = false;
  typingTimeout: any;

  newMessage: SendMessageModel = {
    chatId: '',
    content: '',
    isContentFile: false,
    fileCaption: '',
    file: null,
    senderId: '',
    receiverId: 0,
    sentDate: '',
    isSeen: false
  };

  notification: ChatsModel = {
    chatId: '',
    lastMessage: '',
    lastMessageDate: '',
    isSeen: false,
    senderName: '',
    senderPhoto: '',
    senderId: '',
    isSeenCount: 0,
    isShowIsSeen: false,
    isTyping: false
  };

  showNotification = false;


  constructor(private http: HttpClient, private router: Router) {
    const token = localStorage.getItem('accessToken');
    console.log(token);

    if (token) {
      try {
        const tokenParts = token.split('.');

        if (tokenParts.length !== 3) {
          throw new Error('Invalid token format');
        }

        const payload = tokenParts[1];
        const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        const user = JSON.parse(decodedPayload);
        const userId = user['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
        console.log(userId);
        this.http.get<Response<UserModel>>("https://localhost:7187/v1/users/" + userId)
          .subscribe(res => {
            console.log(res);
            this.currentUser = res.data;
          }, err => {
            console.error(err);
          });

        console.log(this.currentUser);

      } catch (error) {
        console.error('Error decoding token:', error);
      }
    } else {
      console.error('No access token found');
      this.currentUser.id = '';
    }

    this.hub = new signalR.HubConnectionBuilder().withUrl("https://localhost:7187/toedurHub", {
      transport: signalR.HttpTransportType.WebSockets,
    })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.hub.serverTimeoutInMilliseconds = 100000;

    console.log(this.hub);
    this.hub.start().then(() => {


      this.getChatsBelongToUser();


      this.hub?.invoke("Connect", this.currentUser.id);


      this.hub?.on("UserLastInfo", (res: UserModel) => {
        if (this.selectedUser && this.selectedUser === res.id) {
          this.selectedUserForSelection = res;
        }
      });

      this.hub?.on("ReceiveMessage", (res: MessageResponse) => {
        console.log(res);
        if (res.senderId === this.selectedUser) {
          this.messages.push(res);
        }
      });

      this.hub?.on("ReceiveUpdatedMessages", (res: MessageResponse) => {

        console.log("ReceiveUpdatedMessages",res);

        if (res) {
          this.messages.forEach(m => {
            if (m.chatId === res.chatId && !m.isSeen) {
              m.isSeen = true;
            }
          });

          this.chats.forEach(c => {
            if (c.chatId === res.chatId) {
              c.isSeen = true;
            }
          });
        }
      });

      this.hub?.on("FreshChats", (res: ChatsModel[]) => {


        this.chats = res.sort((a: ChatsModel, b: ChatsModel) => {
          return new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime();
        });
        console.log("FreshChats",res);

      });

      this.hub?.on("ReceiveTyping", (senderId: string, isTyping: boolean) => {
        this.typingStatus.set(senderId, isTyping);

        this.chats.forEach(c => {
          if (c.senderId === senderId) {
            c.isTyping = isTyping;
          }
        });
      });

      this.hub?.on("ReceiveNotification", (res: ChatsModel) => {
        console.log(res);
        this.notification = res;
        this.showNotification = true;

        setTimeout(() => {
          this.showNotification = false;
        }, 5000);
      });


    });
  }

  ngOnInit() {

  }

  hideNotification(): void {
    this.showNotification = false;
  }

  onTyping() {
    // Check if the input field is empty
    if (!this.message || this.message.trim() === '') {
      this.onStopTyping();  // Stop typing if the field is empty
      return;
    }

    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    this.hub?.invoke("IsConnectedUserTyping", this.currentUser.id, this.selectedUserForSelection.id);

    // Set a timeout to automatically stop typing after 3 seconds of inactivity
    this.typingTimeout = setTimeout(() => {
      console.log('Stopped typing');
      this.onStopTyping();
    }, 3000);
  }

  onStopTyping() {
    console.log('Stopped typing');
    clearTimeout(this.typingTimeout);
    this.typingStatus.set(this.currentUser.id, false);
    this.hub?.invoke("IsConnectedUserNotTyping", this.currentUser.id, this.selectedUserForSelection.id);
  }

  ngOnDestroy() {
    if (this.hub && this.currentUser.id) {
      this.hub.invoke("UserDisconnectChat", this.currentUser.id).catch(err => console.error(err));
    }
  }

  getChatsBelongToUser() {
    this.http.get<Response<ChatsModel[]>>("https://localhost:7187/v1/message/users/" + this.currentUser.id + "/chats")
      .subscribe(res => {
        console.log(res);

        if (res.success)
        {
          this.chats = res.data.sort((a, b) => {
            return new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime();
          });
        }

       // this.selectChat(res.data[0].chatId);
      }, err => {
        console.error(err);
      });
  }

  searchUsers() {
    this.http.get<Response<UserModel[]>>(
      `https://localhost:7187/v1/message/users/search/${this.searchTerm}`
    ).subscribe(res => {
      this.usersForSelection = res.data;
    }, err => {
      console.error(err);
    });
  }

  startNewChat(user: UserModel) {
    this.selectedUser = user.id;
    console.log(this.chats)
    if (this.chats.find(c => c.senderName === user.nameSurname)) {
      this.selectedChatId = this.chats.find(c => c.senderName === user.nameSurname)?.chatId;
      this.selectChat(this.selectedChatId);
      return

    }
    this.selectedChatId = 0;
    this.selectedUserForSelection = user;

    // Start new chat
    this.selectedChat = new ChatModel();
    this.selectedChat.senderId = this.currentUser.id;
    this.selectedChat.receiverId = this.selectedUser;
    this.selectedChat.content = ""; // left blank, user will write the message
    this.selectedChat.chatId = '';
    this.selectedChat.sentDate = new Date().toLocaleString();
    this.selectedChat.isSeen = false;


    this.messages = [];
    // Start chat
    this.hub?.invoke("UserConnectChat", this.selectedChatId, this.currentUser.id)
      .then(() => {
        // when chat is started, get the chat id and select the chat
        this.selectChat(this.selectedChatId);
      });
  }

  selectChat(chatId: any) {
    console.log(chatId);
    this.selectedChatId = chatId;



    if (this.selectedChatId === 0) {
      // Start new chat
      this.selectedChat = new ChatModel();
      this.selectedChat.senderId = this.currentUser.id;
      this.selectedChat.receiverId = this.selectedUser;
      this.selectedChat.content = ""; // left blank, user will write the message
      this.selectedChat.chatId = "";
      this.selectedChat.sentDate = new Date().toLocaleString();
      this.selectedChat.isSeen = false;
      this.selectedChat.isContentFile = false;
      this.selectedChat.fileCaption = "";

      // Start Chat
      this.hub?.invoke("UserConnectChat", this.selectedChatId, this.currentUser.id);



      this.http.get<Response<UserModel>>(
        `https://localhost:7187/v1/message/users/${this.selectedUser}/status`
      ).subscribe(res => {
        console.log(res);
        this.selectedUserForSelection = res.data;
      }, err => {
        console.error(err);
      });


    } else {
      // Open existing chat
      if (this.selectedChatId) {
        this.hub?.invoke("UserDisconnectChat", this.currentUser.id);
      }

      this.hub?.invoke("UserConnectChat", chatId, this.currentUser.id);


      this.http.get<Response<ChatModel[]>>("https://localhost:7187/v1/message/chats/" + chatId + "/messages")
        .subscribe(res => {
          this.messages = res.data;

          if (res.data[0] && res.data[0].senderId && this.currentUser.id === res.data[0].senderId) {
            this.selectedUser = res.data[0].receiverId;
          } else {
            this.selectedUser = res.data[0].senderId;
          }


          this.http.get<Response<UserModel>>(
            `https://localhost:7187/v1/message/users/${this.selectedUser}/status`
          ).subscribe(res => {
            this.selectedUserForSelection = res.data;
            console.log(this.selectedUserForSelection)
            console.log(this.currentUser);
            console.log(this.currentUser);

          }, err => {
            console.error(err);
          });

          this.http.patch<Response<MessageResponse>>(
            `https://localhost:7187/v1/message/chats/${this.selectedChatId}/seen/${this.currentUser.id}`,
            {} // Pass an empty body since the backend doesn't require a payload
          ).subscribe(
            res => {
              this.messages.forEach(m => {
                if (m.senderId !== this.currentUser.id && !m.isSeen) {
                  m.isSeen = true;
                }
              });
            },
            err => {
              console.error(err);
            }
          );
        });


      this.hub?.invoke("UpdateCurrentMessageSeen", chatId, this.currentUser.id);
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    console.log(file);
    if (file) {
      this.newMessage.file = file;
      this.newMessage.isContentFile = true;
      this.message = "";
    }
  }

  sendMessage() {
    if (this.message.trim() || this.newMessage.isContentFile) {
      // Set message details
      this.newMessage.chatId = this.selectedChatId;
      this.newMessage.content = this.message;
      this.newMessage.senderId = this.currentUser.id;
      this.newMessage.receiverId = this.selectedUser;
      this.newMessage.sentDate = new Date().toISOString();
      this.newMessage.isSeen = false;

      const formData = new FormData();

      // Append the message details to FormData
      formData.append('chatId', this.newMessage.chatId);
      formData.append('content', this.newMessage.content || '');
      formData.append('senderId', this.newMessage.senderId.toString());
      formData.append('receiverId', this.newMessage.receiverId.toString());
      formData.append('sentDate', this.newMessage.sentDate);
      formData.append('isSeen', this.newMessage.isSeen.toString());

      // If it's a file message, append the file
      if (this.newMessage.isContentFile && this.newMessage.file) {
        formData.append('file', this.newMessage.file);
        formData.append('isContentFile', 'true');
        formData.append('fileCaption', this.newMessage.fileCaption || '');
      }

      // Send the formData as the body of the request
      this.http.post<Response<ChatModel>>("https://localhost:7187/v1/message", formData)
        .subscribe(response => {
          console.log('Message sent successfully:', response);
          this.selectedChatId = response.data.chatId;
          this.messages.push(response.data);

          this.message = '';

          // Clear the file input field
          this.newMessage.file = null;
          this.newMessage.isContentFile = false;
          this.newMessage.fileCaption = '';

        }, error => {
          console.error('Error sending message:', error);
        });

      this.hub?.invoke("IsConnectedUserNotTyping", this.currentUser.id, this.selectedUser);

    }
  }

  logout() {
    localStorage.clear();
    document.location.reload();
  }

  protected readonly Number = Number;
}
