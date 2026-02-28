// ============================================================
// @fps/shared - Constantes globais do jogo
// Estas constantes são compartilhadas entre Client e Server
// para garantir determinismo na simulação.
// ============================================================

/** Taxa de tick do servidor (Hz) - quantas vezes por segundo o servidor atualiza o estado */
export const SERVER_TICK_RATE = 64;

/** Intervalo em ms entre cada tick do servidor */
export const SERVER_TICK_INTERVAL = 1000 / SERVER_TICK_RATE;

/** Taxa de envio de snapshots do servidor para os clientes (Hz) */
export const SERVER_SEND_RATE = 20;

/** Intervalo em ms entre cada envio de snapshot */
export const SERVER_SEND_INTERVAL = 1000 / SERVER_SEND_RATE;

/** Porta padrão do servidor */
export const SERVER_PORT = 3000;

/** Máximo de jogadores por sala */
export const MAX_PLAYERS_PER_ROOM = 8;

// ============================================================
// Constantes de Movimentação do Jogador
// ============================================================

/** Velocidade de caminhada (unidades/segundo) */
export const PLAYER_WALK_SPEED = 5.0;

/** Velocidade de corrida (unidades/segundo) */
export const PLAYER_RUN_SPEED = 8.5;

/** Velocidade agachado (unidades/segundo) */
export const PLAYER_CROUCH_SPEED = 2.5;

/** Força do pulo */
export const PLAYER_JUMP_FORCE = 7.0;

/** Gravidade do mundo */
export const WORLD_GRAVITY = -20.0;

/** Altura do jogador em pé */
export const PLAYER_HEIGHT = 1.8;

/** Altura do jogador agachado */
export const PLAYER_CROUCH_HEIGHT = 1.0;

/** Largura/Profundidade do hitbox do jogador */
export const PLAYER_WIDTH = 0.6;

// ============================================================
// Identificadores de Mensagens de Rede (Eventos)
// ============================================================
export const NET_EVENTS = {
  // Servidor -> Cliente
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  GAME_STATE: 'game_state',
  PLAYER_LIST: 'player_list',
  WELCOME: 'welcome',

  // Cliente -> Servidor
  PLAYER_INPUT: 'player_input',
  PLAYER_READY: 'player_ready',
} as const;
