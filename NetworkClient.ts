// ============================================================
// NetworkClient - Gerencia a conexão com o servidor via
// Geckos.io (WebRTC Data Channels). Recebe snapshots do
// servidor e envia inputs do jogador.
//
// O loop de rede é INDEPENDENTE do loop de renderização.
// Rede: ~20Hz (recebendo snapshots)
// Render: ~60fps+ (requestAnimationFrame)
// ============================================================

import geckos, { ClientChannel, Data } from '@geckos.io/client';
import { NET_EVENTS, SERVER_PORT } from '@shared/constants';
import {
  WelcomeMessage,
  PlayerJoinedMessage,
  PlayerLeftMessage,
  GameSnapshot,
  PlayerInput,
  PlayerState,
} from '@shared/types';

/** Callbacks que o jogo pode registrar para eventos de rede */
export interface NetworkCallbacks {
  onConnected: (localId: string, players: PlayerState[]) => void;
  onPlayerJoined: (player: PlayerState) => void;
  onPlayerLeft: (playerId: string) => void;
  onGameState: (snapshot: GameSnapshot) => void;
  onDisconnected: () => void;
}

export class NetworkClient {
  /** Canal de comunicação Geckos.io */
  private channel: ClientChannel;

  /** ID local do jogador (atribuído pelo servidor) */
  public localPlayerId: string | null = null;

  /** Está conectado? */
  public connected = false;

  /** Callbacks registrados */
  private callbacks: Partial<NetworkCallbacks> = {};

  /** Número sequencial do input (para reconciliação futura) */
  private inputSequence = 0;

  constructor() {
    // Cria o canal Geckos.io cliente
    // Conecta ao servidor na porta definida
    this.channel = geckos({
      url: `http://localhost`,
      port: SERVER_PORT,
    });

    console.log('[Network] Cliente Geckos.io criado');
  }

  /**
   * Registra os callbacks para eventos de rede.
   */
  registerCallbacks(callbacks: Partial<NetworkCallbacks>): void {
    this.callbacks = callbacks;
  }

  /**
   * Inicia a conexão com o servidor.
   * Retorna uma Promise que resolve quando conectado.
   */
  async connect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // Timeout de conexão
      const timeout = setTimeout(() => {
        reject(new Error('Timeout de conexão (10s)'));
      }, 10000);

      this.channel.onConnect((error) => {
        clearTimeout(timeout);

        if (error) {
          console.error('[Network] Erro ao conectar:', error);
          reject(error);
          return;
        }

        console.log('[Network] Conectado ao servidor via WebRTC!');
        this.connected = true;

        // Registra handlers de mensagens
        this.setupMessageHandlers();
        resolve();
      });

      this.channel.onDisconnect(() => {
        console.log('[Network] Desconectado do servidor');
        this.connected = false;
        this.localPlayerId = null;
        this.callbacks.onDisconnected?.();
      });
    });
  }

  /**
   * Configura os handlers para mensagens do servidor.
   */
  private setupMessageHandlers(): void {
    // ============================
    // WELCOME - Recebe ID e lista de jogadores
    // ============================
    this.channel.on(NET_EVENTS.WELCOME, (data: Data) => {
      const msg = data as unknown as WelcomeMessage;
      this.localPlayerId = msg.id;

      console.log(`[Network] Bem-vindo! Meu ID: ${msg.id}`);
      console.log(`[Network] Jogadores na sala: ${msg.players.length}`);

      this.callbacks.onConnected?.(msg.id, msg.players);
    });

    // ============================
    // PLAYER_JOINED - Novo jogador entrou
    // ============================
    this.channel.on(NET_EVENTS.PLAYER_JOINED, (data: Data) => {
      const msg = data as unknown as PlayerJoinedMessage;
      console.log(`[Network] Novo jogador: ${msg.player.name} (${msg.player.id})`);
      this.callbacks.onPlayerJoined?.(msg.player);
    });

    // ============================
    // PLAYER_LEFT - Jogador saiu
    // ============================
    this.channel.on(NET_EVENTS.PLAYER_LEFT, (data: Data) => {
      const msg = data as unknown as PlayerLeftMessage;
      console.log(`[Network] Jogador saiu: ${msg.id}`);
      this.callbacks.onPlayerLeft?.(msg.id);
    });

    // ============================
    // GAME_STATE - Snapshot do estado do jogo
    // ============================
    this.channel.on(NET_EVENTS.GAME_STATE, (data: Data) => {
      const snapshot = data as unknown as GameSnapshot;
      this.callbacks.onGameState?.(snapshot);
    });
  }

  /**
   * Envia input do jogador para o servidor.
   * Chamado a cada frame ou a uma taxa fixa.
   */
  sendInput(input: Omit<PlayerInput, 'sequence' | 'timestamp'>): void {
    if (!this.connected) return;

    this.inputSequence++;

    const fullInput: PlayerInput = {
      ...input,
      sequence: this.inputSequence,
      timestamp: Date.now(),
    };

    // Envia unreliable (UDP-like) para menor latência
    this.channel.emit(NET_EVENTS.PLAYER_INPUT, fullInput as unknown as Data);
  }

  /**
   * Retorna o número sequencial atual de inputs.
   */
  getInputSequence(): number {
    return this.inputSequence;
  }

  /**
   * Desconecta do servidor.
   */
  disconnect(): void {
    this.channel.close();
    this.connected = false;
    this.localPlayerId = null;
    console.log('[Network] Desconectado manualmente');
  }
}
