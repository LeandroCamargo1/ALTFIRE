// ============================================================
// NetworkManager (Server) - Gerencia toda a comunicação via
// Geckos.io (WebRTC/UDP). Lida com conexões, desconexões e
// broadcast de eventos para todos os clientes.
// ============================================================

import geckos, { GeckosServer, ServerChannel, Data } from '@geckos.io/server';
import http from 'http';
import { ServerPlayerManager } from '../entities/ServerPlayerManager.js';
import { NET_EVENTS, SERVER_SEND_INTERVAL } from '../../shared/constants.js';
import {
  WelcomeMessage,
  PlayerJoinedMessage,
  PlayerLeftMessage,
  GameSnapshot,
  PlayerInput,
} from '../../shared/types.js';

export class NetworkManager {
  /** Instância do servidor Geckos.io */
  private io: GeckosServer;

  /** Gerenciador de jogadores */
  private playerManager: ServerPlayerManager;

  /** Tick atual do servidor */
  private serverTick = 0;

  /** Interval para envio de snapshots */
  private sendInterval: ReturnType<typeof setInterval> | null = null;

  constructor(server: http.Server, playerManager: ServerPlayerManager) {
    this.playerManager = playerManager;

    // Inicializa Geckos.io usando o servidor HTTP existente
    // Geckos usa WebRTC Data Channels para comunicação "UDP-like" no browser
    this.io = geckos({
      // Configuração de ICE para conexão peer-to-peer
      iceServers: [],
    });

    // Adiciona o Geckos ao servidor HTTP
    this.io.addServer(server);

    console.log('[Network] Geckos.io inicializado e vinculado ao servidor HTTP');
  }

  /**
   * Inicia o listener de conexões e o loop de broadcast.
   */
  start(): void {
    // Escuta novas conexões WebRTC
    this.io.onConnection((channel: ServerChannel) => {
      this.handleConnection(channel);
    });

    // Inicia o loop de envio de snapshots
    this.startSnapshotLoop();

    console.log('[Network] Escutando conexões...');
  }

  /**
   * Lida com uma nova conexão de jogador.
   */
  private handleConnection(channel: ServerChannel): void {
    const playerId = channel.id!;
    const playerName = `Player_${playerId.substring(0, 6)}`;

    console.log(`[Network] Nova conexão: ${playerName} (${playerId})`);

    // Cria o jogador no gerenciador
    const newPlayer = this.playerManager.createPlayer(playerId, playerName);

    // Envia mensagem de boas-vindas com ID e lista de jogadores existentes
    const welcomeMsg: WelcomeMessage = {
      id: playerId,
      serverTick: this.serverTick,
      players: this.playerManager.getAllPlayers(),
    };
    channel.emit(NET_EVENTS.WELCOME, welcomeMsg as unknown as Data, { reliable: true });

    // Notifica todos os OUTROS jogadores sobre o novo jogador
    const joinMsg: PlayerJoinedMessage = { player: newPlayer };
    channel.broadcast.emit(NET_EVENTS.PLAYER_JOINED, joinMsg as unknown as Data, { reliable: true });

    // Escuta inputs do jogador (será expandido na Fase 2)
    channel.on(NET_EVENTS.PLAYER_INPUT, (data: Data) => {
      this.handlePlayerInput(playerId, data as unknown as PlayerInput);
    });

    // Lida com desconexão
    channel.onDisconnect(() => {
      this.handleDisconnection(playerId);
    });

    console.log(`[Network] Total de jogadores: ${this.playerManager.getPlayerCount()}`);
  }

  /**
   * Lida com desconexão de um jogador.
   */
  private handleDisconnection(playerId: string): void {
    const player = this.playerManager.getPlayer(playerId);
    const playerName = player?.name ?? 'Desconhecido';

    console.log(`[Network] Desconexão: ${playerName} (${playerId})`);

    // Remove do gerenciador
    this.playerManager.removePlayer(playerId);

    // Notifica todos os jogadores restantes
    const leftMsg: PlayerLeftMessage = { id: playerId };
    this.io.emit(NET_EVENTS.PLAYER_LEFT, leftMsg as unknown as Data, { reliable: true });

    console.log(`[Network] Total de jogadores: ${this.playerManager.getPlayerCount()}`);
  }

  /**
   * Processa input recebido de um jogador.
   * Na Fase 1, apenas atualiza rotação. Movimentação completa na Fase 2.
   */
  private handlePlayerInput(playerId: string, input: PlayerInput): void {
    // Atualiza a rotação do jogador com base no input
    if (input.rotation) {
      this.playerManager.updatePlayerRotation(playerId, input.rotation);
    }
  }

  /**
   * Inicia o loop de envio de snapshots do estado do jogo.
   * Roda na SERVER_SEND_RATE (20Hz por padrão).
   */
  private startSnapshotLoop(): void {
    this.sendInterval = setInterval(() => {
      this.broadcastGameState();
    }, SERVER_SEND_INTERVAL);

    console.log(`[Network] Snapshot loop iniciado (${1000 / SERVER_SEND_INTERVAL}Hz)`);
  }

  /**
   * Envia o estado completo do jogo para todos os clientes.
   */
  private broadcastGameState(): void {
    this.serverTick++;

    const snapshot: GameSnapshot = {
      tick: this.serverTick,
      timestamp: Date.now(),
      players: this.playerManager.getAllPlayers(),
    };

    // Envia unreliable (UDP-like) para performance máxima
    this.io.emit(NET_EVENTS.GAME_STATE, snapshot as unknown as Data);
  }

  /**
   * Incrementa o tick do servidor (chamado pelo game loop).
   */
  incrementTick(): void {
    this.serverTick++;
  }

  /**
   * Retorna o tick atual.
   */
  getTick(): number {
    return this.serverTick;
  }

  /**
   * Para o loop de broadcast e limpa recursos.
   */
  stop(): void {
    if (this.sendInterval) {
      clearInterval(this.sendInterval);
      this.sendInterval = null;
    }
    console.log('[Network] Servidor de rede encerrado.');
  }
}
