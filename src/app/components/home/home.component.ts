import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ChatModel } from '../../models/ChatModel';
import { HttpClient } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { FormsModule } from '@angular/forms';
import { UserModel } from "../../models/UserModel";
import { ChatsModel } from "../../models/ChatsModel";
import { Router } from "@angular/router";
import { Response } from "../../models/Response";

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
  selectedChatId: any;
  selectedUser: any;
  selectedUserForSelection: UserModel = new UserModel();
  selectedChat: ChatModel = new ChatModel();
  user = new UserModel();
  hub: signalR.HubConnection | undefined;
  message: string = "";
  searchTerm: string = "";
  typingStatus: Map<number, boolean> = new Map<number, boolean>();
  isTyping: boolean = false;
  typingTimeout: any;


  constructor(private http: HttpClient, private router: Router) {
    const token = localStorage.getItem('accessToken');

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
        this.http.get<Response<UserModel>>("https://localhost:7187/api/v1/user/GetUserById/" + userId)
          .subscribe(res => {
            console.log(res);
            this.user = res.data;
          }, err => {
            console.error(err);
          });

        console.log(this.user);

      } catch (error) {
        console.error('Error decoding token:', error);
      }
    } else {
      console.error('No access token found');
      this.user.id = 0;
    }

    this.hub = new signalR.HubConnectionBuilder().withUrl("https://localhost:7187/messageHub").build();

    console.log(this.hub);
    this.hub.start().then(() => {
      this.getChatsBelongToUser();


      this.hub?.invoke("Connect", parseInt(this.user.id.toString()));


      this.hub?.on("UserLastInfo", (res: UserModel) => {
        if (this.selectedUser && this.selectedUser === res.id) {
          this.selectedUserForSelection = res;
        }
      });

      this.hub?.on("ReceiveMessage", (res: ChatModel) => {
        if (res.senderId === this.selectedUser) {
          this.messages.push(res);
        }
      });

      this.hub?.on("ReceiveUpdatedMessages", (res: any) => {
        if (res.data) {
          this.messages.forEach(m => {
            if (m.chatId === res.data.chatId && !m.isSeen) {
              m.isSeen = true;
            }
          });

          this.chats.forEach(c => {
            if (c.chatId === res.data.chatId) {
              c.isSeen = true;
            }
          });


        }
      });

      this.hub?.on("FreshChats", (res: ChatsModel[]) => {
        this.chats = res.sort((a: ChatsModel, b: ChatsModel) => {
          return new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime();
        });
      });

      this.hub?.on("ReceiveTyping", (senderId : number, isTyping: boolean) => {
          this.typingStatus.set(senderId, isTyping);

          this.chats.forEach(c => {
            if (c.senderId === senderId) {
              c.isTyping = isTyping;
            }
          });
      });


    });
  }

  ngOnInit() {

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

    this.hub?.invoke("IsConnectedUserTyping", this.user.id, this.selectedUserForSelection.id);

    // Set a timeout to automatically stop typing after 3 seconds of inactivity
    this.typingTimeout = setTimeout(() => {
      console.log('Stopped typing');
      this.onStopTyping();
    }, 3000);
  }

  onStopTyping() {
    console.log('Stopped typing');
    clearTimeout(this.typingTimeout);
    this.typingStatus.set(this.user.id, false);
    this.hub?.invoke("IsConnectedUserNotTyping", this.user.id, this.selectedUserForSelection.id);
  }

  ngOnDestroy() {
    if (this.hub && this.user.id) {
      this.hub.invoke("UserDisconnectChat", this.user.id).catch(err => console.error(err));
    }
  }

  getChatsBelongToUser() {
    this.http.get<Response<ChatsModel[]>>("https://localhost:7187/api/v1/message/GetChatsByUserId/" + this.user.id)
      .subscribe(res => {

        this.chats = res.data.sort((a, b) => {
          return new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime();
        });
        this.selectChat(res.data[0].chatId);
      }, err => {
        console.error(err);
      });
  }

  searchUsers() {
    this.http.get<Response<UserModel[]>>(
      `https://localhost:7187/api/v1/message/GetUserBySearchTerm/${this.searchTerm}`
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
    this.selectedChat.senderId = this.user.id;
    this.selectedChat.receiverId = this.selectedUser;
    this.selectedChat.content = ""; // left blank, user will write the message
    this.selectedChat.chatId = 0;
    this.selectedChat.sentDate = new Date().toLocaleString();
    this.selectedChat.isSeen = false;


    this.messages = [];
    // Start chat
    this.hub?.invoke("UserConnectChat", this.selectedChatId, this.user.id)
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
      this.selectedChat.senderId = this.user.id;
      this.selectedChat.receiverId = this.selectedUser;
      this.selectedChat.content = ""; // left blank, user will write the message
      this.selectedChat.chatId = 0;
      this.selectedChat.sentDate = new Date().toLocaleString();
      this.selectedChat.isSeen = false;

      // Start Chat
      this.hub?.invoke("UserConnectChat", this.selectedChatId, this.user.id);

      this.http.get<Response<UserModel>>(
        `https://localhost:7187/api/v1/message/IsUserOnline/${this.selectedUser}`
      ).subscribe(res => {
        console.log(res);
        this.selectedUserForSelection = res.data;
      }, err => {
        console.error(err);
      });


    } else {
      // Open existing chat
      if (this.selectedChatId) {
        this.hub?.invoke("UserDisconnectChat", this.user.id);
      }

      this.hub?.invoke("UserConnectChat", chatId, this.user.id);



      this.http.get<Response<ChatModel[]>>("https://localhost:7187/api/v1/message/GetMessagesByChatId/" + chatId)
        .subscribe(res => {
          this.messages = res.data;

          if (res.data[0] && res.data[0].senderId && this.user.id === res.data[0].senderId) {
            this.selectedUser = res.data[0].receiverId;
          } else {
            this.selectedUser = res.data[0].senderId;
          }


          this.http.get<Response<UserModel>>(
            `https://localhost:7187/api/v1/message/IsUserOnline/${this.selectedUser}`
          ).subscribe(res => {
            this.selectedUserForSelection = res.data;
            console.log(this.selectedUserForSelection)
            console.log(this.user);


          }, err => {
            console.error(err);
          });

          this.http.get<Response<UserModel>>(
            `https://localhost:7187/api/v1/message/UpdateLastMessageSeenStatusByChatId/${this.selectedChatId}?receiverId=${this.user.id}`
          ).subscribe(
            res => {
              this.messages.forEach(m => {
                if (m.senderId !== this.user.id && !m.isSeen) {
                  m.isSeen = true;
                }
              });
            },
            err => {
              console.error(err);
            }
          );
        }, err => {
          console.error(err);
        });




      this.hub?.invoke("UpdateCurrentMessageSeen", chatId, this.user.id);
    }
  }

  sendMessage() {
    if (this.message.trim()) {
      const newMessage = {
        chatId: this.selectedChatId,
        content: this.message,
        senderId: this.user.id,
        receiverId: this.selectedUser,
        sentDate: new Date(),
        isSeen: false
      };

      this.http.post<Response<ChatModel>>("https://localhost:7187/api/v1/message/SendMessage", newMessage)
        .subscribe(
          res => {
            this.messages.push(res.data);
            this.message = ""; // Mesaj giriş alanını temizle
            this.hub?.invoke("NotifyChatUpdates", this.user.id, this.selectedUser);
            this.selectedChatId = res.data.chatId;
          },
          err => {
            console.error(err);
          }
        );

      this.hub?.invoke("IsConnectedUserNotTyping", this.user.id, this.selectedUser);

    }


  }

  logout() {
    localStorage.clear();
    document.location.reload();
  }

  protected readonly Number = Number;
}
