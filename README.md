Chat Application - Frontend Guide
Overview
This chat application was built primarily to facilitate the testing of backend APIs. As a backend developer, I have designed a basic frontend using Angular to demonstrate how various APIs and SignalR hubs interact. This guide will help frontend developers understand which APIs are triggered, the expected responses, and how to utilize them effectively in the UI.


Project Structure
Components

LoginComponent: Handles user authentication and stores tokens.
HomeComponent: Manages chat functionalities, including sending and receiving messages in real-time.
Models

UserLoginModel: Model for user login data.
Token: Model to store access and refresh tokens.
Response<T>: Generic response model wrapping API responses.
UserModel: Represents a user in the system.
ChatModel: Represents individual chat messages.
ChatsModel: Represents chat metadata, including the latest message and status.
Authentication and Token Management
Login Process
The LoginComponent is responsible for authenticating users and storing their tokens.

Example Code:
this.http.post<Response<Token>>("https://localhost:7187/api/v1/auth/login", this.userLoginModel)
  .subscribe({
    next: (res) => {
      console.log(res);
      localStorage.setItem("accessToken", JSON.stringify(res.data.accessToken));
      localStorage.setItem("refreshToken", JSON.stringify(res.data.refreshToken));
      this.router.navigateByUrl("/");
    },
    error: (error) => {
      console.error('An error occurred:', error);
    }
  });

API Endpoint: POST /api/v1/auth/login
Expected Request Payload:
{
  "email": "string",
  "password": "string"
}

Expected Response:
{
  "data": {
    "accessToken": "string",
    "refreshToken": "string"
  },
  "success": true,
  "message": "Login successful"
}

Upon successful login, the tokens are stored in localStorage. These tokens are used to authenticate further requests to the backend APIs.

Real-time Communication with SignalR
The HomeComponent handles real-time communication using SignalR. When the component is initialized, it connects to the SignalR hub and subscribes to various events.

SignalR Connection
this.hub = new signalR.HubConnectionBuilder().withUrl("https://localhost:7187/messageHub").build();

this.hub.start().then(() => {
  this.getChatsBelongToUser();
  this.hub?.invoke("Connect", parseInt(this.user.id.toString()));
  this.registerHubEvents();
});

Hub Events and Their Purposes
ReceiveUsers:

Triggered when the list of users is updated.
Model Returned: UserModel[]
Usage: Updates the list of available users to start new chats with.
UserLastInfo:

Triggered when the last activity information of a user is updated.
Model Returned: UserModel
Usage: Updates the selected user's last active status in the UI.
ReceiveMessage:

Triggered when a new message is received in a chat.
Model Returned: ChatModel
Usage: Adds the received message to the current chat.
ReceiveUpdatedMessages:

Triggered when message status (like seen/unseen) is updated.
Model Returned: Any (containing chatId and other related data)
Usage: Updates message statuses in the chat.
FreshChats:

Triggered when the chat list needs to be refreshed.
Model Returned: ChatsModel[]
Usage: Updates the list of chats, typically when a new chat is started or a new message is received.
Sending Messages
Messages are sent via the sendMessage() method in HomeComponent. This method sends the message to the backend API and then triggers a SignalR notification to update the chat in real-time.

const newMessage = {
  chatId: this.selectedChatId,
  content: this.message,
  senderId: this.user.id,
  receiverId: this.selectedUser,
  sentDate: new Date(),
  isSeen: false
};

this.http.post<ChatModel>("https://localhost:7187/api/Message/SendMessage", newMessage)
  .subscribe(
    res => {
      res.sentDate = new Date().toLocaleString();
      this.messages.push(res);
      this.message = ""; 
      this.hub?.invoke("NotifyChatUpdates", this.user.id, this.selectedUser);
      this.selectedChatId = res.chatId;
    },
    err => {
      console.error(err);
    }
  );

API Endpoint: POST /api/Message/SendMessage
Expected Request Payload

{
  "chatId": "number",
  "content": "string",
  "senderId": "number",
  "receiverId": "number",
  "sentDate": "Date",
  "isSeen": false
}

Expected Response: ChatModel

Managing Chats
When a user selects a chat or starts a new one, the selectChat() method handles the logic of fetching and displaying the chat's messages.

this.http.get<Response<ChatModel[]>>("https://localhost:7187/api/Message/GetMessagesByChatId/" + chatId)
  .subscribe(res => {
    this.messages = res.data;
  }, err => {
    console.error(err);
  });

  API Endpoint: GET /api/Message/GetMessagesByChatId/{chatId}
Expected Response: ChatModel[]
Chat Status Management
The application keeps track of whether messages have been seen by the recipient using the ReceiveUpdatedMessages hub event and the UpdateLastMessageSeenStatusByChatId API.

this.http.get<Response<UserModel>>(
  `https://localhost:7187/api/Message/UpdateLastMessageSeenStatusByChatId/${this.selectedChatId}?receiverId=${this.user.id}`
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


API Endpoint: GET /api/Message/UpdateLastMessageSeenStatusByChatId/{chatId}?receiverId={userId}
Expected Response: UserModel
Conclusion
This guide provides an overview of how the frontend interacts with the backend and SignalR hubs. By understanding the purpose and structure of each component, frontend developers can extend or modify the UI as needed, ensuring proper communication with the backend.

Feel free to reach out if you need further clarification on any part of the system.
Please find the video for how to things goes on UI side;
[https://lifeboxtransfer.com/s/0b3e705a-ff98-4d43-b81c-802c4271e219](https://lifeboxtransfer.com/download/0b3e705a-ff98-4d43-b81c-802c4271e219)
