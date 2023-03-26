from channels.generic.websocket import WebsocketConsumer
from asgiref.sync import async_to_sync
import json

class MessengerConsumer(WebsocketConsumer):
    def connect(self):
        self.group_name = "allusers"
        async_to_sync(self.channel_layer.group_add)(
            self.group_name, self.channel_name
        )
        print("Connected to client")
        self.accept()

    def receive(self, text_data=None, bytes_data=None):
        text_data_json = json.loads(text_data)
        if(text_data_json["message"] != 'ping'):
            async_to_sync(self.channel_layer.group_send)(
                self.group_name, {
                    "type": "chat_update",
                    "message": text_data_json,
                }
            )
    
    def disconnect(self, code):
        print("Client disconnected")
        async_to_sync(self.channel_layer.group_discard)(
            self.group_name, self.channel_name
        )

    def chat_update(self, event):
        message = event["message"]
        self.send(
            text_data=json.dumps(
                {
                    "message": message,
                }
            )
        )