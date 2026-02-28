// ============================================================
// @fps/shared - Tipos compartilhados entre Client e Server
// Garantem que ambos os lados falem a mesma "língua".
// ============================================================

/** Representação 3D de um vetor (posição, velocidade, etc.) */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Representação de rotação (quaternion) */
export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

/** Estado de um jogador transmitido pela rede */
export interface PlayerState {
  /** ID único do jogador (atribuído pelo servidor) */
  id: string;
  /** Nome de display do jogador */
  name: string;
  /** Posição 3D no mundo */
  position: Vec3;
  /** Rotação (yaw/pitch para FPS) */
  rotation: { yaw: number; pitch: number };
  /** Vida atual (0-100) */
  health: number;
  /** Está agachado? */
  isCrouching: boolean;
  /** Está correndo? */
  isRunning: boolean;
  /** Está no chão? */
  isGrounded: boolean;
}

/** Input do jogador enviado ao servidor a cada tick */
export interface PlayerInput {
  /** Número sequencial do input (para reconciliação) */
  sequence: number;
  /** Timestamp do cliente quando o input foi gerado */
  timestamp: number;
  /** Teclas pressionadas */
  keys: {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    jump: boolean;
    crouch: boolean;
    sprint: boolean;
  };
  /** Rotação da câmera no momento do input */
  rotation: { yaw: number; pitch: number };
  /** Delta time do frame do cliente */
  deltaTime: number;
}

/** Snapshot completo do estado do jogo (Server -> Client) */
export interface GameSnapshot {
  /** Número do tick do servidor */
  tick: number;
  /** Timestamp do servidor */
  timestamp: number;
  /** Estado de todos os jogadores */
  players: PlayerState[];
}

/** Mensagem de boas-vindas ao conectar */
export interface WelcomeMessage {
  /** ID atribuído ao jogador */
  id: string;
  /** Tick atual do servidor */
  serverTick: number;
  /** Lista de jogadores já conectados */
  players: PlayerState[];
}

/** Mensagem quando um novo jogador entra */
export interface PlayerJoinedMessage {
  /** Estado do novo jogador */
  player: PlayerState;
}

/** Mensagem quando um jogador sai */
export interface PlayerLeftMessage {
  /** ID do jogador que saiu */
  id: string;
}
