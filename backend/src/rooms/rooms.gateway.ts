import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomsService } from './rooms.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class RoomsGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly roomsService: RoomsService) {}

  @SubscribeMessage('room:create')
  async handleCreate(
    @MessageBody() data: { pseudo: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { room, player } = await this.roomsService.createRoom(data.pseudo);
    client.join(room.code);
    client.data.playerId = player.id;
    client.data.roomCode = room.code;
    const state = await this.roomsService.getRoomState(room.code);
    this.server.to(room.code).emit('room:updated', state);
    return { room, player };
  }

  @SubscribeMessage('room:state')
  async handleState(
    @MessageBody() data: { code: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.code);
    client.data.roomCode = data.code;
    return this.roomsService.getRoomState(data.code);
  }

  @SubscribeMessage('room:join')
  async handleJoin(
    @MessageBody() data: { code: string; pseudo: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { room, player } = await this.roomsService.joinRoom(data.code, data.pseudo);
    client.join(room.code);
    client.data.playerId = player.id;
    client.data.roomCode = room.code;
    this.server.to(room.code).emit('room:updated', await this.roomsService.getRoomState(room.code));
    return { room, player };
  }

  async handleDisconnect(client: Socket) {
    const { roomCode } = client.data;
    if (roomCode) {
      this.server.to(roomCode).emit('room:updated', await this.roomsService.getRoomState(roomCode));
    }
  }
}
